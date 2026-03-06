/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

interface ScheduledResponsesQueryOptions {
  cursor?: string;
  scheduledOffset?: number;
  pageSize?: number;
  packIds?: string[];
  spaceId: string;
  startDate?: string;
  endDate?: string;
}

export const buildScheduledResponsesQuery = ({
  cursor,
  scheduledOffset = 0,
  pageSize = 20,
  packIds,
  spaceId,
  startDate,
  endDate,
}: ScheduledResponsesQueryOptions): {
  body: Record<string, unknown>;
} => {
  const filters: estypes.QueryDslQueryContainer[] = [
    { exists: { field: 'schedule_id' } },
    { term: { space_id: spaceId } },
  ];

  if (packIds) {
    if (packIds.length === 0) {
      filters.push({ match_none: {} });
    } else {
      filters.push({ terms: { pack_id: packIds } });
    }
  }

  if (cursor) {
    filters.push({
      range: { planned_schedule_time: { lte: cursor } },
    });
  }

  if (startDate || endDate) {
    const rangeFilter: Record<string, string> = {};
    if (startDate) rangeFilter.gte = startDate;
    if (endDate) rangeFilter.lte = endDate;
    filters.push({ range: { '@timestamp': rangeFilter } });
  }

  const MAX_AGG_BUCKETS = 65536;
  const aggSize = Math.min(Math.max(scheduledOffset + pageSize + 1, 10000), MAX_AGG_BUCKETS);

  return {
    body: {
      size: 0,
      query: {
        bool: {
          filter: filters,
        },
      },
      aggs: {
        scheduled_executions: {
          multi_terms: {
            terms: [{ field: 'schedule_id' }, { field: 'schedule_execution_count' }],
            size: aggSize,
            order: { planned_time: 'desc' as const },
          },
          aggs: {
            planned_time: { max: { field: 'planned_schedule_time' } },
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
            pack_id_hit: {
              top_hits: { size: 1, _source: { includes: ['pack_id'] } },
            },
          },
        },
      },
    },
  };
};
