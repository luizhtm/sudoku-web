const MODE = { DEFINITIVE: 'definitive', PENCIL: 'pencil' };
const EMPTY = 0;

const DIFFICULTY = {
  easy:   { name: 'Facil', min: 40, max: 45 },
  medium: { name: 'Medio', min: 30, max: 35 },
  hard:   { name: 'Dificil', min: 22, max: 27 }
};

const state = {
  board: [],
  solution: [],
  isGiven: [],
  pencilMarks: [],
  selectedRow: -1,
  selectedCol: -1,
  mode: MODE.DEFINITIVE,
  difficulty: 'easy',
  timerStarted: false,
  timerStartTime: 0,
  timerElapsed: 0,
  timerInterval: null,
  mistakeCount: 0,
  isComplete: false
};

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function isValid(board, row, col, num) {
  for (let c = 0; c < 9; c++) {
    if (board[row][c] === num) return false;
  }
  for (let r = 0; r < 9; r++) {
    if (board[r][col] === num) return false;
  }
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++) {
    for (let c = bc; c < bc + 3; c++) {
      if (board[r][c] === num) return false;
    }
  }
  return true;
}

function solve(board) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === EMPTY) {
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const num of nums) {
          if (isValid(board, r, c, num)) {
            board[r][c] = num;
            if (solve(board)) return true;
            board[r][c] = EMPTY;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function generateCompleteBoard() {
  const board = Array.from({ length: 9 }, () => Array(9).fill(EMPTY));
  solve(board);
  return board;
}

function countSolutions(board, limit) {
  let count = 0;
  function helper() {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === EMPTY) {
          for (let num = 1; num <= 9; num++) {
            if (isValid(board, r, c, num)) {
              board[r][c] = num;
              helper();
              board[r][c] = EMPTY;
              if (count >= limit) return;
            }
          }
          return;
        }
      }
    }
    count++;
  }
  helper();
  return count;
}

function createPuzzle(solution, difficulty) {
  const { min, max } = DIFFICULTY[difficulty];
  const targetClues = min + Math.floor(Math.random() * (max - min + 1));
  const cellsToRemove = 81 - targetClues;

  const puzzle = solution.map(row => [...row]);
  const isGiven = solution.map(row => row.map(() => true));

  const positions = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      positions.push([r, c]);
    }
  }
  shuffle(positions);

  let removed = 0;
  for (const [r, c] of positions) {
    if (removed >= cellsToRemove) break;
    const backup = puzzle[r][c];
    puzzle[r][c] = EMPTY;
    isGiven[r][c] = false;
    const copy = puzzle.map(row => [...row]);
    if (countSolutions(copy, 2) !== 1) {
      puzzle[r][c] = backup;
      isGiven[r][c] = true;
    } else {
      removed++;
    }
  }

  return { puzzle, isGiven };
}

function initGame(difficulty) {
  stopTimer();

  const solution = generateCompleteBoard();
  const { puzzle, isGiven } = createPuzzle(solution, difficulty);

  state.board = puzzle.map(row => [...row]);
  state.solution = solution;
  state.isGiven = isGiven;
  state.pencilMarks = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => new Set())
  );
  state.selectedRow = -1;
  state.selectedCol = -1;
  state.difficulty = difficulty;
  state.timerStarted = false;
  state.timerElapsed = 0;
  state.mistakeCount = 0;
  state.isComplete = false;

  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.diff === difficulty);
  });

  updateTimerDisplay();
  updateMistakeCounter();
  updateNumpad();
  render();
}

function render() {
  const boardEl = document.getElementById('board');
  boardEl.innerHTML = '';

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;

      if (state.isGiven[r][c]) cell.classList.add('given');
      if (c === 2 || c === 5) cell.classList.add('border-right');
      if (r === 2 || r === 5) cell.classList.add('border-bottom');

      const valueSpan = document.createElement('span');
      valueSpan.className = 'cell-value';
      cell.appendChild(valueSpan);

      const pencilContainer = document.createElement('div');
      pencilContainer.className = 'pencil-container';
      for (let p = 1; p <= 9; p++) {
        const pn = document.createElement('span');
        pn.className = 'pencil-num';
        pn.dataset.pnum = p;
        pencilContainer.appendChild(pn);
      }
      cell.appendChild(pencilContainer);

      cell.addEventListener('click', () => onCellClick(r, c));
      boardEl.appendChild(cell);
    }
  }

  updateCellDisplay();
}

