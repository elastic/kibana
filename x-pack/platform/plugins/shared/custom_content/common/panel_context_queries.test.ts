/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readContextQueries, toContextQueries } from './panel_context_queries';

describe('readContextQueries', () => {
  it('reads the main query first, then the additional ones', () => {
    expect(
      readContextQueries({ esql_query: 'FROM a', additional_esql_queries: ['FROM b', 'FROM c'] })
    ).toEqual(['FROM a', 'FROM b', 'FROM c']);
  });

  it('reads a single query, as saved before a panel could have several', () => {
    expect(readContextQueries({ esql_query: 'FROM a' })).toEqual(['FROM a']);
  });

  it('reads no queries, whatever else is there, when there is no main query', () => {
    expect(readContextQueries({})).toEqual([]);
    expect(readContextQueries({ additional_esql_queries: ['FROM b'] })).toEqual([]);
  });
});

describe('toContextQueries', () => {
  it('puts the first query in the main field and the rest in the additional one', () => {
    expect(toContextQueries(['FROM a', 'FROM b', 'FROM c'])).toEqual({
      esql_query: 'FROM a',
      additional_esql_queries: ['FROM b', 'FROM c'],
    });
  });

  it('leaves the additional field out for a single query, and everything out for none', () => {
    expect(toContextQueries(['FROM a'])).not.toHaveProperty('additional_esql_queries');
    expect(toContextQueries([])).toEqual({ esql_query: undefined });
  });

  it('round-trips with readContextQueries', () => {
    const queries = ['FROM a', 'FROM b'];

    expect(readContextQueries(toContextQueries(queries))).toEqual(queries);
  });
});
