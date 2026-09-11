/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortCombinations } from '@elastic/elasticsearch/lib/api/types';
import type {
  ConversationSearchSort,
  ConversationSearchSortField,
} from '@kbn/agent-builder-common';

const DEFAULT_SORT: ConversationSearchSort = { field: 'updated_at', order: 'desc' };

const SORT_FIELD_PATHS: Record<ConversationSearchSortField, string> = {
  updated_at: 'updated_at',
  created_at: 'created_at',
  title: 'title.keyword',
};

const TIEBREAKER_FIELD: ConversationSearchSortField = 'created_at';

/**
 * Builds the sort clauses for a conversation search.
 *
 * @param sort - Requested order. Defaults to `updated_at` descending.
 * @param hasQuery - Whether the search also carries a free-text query.
 * @returns Sort clauses, always ending in a tiebreaker so paging is deterministic.
 */
export const buildSearchSort = ({
  sort = DEFAULT_SORT,
  hasQuery,
}: {
  sort?: ConversationSearchSort;
  hasQuery: boolean;
}): SortCombinations[] => {
  const { field, order } = sort;

  return [
    ...(hasQuery ? [{ _score: { order: 'desc' as const } }] : []),
    { [SORT_FIELD_PATHS[field]]: { order } },
    ...(field === TIEBREAKER_FIELD ? [] : [{ [SORT_FIELD_PATHS[TIEBREAKER_FIELD]]: { order } }]),
  ];
};