function updateCellDisplay() {
  const cells = document.querySelectorAll('.cell');
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const idx = r * 9 + c;
      const cell = cells[idx];
      const valueSpan = cell.querySelector('.cell-value');
      const pencilSpans = cell.querySelectorAll('.pencil-num');
      const pencilContainer = cell.querySelector('.pencil-container');

      const val = state.board[r][c];
      const marks = state.pencilMarks[r][c];

      cell.classList.remove('error', 'completed-digit');

      if (val !== EMPTY) {
        valueSpan.textContent = val;
        pencilContainer.style.display = 'none';
        if (!state.isGiven[r][c]) {
          if (val !== state.solution[r][c]) {
            cell.classList.add('error');
          } else {
            cell.classList.add('completed-digit');
          }
        }
      } else {
        valueSpan.textContent = '';
        pencilContainer.style.display = 'grid';
        for (let p = 1; p <= 9; p++) {
          pencilSpans[p - 1].textContent = marks.has(p) ? p : '';
        }
      }
    }
  }
  updateSelection();
}

function updateSelection() {
  const cells = document.querySelectorAll('.cell');
  cells.forEach(c => c.classList.remove('selected', 'highlighted', 'related'));

  const { selectedRow, selectedCol } = state;
  if (selectedRow < 0 || selectedCol < 0) return;

  const selectedVal = state.board[selectedRow][selectedCol];

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const idx = r * 9 + c;
      const cell = cells[idx];

      if (r === selectedRow && c === selectedCol) {
        cell.classList.add('selected');
      } else if (
        r === selectedRow || c === selectedCol ||
        (Math.floor(r / 3) === Math.floor(selectedRow / 3) &&
         Math.floor(c / 3) === Math.floor(selectedCol / 3))
      ) {
        cell.classList.add('related');
      } else if (selectedVal !== EMPTY && state.board[r][c] === selectedVal) {
        cell.classList.add('highlighted');
      }
    }
  }
}

function onCellClick(row, col) {
  if (state.isComplete) return;

  state.selectedRow = row;
  state.selectedCol = col;
  updateSelection();
}

function placeNumber(num) {
  if (state.isComplete) return;
  if (state.selectedRow < 0 || state.selectedCol < 0) return;
  if (state.isGiven[state.selectedRow][state.selectedCol]) return;
  if (state.mode !== MODE.PENCIL && isNumberComplete(num)) return;

  if (!state.timerStarted) startTimer();

  if (state.mode === MODE.PENCIL) {
    const marks = state.pencilMarks[state.selectedRow][state.selectedCol];
    if (marks.has(num)) marks.delete(num);
    else marks.add(num);
  } else {
    state.board[state.selectedRow][state.selectedCol] = num;
    state.pencilMarks[state.selectedRow][state.selectedCol] = new Set();
    if (num !== state.solution[state.selectedRow][state.selectedCol]) {
      state.mistakeCount++;
      if (state.timerStarted) {
        state.timerStartTime -= 10000;
      } else {
        state.timerElapsed += 10000;
      }
    } else {
      removeRelatedPencilMarks(state.selectedRow, state.selectedCol, num);
    }
    updateMistakeCounter();
  }

  updateCellDisplay();
  updateNumpad();
  if (state.mode !== MODE.PENCIL) {
    animateUnitCompletion(state.selectedRow, state.selectedCol);
  }
  checkWin();
}

