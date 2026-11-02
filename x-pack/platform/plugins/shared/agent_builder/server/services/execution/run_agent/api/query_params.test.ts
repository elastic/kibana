/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUnusableQueryParams, toSelfFetchQuery } from './query_params';

describe('getUnusableQueryParams', () => {
  it('accepts scalars, nullish values, and arrays of scalars', () => {
    expect(
      getUnusableQueryParams({
        index: 'my-index',
        size: 5,
        local: true,
        missing: undefined,
        empty: null,
        types: ['dashboard', 'lens'],
        mixed: [1, 'two', false],
      })
    ).toEqual([]);
  });

  it('names a param holding an object or an array containing one', () => {
    expect(
      getUnusableQueryParams({
        ok: 'value',
        range: { gte: 1 },
        nested: ['fine', { gte: 1 }],
        deep: [['too far']],
      })
    ).toEqual(['range', 'nested', 'deep']);
  });

  it('names a param whose array holds a nullish member', () => {
    expect(
      getUnusableQueryParams({
        empty: null,
        types: ['dashboard', null],
        fields: ['@timestamp', undefined],
      })
    ).toEqual(['types', 'fields']);
  });

  it('treats an absent querystring as having nothing to report', () => {
    expect(getUnusableQueryParams()).toEqual([]);
    expect(getUnusableQueryParams({})).toEqual([]);
  });
});

describe('toSelfFetchQuery', () => {
  it('returns undefined when the API takes no query parameters', () => {
    expect(toSelfFetchQuery(undefined)).toBeUndefined();
  });

  it('keeps scalars as they are and stringifies array members', () => {
    expect(
      toSelfFetchQuery({
        search: 'logs',
        perPage: 20,
        local: true,
        types: ['dashboard', 1, false],
      })
    ).toEqual({
      search: 'logs',
      perPage: 20,
      local: true,
      types: ['dashboard', '1', 'false'],
    });
  });

  it('drops a value a query string cannot carry rather than stringifying it', () => {
    expect(toSelfFetchQuery({ ok: 'value', range: { gte: 1 } })).toEqual({ ok: 'value' });
  });
});
