/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellDefinition, NotebookApp } from '../../common/types';
import {
  EMPTY_CELL_FILTER,
  getActiveHiddenAppIds,
  isCellFilterActive,
  matchesCellFilter,
  type CellFilter,
} from './cell_filter';

const esql: CellDefinition = {
  id: 'e1',
  name: 'esql_1',
  label: 'Traffic',
  type: 'esql',
  runMode: 'auto',
  query: 'FROM logs | STATS hits = COUNT() BY host',
  outputNames: { table: 'traffic_table' },
};
const chart: CellDefinition = {
  id: 'c1',
  name: 'chart_1',
  type: 'chart',
  runMode: 'auto',
  sourceCell: 'e1',
  lensAttributes: null,
};
const notes: CellDefinition = {
  id: 'm1',
  name: 'notes_1',
  type: 'markdown',
  content: '## Weekly review',
};
const custom: CellDefinition = {
  id: 'p1',
  name: 'custom_1',
  type: 'custom',
  runMode: 'auto',
  dataSource: 'query',
  sourceCell: null,
  query: 'FROM orders | STATS revenue = SUM(price)',
  template: '<h1>{{ rows[0]["revenue"].value }}</h1>',
};
const dropdown: CellDefinition = {
  id: 'd1',
  name: 'country',
  type: 'input',
  input: {
    kind: 'dropdown',
    optionsSource: 'static',
    optionsQuery: '',
    staticOptions: ['Canada', 'Mexico'],
    defaultValue: null,
  },
};

const panel = (cellId: string) => ({
  id: `panel_${cellId}`,
  cellId,
  x: 0,
  y: 0,
  width: 6,
  height: 4,
});
const apps: NotebookApp[] = [
  { id: 'a1', title: 'Overview', panels: [panel('c1'), panel('p1')] },
  { id: 'a2', title: 'Details', panels: [panel('p1')] },
];

const matches = (cell: CellDefinition, filter: Partial<CellFilter>) =>
  matchesCellFilter(cell, { ...EMPTY_CELL_FILTER, ...filter }, apps);

describe('matchesCellFilter', () => {
  it('shows every cell when nothing is filtered', () => {
    [esql, chart, notes, custom, dropdown].forEach((cell) => expect(matches(cell, {})).toBe(true));
  });

  it.each([
    ['the label', esql, 'traffic'],
    ['the name', chart, 'CHART_1'],
    ['a renamed output', esql, 'traffic_table'],
    ['the ES|QL query', esql, 'stats hits'],
    ['markdown content', notes, 'weekly'],
    ['a custom panel query', custom, 'orders'],
    ['a custom panel template', custom, '<h1>'],
    ['dropdown options', dropdown, 'mexico'],
  ])('searches %s, ignoring case and surrounding spaces', (_what, cell, search) => {
    expect(matches(cell, { search: `  ${search} ` })).toBe(true);
    expect(matches(cell, { search: `${search} nowhere` })).toBe(false);
  });

  it('hides the unchecked types', () => {
    expect(matches(esql, { hiddenTypes: ['chart'] })).toBe(true);
    expect(matches(chart, { hiddenTypes: ['chart'] })).toBe(false);
  });

  it('hides cells only in hidden apps, or in no app when that is hidden', () => {
    expect(matches(chart, { hiddenAppIds: ['a1'] })).toBe(false);
    expect(matches(custom, { hiddenAppIds: ['a1'] })).toBe(true);
    expect(matches(custom, { hiddenAppIds: ['a1', 'a2'] })).toBe(false);
    expect(matches(esql, { hiddenAppIds: ['a1'] })).toBe(true);
    expect(matches(esql, { hiddenAppIds: [null] })).toBe(false);
    expect(matches(chart, { hiddenAppIds: [null] })).toBe(true);
  });

  it('requires the cell to pass every filter', () => {
    expect(matches(chart, { hiddenTypes: ['esql'], search: 'chart' })).toBe(true);
    expect(matches(chart, { hiddenTypes: ['esql'], search: 'traffic' })).toBe(false);
  });
});

describe('isCellFilterActive', () => {
  it('ignores a blank search and hidden apps that were deleted', () => {
    expect(isCellFilterActive(EMPTY_CELL_FILTER, apps)).toBe(false);
    expect(isCellFilterActive({ ...EMPTY_CELL_FILTER, search: '  ' }, apps)).toBe(false);
    expect(isCellFilterActive({ ...EMPTY_CELL_FILTER, hiddenAppIds: ['gone'] }, apps)).toBe(false);
  });

  it('is active for a search, a hidden type or a hidden app', () => {
    expect(isCellFilterActive({ ...EMPTY_CELL_FILTER, search: 'x' }, apps)).toBe(true);
    expect(isCellFilterActive({ ...EMPTY_CELL_FILTER, hiddenTypes: ['esql'] }, apps)).toBe(true);
    expect(isCellFilterActive({ ...EMPTY_CELL_FILTER, hiddenAppIds: [null] }, apps)).toBe(true);
  });
});

describe('getActiveHiddenAppIds', () => {
  it('drops apps that no longer exist', () => {
    const filter = { ...EMPTY_CELL_FILTER, hiddenAppIds: ['a2', 'gone', null] };
    expect(getActiveHiddenAppIds(filter, apps)).toEqual(['a2', null]);
  });
});