function clearCell() {
  if (state.isComplete) return;
  if (state.selectedRow < 0 || state.selectedCol < 0) return;
  if (state.isGiven[state.selectedRow][state.selectedCol]) return;

  const val = state.board[state.selectedRow][state.selectedCol];
  const hasMarks = state.pencilMarks[state.selectedRow][state.selectedCol].size > 0;

  if (val === EMPTY && !hasMarks) return;

  if (val !== EMPTY) {
    if (!state.timerStarted) startTimer();
  }

  state.board[state.selectedRow][state.selectedCol] = EMPTY;
  state.pencilMarks[state.selectedRow][state.selectedCol] = new Set();

  updateNumpad();
  updateCellDisplay();
}

function isNumberComplete(num) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (state.solution[r][c] === num && state.board[r][c] !== num) {
        return false;
      }
    }
  }
  return true;
}

function updateNumpad() {
  document.querySelectorAll('.num-btn').forEach(btn => {
    const num = parseInt(btn.dataset.num);
    if (isNumberComplete(num)) {
      btn.classList.add('checked');
      btn.textContent = '✓';
    } else {
      btn.classList.remove('checked');
      btn.textContent = num;
    }
  });
}

function animateUnitCompletion(row, col) {
  if (state.board[row][col] !== state.solution[row][col]) return;

  const cellEls = document.querySelectorAll('.cell');
  const units = [];

  let rowDone = true;
  for (let c = 0; c < 9; c++) {
    if (state.board[row][c] !== state.solution[row][c]) { rowDone = false; break; }
  }
  if (rowDone) {
    const cells = [];
    for (let c = 0; c < 9; c++) cells.push([row, c]);
    units.push(cells);
  }

  let colDone = true;
  for (let r = 0; r < 9; r++) {
    if (state.board[r][col] !== state.solution[r][col]) { colDone = false; break; }
  }
  if (colDone) {
    const cells = [];
    for (let r = 0; r < 9; r++) cells.push([r, col]);
    units.push(cells);
  }

  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  let boxDone = true;
  for (let r = br; r < br + 3; r++) {
    for (let c = bc; c < bc + 3; c++) {
      if (state.board[r][c] !== state.solution[r][c]) { boxDone = false; break; }
    }
    if (!boxDone) break;
  }
  if (boxDone) {
    const cells = [];
    for (let r = br; r < br + 3; r++)
      for (let c = bc; c < bc + 3; c++)
        cells.push([r, c]);
    units.push(cells);
  }

  units.forEach(unit => {
    unit.forEach(([r, c], i) => {
      const cell = cellEls[r * 9 + c];
      cell.style.animationDelay = `${i * 70}ms`;
      cell.classList.add('unit-complete');
      cell.addEventListener('animationend', () => {
        cell.style.animationDelay = '';
        cell.classList.remove('unit-complete');
      }, { once: true });
    });
  });
}

function removeRelatedPencilMarks(row, col, num) {
  for (let c = 0; c < 9; c++) {
    state.pencilMarks[row][c].delete(num);
  }
  for (let r = 0; r < 9; r++) {
    state.pencilMarks[r][col].delete(num);
  }
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++) {
    for (let c = bc; c < bc + 3; c++) {
      state.pencilMarks[r][c].delete(num);
    }
  }
}

function checkWin() {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (state.board[r][c] !== state.solution[r][c]) return;
    }
  }

  state.isComplete = true;
  stopTimer();
  showCompletion();
}

