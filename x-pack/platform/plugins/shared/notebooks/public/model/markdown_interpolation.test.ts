/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import type { CellDefinition } from '../../common/types';
import {
  getReferencedCellIds,
  interpolateMarkdown,
  toMarkdownScope,
  type MarkdownScope,
} from './markdown_interpolation';
import type { CellRuntime } from './types';

const table: Datatable = {
  type: 'datatable',
  columns: [
    { id: 'host.name', name: 'host.name', meta: { type: 'string' } },
    { id: 'bytes', name: 'bytes', meta: { type: 'number' } },
    { id: '@timestamp', name: '@timestamp', meta: { type: 'date' } },
  ],
  rows: [
    { 'host.name': 'web-*1*', bytes: 1234567, '@timestamp': '2026-11-01T10:00:00.000Z' },
    { 'host.name': 'web-2', bytes: 1, '@timestamp': '2026-11-01T11:00:00.000Z' },
  ],
};

const scope: MarkdownScope = {
  params: {
    os: { value: 'linux' },
    min_bytes: { value: 2048 },
    country: { value: null },
    _tstart: { value: '2026-11-01T00:00:00.000Z', type: 'date' },
  },
  tables: { hosts: table, pending: undefined },
};

describe('interpolateMarkdown', () => {
  it('fills input values, formatting numbers and dates for the locale', () => {
    expect(
      interpolateMarkdown('OS {{os}}, over {{ min_bytes }} bytes since {{_tstart}}', scope)
    ).toEqual({
      markdown: `OS linux, over ${(2048).toLocaleString()} bytes since ${new Date(
        '2026-11-01T00:00:00.000Z'
      ).toLocaleString()}`,
      unknown: [],
    });
  });

  it("reads a column from a cell's first row, including dotted column names", () => {
    expect(interpolateMarkdown('{{hosts.bytes}} from {{hosts.host.name}}', scope).markdown).toBe(
      `${(1234567).toLocaleString()} from web-\\*1\\*`
    );
  });

  it('formats date columns', () => {
    expect(interpolateMarkdown('{{hosts.@timestamp}}', scope).markdown).toBe(
      new Date('2026-11-01T10:00:00.000Z').toLocaleString()
    );
  });

  it('shows a placeholder while a cell has no results, and a dash for empty values', () => {
    expect(interpolateMarkdown('{{pending.bytes}} / {{country}}', scope).markdown).toBe('… / —');
  });

  it('leaves unknown references as written and reports them once each', () => {
    expect(
      interpolateMarkdown('{{nope}} {{hosts}} {{hosts.missing}} {{os.value}} {{nope}}', scope)
    ).toEqual({
      markdown: '{{nope}} {{hosts}} {{hosts.missing}} {{os.value}} {{nope}}',
      unknown: ['{{nope}}', '{{hosts}}', '{{hosts.missing}}', '{{os.value}}'],
    });
  });

  it('leaves text without references alone', () => {
    expect(interpolateMarkdown('Plain *text* with {braces}', scope)).toEqual({
      markdown: 'Plain *text* with {braces}',
      unknown: [],
    });
  });
});

const cells: Record<string, CellDefinition> = {
  'cell-os': {
    id: 'cell-os',
    type: 'input',
    name: 'os',
    input: { kind: 'dropdown', optionsQuery: '', defaultValue: null },
  },
  'cell-period': {
    id: 'cell-period',
    type: 'input',
    name: 'period',
    input: { kind: 'time', defaultValue: { from: 'now-7d', to: 'now' }, pinned: false },
  },
  'cell-hosts': { id: 'cell-hosts', type: 'esql', name: 'hosts', runMode: 'auto', query: '' },
  'cell-other': { id: 'cell-other', type: 'esql', name: 'other', runMode: 'auto', query: '' },
};

describe('getReferencedCellIds', () => {
  it('finds the cells whose outputs a note references', () => {
    expect(
      getReferencedCellIds('{{os}} {{period_start}} {{hosts.bytes}} {{unknown}}', cells)
    ).toEqual(['cell-os', 'cell-period', 'cell-hosts']);
  });
});

describe('toMarkdownScope', () => {
  it('collects input params and ES|QL tables from the runtimes', () => {
    const runtimes: Record<string, CellRuntime> = {
      'cell-os': { status: 'done', output: { kind: 'input', params: { os: 'linux' } } },
      'cell-period': {
        status: 'done',
        output: {
          kind: 'input',
          params: { period_start: '2026-11-01T00:00:00.000Z', period_end: null },
        },
      },
      'cell-hosts': { status: 'done', output: { kind: 'table', table, truncated: false } },
      'cell-other': { status: 'idle' },
    };
    expect(toMarkdownScope(Object.values(cells), (id) => runtimes[id])).toEqual({
      params: {
        os: { value: 'linux' },
        period_start: { value: '2026-11-01T00:00:00.000Z', type: 'date' },
        period_end: { value: null, type: 'date' },
      },
      tables: { hosts: table, other: undefined },
    });
  });
});
