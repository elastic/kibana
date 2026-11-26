/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Logo pieces the Elastic morph breaks into, and the grid cell each one lands on. */
export const MORPH_PIECES = [
  { color: '#0B64DD', center: [25.49, 16.77], cell: 11 },
  { color: '#9ADC30', center: [23.88, 24.86], cell: 10 },
  { color: '#1BA9F5', center: [6.43, 15.25], cell: 4 },
  { color: '#F04E98', center: [8.14, 7.16], cell: 5 },
  { color: '#02BCB7', center: [13.02, 22.91], cell: 9 },
  { color: '#FEC514', center: [18.99, 9.26], cell: 6 },
] as const;

export const MORPH_GRID_SIZE = 4;
export const MORPH_DOT_PITCH = 10;
export const MORPH_DOT_RADIUS = 2.5;
export const MORPH_DOT_COUNT = MORPH_GRID_SIZE * MORPH_GRID_SIZE;
/** The four corner cells (top left and right, bottom left and right) have no dot. */
export const MORPH_CORNERS = new Set([0, 3, 12, 15]);
/** The grid is drawn in a 32px box, then scaled to the avatar. */
export const MORPH_RENDER_SIZE = 32;
export const MORPH_TWINKLE_DENSITY = 2;

/** Fixed blink order for the generic grid, so the twinkle is the same every time. */
export const GENERIC_DOT_ORDER = [7, 2, 10, 4, 0, 9, 5, 11, 1, 8, 3, 6, 13, 15, 12, 14];

export interface MorphDot {
  cell: number;
  cx: number;
  cy: number;
  isLeaf: boolean;
  vars: Record<string, string>;
}

export const MORPH_DOTS: MorphDot[] = Array.from({ length: MORPH_DOT_COUNT }, (_, cell) => {
  const col = cell % MORPH_GRID_SIZE;
  const row = Math.floor(cell / MORPH_GRID_SIZE);
  const cx = 1 + MORPH_DOT_PITCH * col;
  const cy = 1 + MORPH_DOT_PITCH * row;
  const pieceIndex = MORPH_PIECES.findIndex((piece) => piece.cell === cell);
  if (pieceIndex >= 0) {
    const piece = MORPH_PIECES[pieceIndex];
    return {
      cell,
      cx,
      cy,
      isLeaf: true,
      vars: {
        '--pc': piece.color,
        '--pk': String(pieceIndex),
        '--dx': `${(piece.center[0] - cx).toFixed(2)}px`,
        '--dy': `${(piece.center[1] - cy).toFixed(2)}px`,
      },
    };
  }
  const dist = Math.hypot(col * 20 - 30, row * 20 - 30);
  return {
    cell,
    cx,
    cy,
    isLeaf: false,
    vars: {
      '--din': `calc(var(--speed-slow) + ${dist.toFixed(2)} * var(--speed-extra-fast) / 20)`,
      '--dout': `calc(${(44 - dist).toFixed(2)} * var(--speed-extra-fast) / 22)`,
    },
  };
}).filter((dot) => !MORPH_CORNERS.has(dot.cell));
