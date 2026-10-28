/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

/**
 * Builds the `must` clauses matching a free-text query against the conversation title.
 *
 * @param query - Caller-supplied title query; blank queries match everything.
 * @returns Zero or one clause, so it can be spread straight into a `bool.must`.
 */
export const buildTitleMatch = (query: string | undefined): QueryDslQueryContainer[] => {
  const trimmedQuery = query?.trim();
  if (!trimmedQuery) {
    return [];
  }

  return [
    {
      bool: {
        should: [
          {
            match_bool_prefix: {
              title: { query: trimmedQuery, operator: 'and' as const },
            },
          },
          {
            prefix: {
              'title.keyword': { value: trimmedQuery, boost: 2, case_insensitive: true },
            },
          },
          // Trailing space asserts a word boundary, boosting clean whole-word prefix matches above partial-token ones.
          {
            prefix: {
              'title.keyword': {
                value: trimmedQuery + ' ',
                boost: 5,
                case_insensitive: true,
              },
            },
          },
        ],
        minimum_should_match: 1,
      },
    },
  ];
};

/**
 * Assembles the query shared by `search` and `count`, so the 2 read paths cannot drift.
 *
 * @param baseFilters - Space scoping and read-access clauses from the client.
 * @param compiledFilter - The caller's KQL filter, already compiled; omitted when absent.
 * @param titleMatch - Clauses from {@link buildTitleMatch}.
 * @returns A `bool` query with access and filter clauses in `filter` and the title match in `must`.
 */
export const buildSearchQuery = ({
  baseFilters,
  compiledFilter,
  titleMatch,
}: {
  baseFilters: QueryDslQueryContainer[];
  compiledFilter: QueryDslQueryContainer | undefined;
  titleMatch: QueryDslQueryContainer[];
}): QueryDslQueryContainer => ({
  bool: {
    filter: [...baseFilters, ...(compiledFilter ? [compiledFilter] : [])],
    must: titleMatch,
  },
});
