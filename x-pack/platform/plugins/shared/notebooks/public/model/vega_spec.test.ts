/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import {
  createStarterSpec,
  injectVegaTable,
  parseVegaSpec,
  toVegaRecords,
  type ParsedVegaSpec,
} from './vega_spec';

const table: Datatable = {
  type: 'datatable',
  columns: [
    { id: 'col-0', name: 'host', meta: { type: 'string' } },
    { id: 'col-1', name: 'visits', meta: { type: 'number' } },
  ],
  rows: [
    { 'col-0': 'a', 'col-1': 3 },
    { 'col-0': 'b', 'col-1': 5 },
  ],
};

const records = [
  { host: 'a', visits: 3 },
  { host: 'b', visits: 5 },
];

const parse = (spec: object): ParsedVegaSpec => {
  const parsed = parseVegaSpec(JSON.stringify(spec));
  if ('error' in parsed) throw new Error(parsed.error);
  return parsed;
};

describe('parseVegaSpec', () => {
  it('tells Vega-Lite from Vega by $schema', () => {
    expect(
      parse({ $schema: 'https://vega.github.io/schema/vega-lite/v6.json', mark: 'bar' }).language
    ).toBe('vega-lite');
    expect(parse({ $schema: 'https://vega.github.io/schema/vega/v6.json' }).language).toBe('vega');
    expect(parse({ marks: [] }).language).toBe('vega');
  });

  it('reads HJSON, with comments and unquoted keys', () => {
    const parsed = parseVegaSpec(
      '{\n  // a comment\n  $schema: https://vega.github.io/schema/vega-lite/v6.json\n  mark: bar\n}'
    );
    expect(parsed).toEqual({
      language: 'vega-lite',
      spec: { $schema: 'https://vega.github.io/schema/vega-lite/v6.json', mark: 'bar' },
    });
  });

  it('reports unreadable specs and non-objects', () => {
    expect(parseVegaSpec('{')).toHaveProperty('error');
    expect(parseVegaSpec('[]')).toEqual({ error: 'The spec must be an object' });
  });
});

describe('toVegaRecords', () => {
  it('keys rows by column name', () => {
    expect(toVegaRecords(table)).toEqual(records);
  });
});

describe('injectVegaTable', () => {
  it('gives a Vega-Lite spec without data the table dataset', () => {
    const { spec } = injectVegaTable(
      parse({ $schema: 'https://vega.github.io/schema/vega-lite/v6.json', mark: 'bar' }),
      records
    );
    expect(spec).toMatchObject({ data: { name: 'table' }, datasets: { table: records } });
  });

  it("keeps a Vega-Lite spec's own data", () => {
    const { spec } = injectVegaTable(
      parse({
        $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
        data: { values: [{ x: 1 }] },
        mark: 'bar',
      }),
      records
    );
    expect(spec).toMatchObject({ data: { values: [{ x: 1 }] }, datasets: { table: records } });
  });

  it('fills an empty Vega table entry and adds one when missing', () => {
    expect(
      injectVegaTable(parse({ data: [{ name: 'table' }, { name: 'other', values: [] }] }), records)
        .spec
    ).toMatchObject({
      data: [
        { name: 'table', values: records },
        { name: 'other', values: [] },
      ],
    });
    expect(injectVegaTable(parse({ marks: [] }), records).spec).toMatchObject({
      data: [{ name: 'table', values: records }],
    });
  });

  it('leaves a Vega table entry that has its own source', () => {
    const data = [{ name: 'table', url: 'data.json' }];
    expect(injectVegaTable(parse({ data }), records).spec).toMatchObject({ data });
  });
});

describe('createStarterSpec', () => {
  it('charts the first category against the first number', () => {
    expect(JSON.parse(createStarterSpec(table))).toMatchObject({
      data: { name: 'table' },
      mark: { type: 'bar' },
      encoding: {
        x: { field: 'host', type: 'nominal' },
        y: { field: 'visits', type: 'quantitative' },
      },
    });
  });

  it('counts rows when there is no number', () => {
    const [host] = table.columns;
    expect(JSON.parse(createStarterSpec({ ...table, columns: [host] })).encoding).toEqual({
      x: { field: 'host', type: 'nominal' },
      y: { type: 'quantitative', aggregate: 'count' },
    });
  });
});
