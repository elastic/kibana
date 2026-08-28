/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { buildSpaceIdFilter } from '../../utils/build_space_id_filter';

interface ScheduledResponsesQueryOptions {
  cursor?: string;
  scheduledOffset?: number;
  pageSize?: number;
  packIds?: string[];
  scheduleIds?: string[];
  spaceId: string;
  startDate?: string;
  endDate?: string;
  sortDirection?: 'asc' | 'desc';
  cpsActive?: boolean;
}

export const buildScheduledResponsesQuery = ({
  cursor,
  scheduledOffset = 0,
  pageSize = 20,
  packIds,
  scheduleIds,
  spaceId,
  startDate,
  endDate,
  sortDirection = 'desc',
  cpsActive = false,
}: ScheduledResponsesQueryOptions): {
  body: Record<string, unknown>;
} => {
  // Unlike every other osquery read, this aggregation is not bound to an action
  // or schedule id the caller already had access to, so it is the one query
  // where a field-less document fanned in from a linked project could surface.
  const filters: estypes.QueryDslQueryContainer[] = [
    { exists: { field: 'schedule_id' } },
    buildSpaceIdFilter(spaceId, {
      matchMissingSpaceId: !cpsActive,
    }),
  ];

  if (packIds !== undefined || scheduleIds !== undefined) {
    const hasPackIds = packIds && packIds.length > 0;
    const hasScheduleIds = scheduleIds && scheduleIds.length > 0;

    if (hasPackIds && hasScheduleIds) {
      filters.push({
        bool: {
          should: [{ terms: { pack_id: packIds } }, { terms: { schedule_id: scheduleIds } }],
          minimum_should_match: 1,
        },
      });
    } else if (hasPackIds) {
      filters.push({ terms: { pack_id: packIds } });
    } else if (hasScheduleIds) {
      filters.push({ terms: { schedule_id: scheduleIds } });
    } else {
      filters.push({ match_none: {} });
    }
  }

  if (cursor) {
    filters.push({
      range: {
        planned_schedule_time: sortDirection === 'desc' ? { lte: cursor } : { gte: cursor },
      },
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
            order: { planned_time: sortDirection },
          },
          aggs: {
            planned_time: { max: { field: 'planned_schedule_time' } },
            max_timestamp: { max: { field: '@timestamp' } },
            // ES-default precision required: this agg fans out over 10k+ buckets and
            // `precision_threshold: 40000` here trips the request circuit breaker.
            agent_count: { cardinality: { field: 'agent_id' } },
            // Constant within a schedule bucket; lets rows whose pack saved object is not
            // in this space (cross-project reads) still resolve their labels.
            pack_id: { terms: { field: 'pack_id', size: 1 } },
            pack_name: { terms: { field: 'pack_name', size: 1 } },
            query_name: { terms: { field: 'query_name', size: 1 } },
            total_rows: {
              sum: { field: 'action_response.osquery.count' },
            },
            // Per-outcome agent cardinality; the filters' `doc_count` counts documents.
            success_count: {
              filter: {
                bool: { must_not: { exists: { field: 'error' } } },
              },
              aggs: {
                agents: { cardinality: { field: 'agent_id' } },
              },
            },
            error_count: {
              filter: { exists: { field: 'error' } },
              aggs: {
                agents: { cardinality: { field: 'agent_id' } },
              },
            },
          },
        },
      },
    },
  };
};
