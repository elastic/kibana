/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSearchSort } from './build_sort';

describe('buildSearchSort', () => {
  it('preserves the historical relevance-first order for a query with no explicit sort', () => {
    expect(buildSearchSort({ hasQuery: true })).toEqual([
      { _score: { order: 'desc' } },
      { updated_at: { order: 'desc' } },
      { created_at: { order: 'desc' } },
    ]);
  });

  it('leads with the default sort when there is no query', () => {
    expect(buildSearchSort({ hasQuery: false })).toEqual([
      { updated_at: { order: 'desc' } },
      { created_at: { order: 'desc' } },
    ]);
  });

  it('demotes an explicit sort below relevance when a query is present', () => {
    expect(buildSearchSort({ sort: { field: 'title', order: 'asc' }, hasQuery: true })).toEqual([
      { _score: { order: 'desc' } },
      { 'title.keyword': { order: 'asc' } },
      { created_at: { order: 'asc' } },
    ]);
  });

  it('sorts title on its keyword sub-field', () => {
    expect(buildSearchSort({ sort: { field: 'title', order: 'asc' }, hasQuery: false })).toEqual([
      { 'title.keyword': { order: 'asc' } },
      { created_at: { order: 'asc' } },
    ]);
  });

  it('does not repeat created_at when it is the requested sort field', () => {
    expect(
      buildSearchSort({ sort: { field: 'created_at', order: 'asc' }, hasQuery: false })
    ).toEqual([{ created_at: { order: 'asc' } }]);
  });

  it('always ends in a tiebreaker so paging is deterministic', () => {
    const sortClauses = buildSearchSort({
      sort: { field: 'updated_at', order: 'asc' },
      hasQuery: false,
    });

    expect(sortClauses[sortClauses.length - 1]).toEqual({ created_at: { order: 'asc' } });
  });
});
