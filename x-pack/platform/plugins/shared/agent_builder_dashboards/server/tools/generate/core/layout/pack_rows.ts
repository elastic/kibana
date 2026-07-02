/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';

/**
 * Pure rows-based layout packer.
 *
 * Turns `add_panels` `rows` (rows of panel items, top to bottom) into concrete
 * grids: position = structure, so panel items never carry `grid` themselves.
 * Deterministic, no ids, no I/O — property-tested in `pack_rows.test.ts`.
 */

type PanelGrid = AttachmentPanel['grid'];

/** Total dashboard grid columns. */
export const GRID_COLUMN_COUNT = 48;

/** Default row-item height for chart types without a size class. */
export const DEFAULT_ROW_ITEM_HEIGHT = 10;

/**
 * Default panel heights per chart type, transcribed from the grid-layout
 * guidance prose (see `skills/generation_guidance/design/grid_layout.ts`).
 */
export const ROW_ITEM_HEIGHT_BY_CHART_TYPE: Readonly<Record<string, number>> = {
  metric: 5,
  gauge: 10,
  xy: 10,
  heatmap: 12,
  tagcloud: 9,
  pie: 11,
  treemap: 11,
  waffle: 11,
  mosaic: 11,
  datatable: 14,
  region_map: 12,
  markdown: 6,
};

/**
 * The minimal structural view of an `add_panels` row item the packer needs to
 * size a panel; the parsed row-item schema shapes are assignable to it.
 */
export interface PackableRowItem {
  source: 'config' | 'request';
  /** Model-facing panel type discriminant (`'vis'`, `'markdown'`, ...). */
  type: string;
  /** Preferred chart type on `source: 'request'` vis items. */
  chartType?: string;
  /** By-value config on `source: 'config'` items. */
  config?: Record<string, unknown>;
}

/**
 * Height (size class) for one row item: markdown uses the markdown class;
 * request-source vis items use their optional `chartType`; config-source vis
 * items use the chart type when cheaply readable from the Lens API config
 * (top-level `type`); anything else falls back to the default.
 */
export const getRowItemHeight = (item: PackableRowItem): number => {
  if (item.type === 'markdown') {
    return ROW_ITEM_HEIGHT_BY_CHART_TYPE.markdown;
  }

  const chartType =
    item.source === 'request'
      ? item.chartType
      : typeof item.config?.type === 'string'
      ? item.config.type
      : undefined;

  if (chartType === undefined) {
    return DEFAULT_ROW_ITEM_HEIGHT;
  }

  return ROW_ITEM_HEIGHT_BY_CHART_TYPE[chartType] ?? DEFAULT_ROW_ITEM_HEIGHT;
};

/**
 * Packs rows of panel items into grids, appending below `startY`:
 * - widths per row of `n` items are `floor(48 / n)` with the remainder spread
 *   one column at a time from the left, so they always sum to exactly 48
 *   (integers, no gaps);
 * - `x` accumulates left to right;
 * - row height is the max of its members' size classes;
 * - `y` is `startY` plus the cumulative heights of the previous rows.
 *
 * Returns one grid per item, in the same rows-of-items shape as the input.
 */
export const packRows = (
  rows: ReadonlyArray<readonly PackableRowItem[]>,
  startY: number
): PanelGrid[][] => {
  let y = startY;

  return rows.map((row) => {
    const rowHeight = row.reduce(
      (maxHeight, item) => Math.max(maxHeight, getRowItemHeight(item)),
      1
    );
    const baseWidth = Math.floor(GRID_COLUMN_COUNT / row.length);
    const remainder = GRID_COLUMN_COUNT % row.length;

    let x = 0;
    const rowGrids = row.map((item, itemIndex) => {
      const w = baseWidth + (itemIndex < remainder ? 1 : 0);
      const grid = { x, y, w, h: rowHeight };
      x += w;
      return grid;
    });

    y += rowHeight;
    return rowGrids;
  });
};
