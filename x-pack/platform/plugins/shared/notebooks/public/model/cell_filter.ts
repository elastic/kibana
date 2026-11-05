/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellDefinition, CellType, NotebookApp } from '../../common/types';
import { getCellOutputs } from './references';

/** Which cells the notebook shows; each empty field matches every cell. */
export interface CellFilter {
  search: string;
  types: readonly CellType[];
  /** Apps whose cells to keep; `null` keeps the cells that aren't in any app. */
  appIds: ReadonlyArray<string | null>;
}

export const EMPTY_CELL_FILTER: CellFilter = { search: '', types: [], appIds: [] };

const getSearchableText = (cell: CellDefinition): string[] => {
  const common = [cell.label ?? '', cell.name, ...getCellOutputs(cell).map(({ name }) => name)];
  switch (cell.type) {
    case 'esql':
      return [...common, cell.query];
    case 'chart':
      return common;
    case 'custom':
      return [...common, cell.query ?? '', cell.template];
    case 'markdown':
      return [...common, cell.content];
    case 'input':
      return cell.input.kind === 'dropdown'
        ? [...common, cell.input.optionsQuery, ...(cell.input.staticOptions ?? [])]
        : common;
  }
};

const isInApps = (
  cellId: string,
  appIds: CellFilter['appIds'],
  apps: readonly NotebookApp[]
): boolean => {
  const containing = apps.filter(({ panels }) => panels.some((panel) => panel.cellId === cellId));
  return appIds.some((appId) =>
    appId === null ? containing.length === 0 : containing.some(({ id }) => id === appId)
  );
};

/** Whether the cell passes every filter that is set. */
export const matchesCellFilter = (
  cell: CellDefinition,
  { search, types, appIds }: CellFilter,
  apps: readonly NotebookApp[]
): boolean => {
  if (types.length > 0 && !types.includes(cell.type)) return false;
  if (appIds.length > 0 && !isInApps(cell.id, appIds, apps)) return false;
  const term = search.trim().toLowerCase();
  return !term || getSearchableText(cell).some((text) => text.toLowerCase().includes(term));
};

/** The number of filter values set, for a badge: the search counts as one. */
export const countActiveFilters = ({ search, types, appIds }: CellFilter): number =>
  (search.trim() ? 1 : 0) + types.length + appIds.length;
