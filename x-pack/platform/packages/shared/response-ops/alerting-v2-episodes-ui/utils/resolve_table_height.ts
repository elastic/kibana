/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CSSProperties } from 'react';

export const TABLE_ROW_LINE_HEIGHT_PX = 24;
export const GRID_TOOLBAR_AND_HEADER_HEIGHT_PX = 88;
export const GRID_ROW_VERTICAL_PADDING_PX = 24;

export interface ResolveTableHeightOptions {
  height: CSSProperties['height'];
  minHeight?: number;
  maxHeight?: number;
  rowHeightLines: number;
  rowCount: number;
  defaultRowHeightLines: number;
}

export const resolveTableHeight = ({
  height,
  minHeight,
  maxHeight,
  rowHeightLines,
  rowCount,
  defaultRowHeightLines,
}: ResolveTableHeightOptions): CSSProperties['height'] => {
  if (maxHeight == null) {
    return height;
  }

  const lines = rowHeightLines > 0 ? rowHeightLines : defaultRowHeightLines;
  const rowPx = lines * TABLE_ROW_LINE_HEIGHT_PX + GRID_ROW_VERTICAL_PADDING_PX;
  const contentPx = GRID_TOOLBAR_AND_HEADER_HEIGHT_PX + rowCount * rowPx;

  return Math.min(Math.max(contentPx, minHeight ?? 0), maxHeight);
};
