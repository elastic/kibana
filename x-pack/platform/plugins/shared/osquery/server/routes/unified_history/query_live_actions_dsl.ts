/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

interface LiveActionsQueryOptions {
  pageSize: number;
  cursor?: string;
  kuery?: string;
  userIds?: string[];
  spaceId: string;
  startDate?: string;
  endDate?: string;
}

export const buildLiveActionsQuery = ({
  pageSize,
  cursor,
  kuery,
  userIds,
  spaceId,
  startDate,
  endDate,
}: LiveActionsQueryOptions): {
  body: Record<string, unknown>;
} => {
  const filters: estypes.QueryDslQueryContainer[] = [
    { term: { type: { value: 'INPUT_ACTION' } } },
    { term: { input_type: { value: 'osquery' } } },
  ];

  if (spaceId === 'default') {
    filters.push({
      bool: {
        should: [
          { term: { space_id: 'default' } },
          { bool: { must_not: { exists: { field: 'space_id' } } } },
        ],
      },
    });
  } else {
    filters.push({ term: { space_id: spaceId } });
  }

  if (cursor) {
    filters.push({
      range: { '@timestamp': { lt: cursor } },
    });
  }

  // Apply time range filter from the date picker
  if (startDate || endDate) {
    const rangeFilter: Record<string, string> = {};
    if (startDate) rangeFilter.gte = startDate;
    if (endDate) rangeFilter.lte = endDate;
    filters.push({ range: { '@timestamp': rangeFilter } });
  }

  if (kuery) {
    filters.push({
      simple_query_string: {
        query: `*${kuery}*`,
        fields: ['pack_name', 'queries.query', 'queries.id'],
        analyze_wildcard: true,
      },
    });
  }

  if (userIds && userIds.length > 0) {
    filters.push({ terms: { user_id: userIds } });
  }

  return {
    body: {
      query: {
        bool: {
          filter: filters,
        },
      },
      size: pageSize,
      sort: [{ '@timestamp': { order: 'desc' as const } }],
      _source: true,
    },
  };
};
