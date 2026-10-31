/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readLensResponse } from '..';
import type { LensQueryPlan } from './types';

const query: LensQueryPlan = {
  layerId: 'layer',
  query: { language: 'esql', esql: 'FROM orders-*' },
  context: { ignoreGlobalFilters: false },
  columns: [
    { columnId: 'count', fieldName: 'orders', params: { format: { id: 'number' } } },
    { columnId: 'category', fieldName: 'status' },
    { columnId: 'count-copy', fieldName: 'orders', label: 'Copy', customLabel: true },
  ],
};
const response = {
  columns: [
    { name: 'status', type: 'keyword' },
    { name: 'orders', type: 'long' },
    { name: 'extra', type: 'boolean' },
  ],
  values: [
    ['open', 42, true],
    [null, null, false],
    [['open', 'closed'], [1, 2], true],
  ],
};

describe('readLensResponse', () => {
  it('projects by response name, preserves multiple Lens IDs for a field and never coerces values', () => {
    const result = readLensResponse(query, response);
    expect(result).toEqual({
      status: 'ready',
      table: {
        layerId: 'layer',
        columns: [
          { lens: query.columns[0], responseType: 'long' },
          { lens: query.columns[1], responseType: 'keyword' },
          { lens: query.columns[2], responseType: 'long' },
        ],
        rows: [
          [42, 'open', 42],
          [null, null, null],
          [
            [1, 2],
            ['open', 'closed'],
            [1, 2],
          ],
        ],
      },
    });
    expect(response.values[0]).toEqual(['open', 42, true]);
  });

  it('accepts empty results without manufacturing a zero', () => {
    expect(readLensResponse(query, { ...response, values: [] })).toMatchObject({
      status: 'ready',
      table: { rows: [] },
    });
  });

  it.each([
    [null, 'lens.response.invalid-shape'],
    [{ columns: [], values: [] }, 'lens.response.invalid-shape'],
    [{ ...response, values: [[1]] }, 'lens.response.row-width'],
    [{ ...response, columns: [response.columns[0]], values: [] }, 'lens.response.missing-column'],
    [
      { ...response, columns: [response.columns[0], response.columns[0]], values: [] },
      'lens.response.duplicate-column',
    ],
    [{ ...response, is_partial: true }, 'lens.response.incomplete'],
    [{ ...response, is_running: true }, 'lens.response.incomplete'],
    [{ ...response, values: [[NaN]] }, 'lens.response.invalid-json'],
    [
      { ...response, values: Array.from({ length: 10_001 }, () => [1]) },
      'lens.response.invalid-json',
    ],
  ])('returns an explicit invalid outcome %#', (input, code) => {
    const result = readLensResponse(query, input);
    expect(result.status).toBe('invalid');
    if (result.status !== 'invalid') {
      throw new Error('Expected invalid response');
    }
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === code)).toBe(true);
  });

  it('supports the row cap exactly, without truncation', () => {
    const input = {
      columns: [{ name: 'orders', type: 'long' }],
      values: Array.from({ length: 10_000 }, () => [1]),
    };
    const result = readLensResponse({ ...query, columns: [query.columns[0]] }, input);
    if (result.status !== 'ready') {
      throw new Error(JSON.stringify(result));
    }
    expect(result.table.rows).toHaveLength(10_000);
  });
});
