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
  spaceId: string;
}

export const buildLiveActionsQuery = ({
  pageSize,
  cursor,
  kuery,
  spaceId,
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

  if (kuery) {
    filters.push({
      query_string: {
        query: kuery,
        fields: ['pack_name', 'queries.query', 'queries.id'],
      },
    });
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
      track_total_hits: true,
      fields: ['*'],
    },
  };
};
