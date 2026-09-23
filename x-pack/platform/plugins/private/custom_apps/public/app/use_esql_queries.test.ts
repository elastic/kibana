/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import { rowsToObjects, shapeResult } from './use_esql_queries';

const response = {
  columns: [
    { name: 'requests', type: 'long' },
    { name: 'status', type: 'keyword' },
  ],
  values: [
    [12832, '200'],
    [801, '404'],
  ],
} as unknown as ESQLSearchResponse;

describe('rowsToObjects', () => {
  it('turns columnar ES|QL results into objects keyed by column name', () => {
    expect(rowsToObjects(response)).toEqual([
      { requests: 12832, status: '200' },
      { requests: 801, status: '404' },
    ]);
  });

  it('represents a missing cell as null rather than dropping the key', () => {
    const sparse = {
      columns: [{ name: 'a' }, { name: 'b' }],
      values: [[1]],
    } as unknown as ESQLSearchResponse;
    expect(rowsToObjects(sparse)).toEqual([{ a: 1, b: null }]);
  });
});

describe('shapeResult', () => {
  it('returns every row for "rows"', () => {
    expect(shapeResult(response, 'rows')).toHaveLength(2);
  });

  it('returns just the first row object for "first"', () => {
    expect(shapeResult(response, 'first')).toEqual({ requests: 12832, status: '200' });
  });

  it('returns the first cell of the first row for "value"', () => {
    expect(shapeResult(response, 'value')).toBe(12832);
  });

  it('degrades to null when the query matched nothing', () => {
    const empty = { columns: [{ name: 'a' }], values: [] } as unknown as ESQLSearchResponse;
    expect(shapeResult(empty, 'first')).toBeNull();
    expect(shapeResult(empty, 'value')).toBeNull();
    expect(shapeResult(empty, 'rows')).toEqual([]);
  });
});
