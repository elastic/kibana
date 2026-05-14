/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { SourceFilter } from '../../../common/api/unified_history/types';

export type SortValues = Array<string | number>;

interface LiveActionsQueryOptions {
  pageSize: number;
  searchAfter?: SortValues;
  kuery?: string;
  userIds?: string[];
  tags?: string[];
  spaceId: string;
  startDate?: string;
  endDate?: string;
  sortDirection?: 'asc' | 'desc';
  activeFilters?: Set<SourceFilter>;
}

export const buildLiveActionsQuery = ({
  pageSize,
  searchAfter,
  kuery,
  userIds,
  tags,
  spaceId,
  startDate,
  endDate,
  sortDirection = 'desc',
  activeFilters,
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

  if (startDate || endDate) {
    const rangeFilter: Record<string, string> = {};
    if (startDate) rangeFilter.gte = startDate;
    if (endDate) rangeFilter.lte = endDate;
    filters.push({ range: { '@timestamp': rangeFilter } });
  }

  if (kuery) {
    filters.push({
      multi_match: {
        query: kuery,
        type: 'bool_prefix',
        fields: ['pack_name', 'queries.query', 'queries.id'],
        operator: 'and',
      },
    });
  }

  if (userIds && userIds.length > 0) {
    filters.push({ terms: { user_id: userIds } });
  }

  if (tags && tags.length > 0) {
    filters.push({ terms: { tags } });
  }

  if (activeFilters) {
    const wantsLive = activeFilters.has('live');
    const wantsRule = activeFilters.has('rule');
    const wantsWorkflows = activeFilters.has('workflows');

    const sourceConditions: estypes.QueryDslQueryContainer[] = [];

    if (wantsLive) {
      sourceConditions.push({
        bool: {
          should: [
            // New actions with explicit action_source
            { term: { action_source: 'live' } },
            // Old actions without action_source: no alert_ids and no action_source field
            {
              bool: {
                must_not: [
                  { exists: { field: 'alert_ids' } },
                  { exists: { field: 'action_source' } },
                ],
              },
            },
          ],
          minimum_should_match: 1,
        },
      });
    }
    if (wantsRule) {
      sourceConditions.push({
        bool: {
          should: [
            // New actions with explicit action_source
            { term: { action_source: 'rule' } },
            // Old actions without action_source: has alert_ids
            {
              bool: {
                must: [{ exists: { field: 'alert_ids' } }],
                must_not: [{ exists: { field: 'action_source' } }],
              },
            },
          ],
          minimum_should_match: 1,
        },
      });
    }
    if (wantsWorkflows) {
      sourceConditions.push({ term: { action_source: 'workflows' } });
    }

    if (sourceConditions.length > 0 && sourceConditions.length < 3) {
      filters.push({
        bool: { should: sourceConditions, minimum_should_match: 1 },
      });
    }
    // All three selected: no filter needed
  }

  return {
    body: {
      query: {
        bool: {
          filter: filters,
        },
      },
      size: pageSize,
      sort: [
        { '@timestamp': { order: sortDirection } },
        { _shard_doc: { order: sortDirection === 'desc' ? 'asc' : 'desc' } },
      ],
      ...(searchAfter ? { search_after: searchAfter } : {}),
      _source: true,
    },
  };
};
