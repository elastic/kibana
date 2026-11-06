/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellDefinition, CellType, NotebookApp } from '../../common/types';
import { getCellOutputs } from './references';

/** Which cells the notebook shows; the empty filter shows every cell. */
export interface CellFilter {
  search: string;
  hiddenTypes: readonly CellType[];
  /** Apps whose cells to hide; `null` stands for the cells that aren't in any app. */
  hiddenAppIds: ReadonlyArray<string | null>;
}

export const EMPTY_CELL_FILTER: CellFilter = { search: '', hiddenTypes: [], hiddenAppIds: [] };

const getSearchableText = (cell: CellDefinition): string[] => {
  const common = [cell.label ?? '', cell.name, ...getCellOutputs(cell).map(({ name }) => name)];
  switch (cell.type) {
    case 'esql':
      return [...common, cell.query];
    case 'chart':
      return common;
    case 'custom':
      return [...common, cell.query ?? '', cell.template];
    case 'vega':
      return [...common, cell.spec];
    case 'code':
      return [...common, cell.code];
    case 'markdown':
      return [...common, cell.content];
    case 'input':
      return cell.input.kind === 'dropdown'
        ? [...common, cell.input.optionsQuery, ...(cell.input.staticOptions ?? [])]
        : common;
  }
};

/** The apps showing the cell, or `[null]` when no app does. */
const getCellAppIds = (cellId: string, apps: readonly NotebookApp[]): Array<string | null> => {
  const appIds = apps
    .filter(({ panels }) => panels.some((panel) => panel.cellId === cellId))
    .map(({ id }) => id);
  return appIds.length > 0 ? appIds : [null];
};

/** Whether the cell passes the filter; a cell in several apps stays until all of them are hidden. */
export const matchesCellFilter = (
  cell: CellDefinition,
  { search, hiddenTypes, hiddenAppIds }: CellFilter,
  apps: readonly NotebookApp[]
): boolean => {
  if (hiddenTypes.includes(cell.type)) return false;
  if (
    hiddenAppIds.length > 0 &&
    getCellAppIds(cell.id, apps).every((appId) => hiddenAppIds.includes(appId))
  ) {
    return false;
  }
  const term = search.trim().toLowerCase();
  return !term || getSearchableText(cell).some((text) => text.toLowerCase().includes(term));
};

/** The hidden app ids that still name an app, or the cells outside any app. */
export const getActiveHiddenAppIds = (
  { hiddenAppIds }: CellFilter,
  apps: readonly NotebookApp[]
): Array<string | null> =>
  hiddenAppIds.filter((appId) => appId === null || apps.some(({ id }) => id === appId));

/** Whether the filter can hide any cell. */
export const isCellFilterActive = (filter: CellFilter, apps: readonly NotebookApp[]): boolean =>
  Boolean(filter.search.trim()) ||
  filter.hiddenTypes.length > 0 ||
  getActiveHiddenAppIds(filter, apps).length > 0;
