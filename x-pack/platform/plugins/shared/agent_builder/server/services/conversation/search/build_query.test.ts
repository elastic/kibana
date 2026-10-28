/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSearchQuery, buildTitleMatch } from './build_query';

describe('buildTitleMatch', () => {
  it.each([undefined, '', '   '])('matches everything for %p', (query) => {
    expect(buildTitleMatch(query)).toEqual([]);
  });

  it('matches the trimmed query as a prefix on the title, boosting whole-word matches', () => {
    expect(buildTitleMatch('  sales rep ')).toEqual([
      {
        bool: {
          should: [
            { match_bool_prefix: { title: { query: 'sales rep', operator: 'and' } } },
            {
              prefix: {
                'title.keyword': { value: 'sales rep', boost: 2, case_insensitive: true },
              },
            },
            {
              prefix: {
                'title.keyword': { value: 'sales rep ', boost: 5, case_insensitive: true },
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
    ]);
  });
});

describe('buildSearchQuery', () => {
  const baseFilters = [{ term: { space: 'default' } }, { term: { user_id: 'user-1' } }];

  it('puts the base filters in the filter clause and leaves must empty with no query', () => {
    expect(buildSearchQuery({ baseFilters, compiledFilter: undefined, titleMatch: [] })).toEqual({
      bool: { filter: baseFilters, must: [] },
    });
  });

  it('appends the compiled filter after the base filters', () => {
    const compiledFilter = { term: { status: 'completed' } };

    expect(buildSearchQuery({ baseFilters, compiledFilter, titleMatch: [] })).toEqual({
      bool: { filter: [...baseFilters, compiledFilter], must: [] },
    });
  });

  it('puts the title match in the must clause', () => {
    const titleMatch = buildTitleMatch('anything');

    expect(buildSearchQuery({ baseFilters, compiledFilter: undefined, titleMatch })).toEqual({
      bool: { filter: baseFilters, must: titleMatch },
    });
  });
});
