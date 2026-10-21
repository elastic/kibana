/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Kibana's dashboard grid, as the dashboard primitive lays it out.

/** A panel's place on Kibana's grid, in grid units: 48 columns, rows of `DASHBOARD_GRID.row` pixels. */
export interface GridBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Kibana's grid: 48 columns; a row is 20 pixels plus the 8-pixel gutter, which panels leave between them. */
export const DASHBOARD_GRID = { columns: 48, row: 28, gutter: 8 } as const;

/** A panel's header, and the padding inside it. */
export const PANEL_CHROME = { header: 28, padding: 8 } as const;

/** One column's panel heights, between these. */
export const STACK_HEIGHT = { min: 160, max: 420 } as const;

/** A panel's box in pixels, on a grid `width` pixels wide. */
export const panelBox = ({ x, y, w, h }: GridBox, width: number) => {
  const column = (width + DASHBOARD_GRID.gutter) / DASHBOARD_GRID.columns;
  return {
    left: Math.round(x * column),
    top: y * DASHBOARD_GRID.row,
    width: Math.round(w * column - DASHBOARD_GRID.gutter),
    height: h * DASHBOARD_GRID.row - DASHBOARD_GRID.gutter,
  };
};

/** A panel's height in one column. */
export const stackedHeight = ({ h }: GridBox): number =>
  Math.min(
    STACK_HEIGHT.max,
    Math.max(STACK_HEIGHT.min, h * DASHBOARD_GRID.row - DASHBOARD_GRID.gutter)
  );

/** The grid's height in pixels. */
export const gridHeight = (grids: readonly GridBox[]): number =>
  Math.max(0, ...grids.map(({ y, h }) => (y + h) * DASHBOARD_GRID.row - DASHBOARD_GRID.gutter));

/** Panels in reading order: top to bottom, then left to right. */
export const readingOrder = <T extends { grid: GridBox }>(panels: readonly T[]): T[] =>
  [...panels].sort((a, b) => a.grid.y - b.grid.y || a.grid.x - b.grid.x);
