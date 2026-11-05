/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellDefinition, NotebookApp } from '../../common/types';
import {
  EMPTY_CELL_FILTER,
  countActiveFilters,
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

const apps: NotebookApp[] = [
  {
    id: 'a1',
    title: 'Overview',
    panels: [{ id: 'panel', cellId: 'c1', x: 0, y: 0, width: 6, height: 4 }],
  },
];

const matches = (cell: CellDefinition, filter: Partial<CellFilter>) =>
  matchesCellFilter(cell, { ...EMPTY_CELL_FILTER, ...filter }, apps);

describe('matchesCellFilter', () => {
  it('matches every cell when no filter is set', () => {
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

  it('keeps only the chosen types', () => {
    expect(matches(esql, { types: ['esql', 'markdown'] })).toBe(true);
    expect(matches(notes, { types: ['esql', 'markdown'] })).toBe(true);
    expect(matches(chart, { types: ['esql', 'markdown'] })).toBe(false);
  });

  it('keeps cells shown in a chosen app, or in no app at all', () => {
    expect(matches(chart, { appIds: ['a1'] })).toBe(true);
    expect(matches(esql, { appIds: ['a1'] })).toBe(false);
    expect(matches(esql, { appIds: [null] })).toBe(true);
    expect(matches(chart, { appIds: [null] })).toBe(false);
  });

  it('requires every set filter to match', () => {
    expect(matches(chart, { types: ['chart'], appIds: ['a1'], search: 'chart' })).toBe(true);
    expect(matches(chart, { types: ['chart'], appIds: ['a1'], search: 'traffic' })).toBe(false);
  });
});

describe('countActiveFilters', () => {
  it('counts the search, each type and each app', () => {
    expect(countActiveFilters(EMPTY_CELL_FILTER)).toBe(0);
    expect(countActiveFilters({ search: '   ', types: [], appIds: [] })).toBe(0);
    expect(countActiveFilters({ search: 'x', types: ['esql', 'chart'], appIds: [null] })).toBe(4);
  });
});
