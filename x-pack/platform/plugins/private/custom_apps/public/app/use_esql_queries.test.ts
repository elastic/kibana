/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import { rowsToObjects, shapeResult, toParamValue } from './use_esql_queries';

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

describe('toParamValue', () => {
  it('turns a cleared control into the empty string, which queries read as "no filter"', () => {
    expect(toParamValue(undefined)).toBe('');
    expect(toParamValue(null)).toBe('');
    expect(toParamValue([])).toBe('');
  });

  it('joins a multi-select to CSV, for SPLIT to take apart again', () => {
    // ES|QL has no defined substitution for an *empty* multi-value parameter,
    // and empty is the resting state of every filter — so scalars throughout.
    expect(toParamValue(['k8s-eu-prod', 'k8s-us-prod'])).toBe('k8s-eu-prod,k8s-us-prod');
  });

  it('drops empty entries so a stray blank cannot match everything', () => {
    expect(toParamValue(['checkout', '', null, 'payments'])).toBe('checkout,payments');
  });

  it('passes numbers through unquoted and stringifies booleans', () => {
    expect(toParamValue(42)).toBe(42);
    expect(toParamValue(true)).toBe('true');
  });

  it('refuses to guess at an object', () => {
    expect(toParamValue({ nested: 1 })).toBe('');
  });
});

describe('shapeResult with groups', () => {
  const grouped = {
    columns: [
      { name: 'pod', type: 'keyword' },
      { name: 'cluster', type: 'keyword' },
    ],
    values: [
      ['a', 'eu'],
      ['b', 'us'],
      ['c', 'eu'],
    ],
  } as unknown as ESQLSearchResponse;

  it('nests rows so a ChildList template can render one card per group', () => {
    expect(shapeResult(grouped, 'groups', 'cluster')).toEqual([
      {
        key: 'eu',
        count: 2,
        items: [
          { pod: 'a', cluster: 'eu' },
          { pod: 'c', cluster: 'eu' },
        ],
      },
      { key: 'us', count: 1, items: [{ pod: 'b', cluster: 'us' }] },
    ]);
  });

  it('orders groups by size, so the layout is stable across refreshes', () => {
    const keys = (shapeResult(grouped, 'groups', 'cluster') as Array<{ key: string }>).map(
      (group) => group.key
    );
    expect(keys).toEqual(['eu', 'us']);
  });

  it('returns nothing rather than guessing when groupBy is missing', () => {
    expect(shapeResult(grouped, 'groups')).toEqual([]);
  });

  it('buckets rows with no value under the empty key rather than dropping them', () => {
    const withNull = {
      columns: [{ name: 'cluster', type: 'keyword' }],
      values: [[null]],
    } as unknown as ESQLSearchResponse;
    expect(shapeResult(withNull, 'groups', 'cluster')).toEqual([
      { key: '', count: 1, items: [{ cluster: null }] },
    ]);
  });
});