function startTimer() {
  if (state.timerStarted) return;
  state.timerStarted = true;
  state.timerStartTime = Date.now() - state.timerElapsed;
  state.timerInterval = setInterval(updateTimerDisplay, 100);
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function updateTimerDisplay() {
  if (state.timerStarted) {
    state.timerElapsed = Date.now() - state.timerStartTime;
  }
  const totalSec = Math.floor(state.timerElapsed / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  document.getElementById('timer').textContent =
    `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function updateMistakeCounter() {
  const el = document.getElementById('mistake-counter');
  if (el) {
    el.textContent = `Erros: ${state.mistakeCount}`;
  }
}

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function getHighScores() {
  try {
    const data = localStorage.getItem('sudoku-highscores');
    return data ? JSON.parse(data) : { easy: [], medium: [], hard: [] };
  } catch {
    return { easy: [], medium: [], hard: [] };
  }
}

function saveHighScores(scores) {
  localStorage.setItem('sudoku-highscores', JSON.stringify(scores));
}

function registerScore() {
  const scores = getHighScores();

  scores[state.difficulty].push({
    time: state.timerElapsed,
    date: new Date().toISOString()
  });

  scores[state.difficulty].sort((a, b) => a.time - b.time);
  scores[state.difficulty] = scores[state.difficulty].slice(0, 5);
  saveHighScores(scores);
}

function showCompletion() {
  const overlay = document.getElementById('modal-overlay');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');

  title.textContent = 'Parabens!';
  registerScore();

  body.innerHTML = `
    <div id="completion-overlay">
      <h2>Puzzle Completo!</h2>
      <div class="big-time">${formatTime(state.timerElapsed)}</div>
      <div>Erros: ${state.mistakeCount}</div>
      <button id="completion-btn">Novo Jogo</button>
    </div>
  `;

  document.getElementById('completion-btn').addEventListener('click', function handler() {
    closeModal();
    initGame(state.difficulty);
  });

  overlay.classList.remove('hidden');
}

function showHighScores() {
  const overlay = document.getElementById('modal-overlay');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');

  title.textContent = 'High Scores';
  const scores = getHighScores();

  const diffs = [
    { key: 'easy', label: 'Facil' },
    { key: 'medium', label: 'Medio' },
    { key: 'hard', label: 'Dificil' }
  ];

  let html = '';
  for (const { key, label } of diffs) {
    html += `<h3 style="margin:16px 0 8px;font-size:16px;">${label}</h3>`;
    const list = scores[key];
    if (list.length === 0) {
      html += '<div class="highscore-empty">Nenhum score registrado</div>';
    } else {
      html += '<ul class="highscore-list">';
      list.forEach((entry, i) => {
        const rank = i + 1;
        const medal = rank === 1 ? '#1' : rank === 2 ? '#2' : rank === 3 ? '#3' : `#${rank}`;
        html += `
          <li class="highscore-item">
            <span class="highscore-rank">${medal}</span>
            <span class="highscore-time">${formatTime(entry.time)}</span>
          </li>
        `;
      });
      html += '</ul>';
    }
  }

  body.innerHTML = html;
  overlay.classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

function setupEventListeners() {
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.mode = btn.dataset.mode;
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  document.querySelectorAll('.num-btn').forEach(btn => {
    btn.addEventListener('click', () => placeNumber(parseInt(btn.dataset.num)));
  });

  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => initGame(btn.dataset.diff));
  });

  document.getElementById('new-game-btn').addEventListener('click', () => initGame(state.difficulty));
  document.getElementById('restart-btn').addEventListener('click', () => initGame(state.difficulty));
  document.getElementById('highscores-btn').addEventListener('click', showHighScores);
  document.getElementById('modal-close').addEventListener('click', closeModal);

  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key >= '1' && e.key <= '9') {
      placeNumber(parseInt(e.key));
      return;
    }

    switch (e.key) {
      case 'd': case 'D': state.mode = MODE.DEFINITIVE; break;
      case 'r': case 'R': state.mode = MODE.PENCIL; break;
      case 'Backspace': case 'Delete': clearCell(); return;
    }

    document.querySelectorAll('.mode-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === state.mode);
    });

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const { selectedRow, selectedCol } = state;
      if (selectedRow < 0 || selectedCol < 0) {
        state.selectedRow = 0;
        state.selectedCol = 0;
        updateSelection();
        return;
      }
      let nr = selectedRow;
      let nc = selectedCol;
      if (e.key === 'ArrowUp') nr = Math.max(0, selectedRow - 1);
      if (e.key === 'ArrowDown') nr = Math.min(8, selectedRow + 1);
      if (e.key === 'ArrowLeft') nc = Math.max(0, selectedCol - 1);
      if (e.key === 'ArrowRight') nc = Math.min(8, selectedCol + 1);
      if (nr !== selectedRow || nc !== selectedCol) {
        state.selectedRow = nr;
        state.selectedCol = nc;
        updateSelection();
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  initGame('easy');
});
