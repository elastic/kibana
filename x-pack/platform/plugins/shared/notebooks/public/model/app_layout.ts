/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { i18n } from '@kbn/i18n';
import type { GridLayoutData } from '@kbn/grid-layout';
import { DEFAULT_GRID_COLUMNS } from '../../common/constants';
import type { AppPanel, CellDefinition, NotebookApp } from '../../common/types';
import { isPinnedTimeCell } from './cell_factory';
import type { CellStatus } from './types';
import { buildGraph, getDescendants } from './graph';

export const getGridColumns = ({ gridColumns }: NotebookApp): number =>
  gridColumns ?? DEFAULT_GRID_COLUMNS;

const getAppTitle = (number: number): string =>
  i18n.translate('xpack.notebook.app.defaultTitle', {
    defaultMessage: 'App {number}',
    values: { number },
  });

/** A title for a new app that no other app in the notebook already uses. */
export const getNewAppTitle = (apps: readonly NotebookApp[]): string => {
  const taken = new Set(apps.map(({ title }) => title));
  let number = apps.length + 1;
  while (taken.has(getAppTitle(number))) number++;
  return getAppTitle(number);
};

export const createEmptyApp = (
  apps: readonly NotebookApp[],
  createId: () => string = uuidv4
): NotebookApp => ({ id: createId(), title: getNewAppTitle(apps), panels: [] });

interface PanelSize {
  width: number;
  height: number;
}

/** The size a cell takes on the default 12-column grid when it is first placed on an app. */
const getBasePanelSize = (cell: CellDefinition): PanelSize => {
  switch (cell.type) {
    case 'input':
      return { width: 4, height: 2 };
    case 'markdown':
      return { width: DEFAULT_GRID_COLUMNS, height: 3 };
    case 'chart':
      return { width: 6, height: 7 };
    case 'esql':
      return { width: DEFAULT_GRID_COLUMNS, height: 8 };
  }
};

/** How much of a grid with the given number of columns a cell takes when it is first placed. */
export const getDefaultPanelSize = (
  cell: CellDefinition,
  columns: number = DEFAULT_GRID_COLUMNS
): PanelSize => {
  const { width, height } = getBasePanelSize(cell);
  return { width: Math.max(1, Math.round((width * columns) / DEFAULT_GRID_COLUMNS)), height };
};

const getBottom = (panels: readonly AppPanel[]): number =>
  panels.reduce((bottom, { y, height }) => Math.max(bottom, y + height), 0);

/** Places sized cells left to right, wrapping to a new row when one doesn't fit. */
const packPanels = (
  cells: readonly CellDefinition[],
  top: number,
  createId: () => string,
  columns: number = DEFAULT_GRID_COLUMNS
): AppPanel[] => {
  let x = 0;
  let y = top;
  let rowHeight = 0;
  return cells.map((cell) => {
    const { width, height } = getDefaultPanelSize(cell, columns);
    if (x + width > columns) {
      x = 0;
      y += rowHeight;
      rowHeight = 0;
    }
    const panel = { id: createId(), cellId: cell.id, x, y, width, height };
    x += width;
    rowHeight = Math.max(rowHeight, height);
    return panel;
  });
};

/** The app with the cell appended in a new row below its existing panels. */
export const appendPanel = (
  app: NotebookApp,
  cell: CellDefinition,
  createId: () => string = uuidv4
): NotebookApp => ({
  ...app,
  panels: [
    ...app.panels,
    ...packPanels([cell], getBottom(app.panels), createId, getGridColumns(app)),
  ],
});

/**
 * The app on a grid with a different number of columns. Panels keep their share of the width,
 * rounded to whole columns, so switching back and forth can shift them slightly.
 */
export const setGridColumns = (app: NotebookApp, columns: number): NotebookApp => {
  const { gridColumns: _previous, ...rest } = app;
  const ratio = columns / getGridColumns(app);
  const panels = app.panels.map((panel) => {
    const x = Math.min(Math.round(panel.x * ratio), columns - 1);
    const width = Math.min(Math.max(1, Math.round(panel.width * ratio)), columns - x);
    return { ...panel, x, width };
  });
  return columns === DEFAULT_GRID_COLUMNS
    ? { ...rest, panels }
    : { ...rest, gridColumns: columns, panels };
};

/**
 * The app's panels in the shape the grid layout engine edits, keyed by panel id. `scale` is how
 * many engine cells make up one app grid cell; positions between engine cells are rounded.
 */
