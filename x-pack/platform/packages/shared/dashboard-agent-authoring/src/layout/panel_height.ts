/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DASHBOARD_GRID_MARGIN_SIZE,
  DASHBOARD_GRID_ROW_HEIGHT,
} from '@kbn/as-code-dashboard-schema';

/** What the title bar takes from the panel; a panel without a title has no bar. */
const PANEL_TITLE_BAR_PX = 40;

const MIN_GRID_ROWS = 4;
const MAX_GRID_ROWS = 80;

interface PanelFrame {
  /** Whether the panel shows a title bar above its content. */
  hasTitleBar: boolean;
  /** Whether the dashboard separates panels with a margin. */
  useMargins: boolean;
}

/**
 * The grid rows a panel needs to show content of `contentPx` pixels. `n` rows are
 * `n * rowHeight + (n - 1) * gutter` pixels tall, so the content, plus the title bar when there is
 * one, fits in the smallest `n` that reaches it.
 */
export const getGridRowsForHeight = (
  contentPx: number,
  { hasTitleBar, useMargins }: PanelFrame
): number => {
  const gutterPx = useMargins ? DASHBOARD_GRID_MARGIN_SIZE : 0;
  const titleBarPx = hasTitleBar ? PANEL_TITLE_BAR_PX : 0;
  const rows = Math.ceil(
    (contentPx + titleBarPx + gutterPx) / (DASHBOARD_GRID_ROW_HEIGHT + gutterPx)
  );
  return Math.min(Math.max(rows, MIN_GRID_ROWS), MAX_GRID_ROWS);
};
