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
  spaceId?: string; // Kibana space ID for native space filtering on newer docs
  startDate?: string; // ISO timestamp or datemath expression (e.g. 'now-24h')
  endDate?: string; // ISO timestamp or datemath expression (e.g. 'now')
}

export const buildScheduledResponsesQuery = ({
  pageSize,
  cursor,
  scheduleIds,
  spaceId,
  startDate,
  endDate,
}: ScheduledResponsesQueryOptions): {
  body: Record<string, unknown>;
} => {
  const filters: estypes.QueryDslQueryContainer[] = [{ exists: { field: 'schedule_id' } }];

  // Space isolation: use space_id field when available (newer docs),
  // fall back to schedule ID whitelist for legacy docs without space_id.
  // Both filters work together during the transition period.
  if (spaceId) {
    filters.push({
      bool: {
        should: [
          { term: { space_id: spaceId } },
          { bool: { must_not: { exists: { field: 'space_id' } } } },
        ],
        minimum_should_match: 1,
      },
    });
  }

  // Filter by known schedule IDs from the current space's packs.
  // This provides space isolation for legacy docs (without space_id field),
  // eliminates orphaned rows from deleted packs, and narrows results
  // when searching by name.
  if (scheduleIds) {
    if (scheduleIds.length === 0) {
      // No known schedule IDs — short-circuit with match_none
      filters.push({ match_none: {} });
    } else {
      filters.push({ terms: { schedule_id: scheduleIds } });
    }
  }

  if (cursor) {
    filters.push({
      range: { '@timestamp': { lte: cursor } },
    });
  }

  // Apply time range filter from the date picker
  if (startDate || endDate) {
    const rangeFilter: Record<string, string> = {};
    if (startDate) rangeFilter.gte = startDate;
    if (endDate) rangeFilter.lte = endDate;
    filters.push({ range: { '@timestamp': rangeFilter } });
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
        // ceiling of 10,000 buckets per request. Combined with the date picker's
        // default 24h time window, this is sufficient for any realistic deployment.
        scheduled_executions: {
          multi_terms: {
            terms: [{ field: 'schedule_id' }, { field: 'schedule_execution_count' }],
            size: Math.max(pageSize, 10000),
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