export const toGridLayout = (panels: readonly AppPanel[], scale = 1): GridLayoutData => {
  const toCells = (units: number) => Math.round(units * scale);
  return Object.fromEntries(
    panels.map(({ id, x, y, width, height }) => [
      id,
      {
        type: 'panel' as const,
        id,
        column: toCells(x),
        row: toCells(y),
        width: Math.max(1, toCells(width)),
        height: Math.max(1, toCells(height)),
      },
    ])
  );
};

/** The panels moved and resized to match the grid layout; panels it doesn't mention keep their place. */
export const applyGridLayout = (
  panels: readonly AppPanel[],
  layout: GridLayoutData,
  scale = 1
): AppPanel[] =>
  panels.map((panel) => {
    const widget = layout[panel.id];
    if (widget?.type !== 'panel') return panel;
    const { column, row, width, height } = widget;
    return {
      ...panel,
      x: column / scale,
      y: row / scale,
      width: width / scale,
      height: height / scale,
    };
  });

/**
 * The apps after the tabs bar changed them: tabs are reordered, renamed or closed in place, new
 * tabs become empty apps, and duplicated tabs copy their source app's panels.
 */
export const reconcileApps = (
  apps: readonly NotebookApp[],
  tabs: ReadonlyArray<{ id: string; label: string; duplicatedFromId?: string }>,
  createId: () => string = uuidv4
): NotebookApp[] => {
  const byId = new Map(apps.map((app) => [app.id, app]));
  return tabs.map(({ id, label, duplicatedFromId }) => {
    const existing = byId.get(id);
    if (existing) return existing.title === label ? existing : { ...existing, title: label };
    const source = duplicatedFromId ? byId.get(duplicatedFromId) : undefined;
    return {
      ...source,
      id,
      title: label,
      panels: source?.panels.map((panel) => ({ ...panel, id: createId() })) ?? [],
    };
  });
};

/** Whether any cell the app shows depends on the given cell, directly or through other cells. */
export const appDependsOn = (
  app: NotebookApp,
  cells: Readonly<Record<string, CellDefinition>>,
  cellOrder: readonly string[],
  cellId: string
): boolean => {
  const dependents = getDescendants(buildGraph(cells, cellOrder), [cellId]);
  return app.panels.some((panel) => dependents.has(panel.cellId));
};

export type AttentionStatus = Exclude<CellStatus, 'done' | 'running'>;

/** Most severe first, so the first group decides the app's overall status. */
const ATTENTION_ORDER: readonly AttentionStatus[] = ['error', 'blocked', 'stale', 'idle'];

export interface AppStatusGroup {
  status: AttentionStatus;
  names: string[];
}

/**
 * The app's cells that need attention, grouped by status with the most severe group first.
 * Markdown cells never run, so they are left out.
 */
export const getAppStatusGroups = (
  app: NotebookApp,
  cells: Readonly<Record<string, CellDefinition>>,
  getStatus: (cellId: string) => CellStatus
): AppStatusGroup[] => {
  const cellIds = [...new Set(app.panels.map(({ cellId }) => cellId))];
  const shown = cellIds.flatMap((id) => {
    const cell = cells[id];
    return cell && cell.type !== 'markdown' ? [cell] : [];
  });
  return ATTENTION_ORDER.flatMap((status) => {
    const names = shown.filter(({ id }) => getStatus(id) === status).map(({ name }) => name);
    return names.length > 0 ? [{ status, names }] : [];
  });
};

const SECTION_ORDER: ReadonlyArray<CellDefinition['type']> = ['markdown', 'input', 'chart', 'esql'];

/**
 * A dashboard-style app over the notebook: notes, then controls, then charts, then the tables of
 * queries no chart already shows. Each section starts on a new row.
 */
export const generateDefaultApp = (
  cells: Readonly<Record<string, CellDefinition>>,
  cellOrder: readonly string[],
  title: string,
  createId: () => string = uuidv4
): NotebookApp => {
  const ordered = cellOrder.flatMap((id) => {
    const cell = cells[id];
    return cell && !isPinnedTimeCell(cell) ? [cell] : [];
  });
  const charted = new Set(
    ordered.flatMap((cell) => (cell.type === 'chart' && cell.sourceCell ? [cell.sourceCell] : []))
  );
  const included = ordered.filter((cell) => cell.type !== 'esql' || !charted.has(cell.id));

  const panels = SECTION_ORDER.reduce<AppPanel[]>(
    (placed, type) => [
      ...placed,
      ...packPanels(
        included.filter((cell) => cell.type === type),
        getBottom(placed),
        createId
      ),
    ],
    []
  );
  return { id: createId(), title, panels };
};
