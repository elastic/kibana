/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Row height and gutter of the dashboard grid, in pixels (`DASHBOARD_GRID_HEIGHT`, `DASHBOARD_MARGIN_SIZE`). */
const GRID_ROW_HEIGHT_PX = 20;
const GRID_GUTTER_PX = 8;

/** What the title bar takes from the panel; a panel without a title has no bar. */
const PANEL_TITLE_BAR_PX = 40;

const MIN_GRID_ROWS = 4;
const MAX_GRID_ROWS = 80;

/**
 * The grid rows a panel needs to show content of `contentPx` pixels. `n` rows are
 * `n * rowHeight + (n - 1) * gutter` pixels tall, so the content, plus the title bar when the panel
 * has a title, fits in the smallest `n` that reaches it.
 */
export const getGridRowsForHeight = (contentPx: number, hasTitle: boolean): number => {
  const titleBarPx = hasTitle ? PANEL_TITLE_BAR_PX : 0;
  const rows = Math.ceil(
    (contentPx + titleBarPx + GRID_GUTTER_PX) / (GRID_ROW_HEIGHT_PX + GRID_GUTTER_PX)
  );
  return Math.min(Math.max(rows, MIN_GRID_ROWS), MAX_GRID_ROWS);
};
