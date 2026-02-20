/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

interface ScheduledResponsesQueryOptions {
  pageSize: number;
  cursor?: string; // ISO timestamp — fetch executions older than this
  scheduleIds?: string[]; // when searching by name, restrict to these schedule IDs
}

export const buildScheduledResponsesQuery = ({
  pageSize,
  cursor,
  scheduleIds,
}: ScheduledResponsesQueryOptions): {
  body: Record<string, unknown>;
} => {
  const filters: estypes.QueryDslQueryContainer[] = [{ exists: { field: 'schedule_id' } }];

  // When a search term is active, filter to only matching schedule IDs
  // (names live in saved objects, not in the ES index)
  if (scheduleIds) {
    if (scheduleIds.length === 0) {
      // No matching schedule IDs — short-circuit with match_none
      filters.push({ bool: { must_not: { match_all: {} } } });
    } else {
      filters.push({ terms: { schedule_id: scheduleIds } });
    }
  }

  if (cursor) {
    filters.push({
      range: { '@timestamp': { lte: cursor } },
    });
  }

  return {
    body: {
      size: 0,
      query: {
        bool: {
          filter: filters,
        },
      },
      aggs: {
        // We use multi_terms instead of composite aggregation because composite
        // does not support ordering by sub-aggregation values (max_timestamp),
        // which is required for time-ordered display. The trade-off is a hard
        // ceiling of 1000 buckets per request. This is acceptable because the
        // route uses offset-based pagination to page through results, and in
        // practice a single page request will not exceed this limit.
        scheduled_executions: {
          multi_terms: {
            terms: [{ field: 'schedule_id' }, { field: 'schedule_execution_count' }],
            size: Math.max(pageSize, 1000),
            order: { max_timestamp: 'desc' as const },
          },
          aggs: {
            max_timestamp: { max: { field: '@timestamp' } },
            agent_count: { cardinality: { field: 'agent_id' } },
            total_rows: {
              sum: { field: 'action_response.osquery.count' },
            },
            success_count: {
              filter: {
                bool: { must_not: { exists: { field: 'error' } } },
              },
            },
            error_count: {
              filter: { exists: { field: 'error' } },
            },
          },
        },
      },
    },
  };
};
