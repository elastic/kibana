/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchRequestParams } from '@kbn/search-types';
import { isEmpty } from 'lodash';

import { ACTION_RESPONSES_DATA_STREAM_INDEX } from '../../../../../common/constants';
import type { UnifiedHistoryRequestOptions } from '../../../../../common/search_strategy/osquery/unified_history';

export const buildUnifiedHistoryScheduledQuery = ({
  pageSize,
  cursor,
}: UnifiedHistoryRequestOptions): ISearchRequestParams => {
  const cursorFilter =
    cursor && !isEmpty(cursor) ? [{ range: { '@timestamp': { lt: cursor } } }] : [];

  return {
    allow_no_indices: true,
    index: `${ACTION_RESPONSES_DATA_STREAM_INDEX}*`,
    ignore_unavailable: true,
    size: 0,
    query: {
      bool: {
        filter: [{ exists: { field: 'schedule_id' } }, ...cursorFilter],
      },
    },
    aggs: {
      executions: {
        composite: {
          size: pageSize,
          sources: [
            { schedule_id: { terms: { field: 'schedule_id', order: 'asc' } } },
            {
              execution_count: {
                terms: { field: 'schedule_execution_count', order: 'desc' },
              },
            },
          ],
        },
        aggs: {
          max_timestamp: { max: { field: '@timestamp' } },
          agent_count: { cardinality: { field: 'agent_id' } },
          total_rows: { sum: { field: 'action_response.osquery.count' } },
          success_count: {
            filter: {
              bool: { must_not: { exists: { field: 'error.keyword' } } },
            },
          },
          error_count: {
            filter: { exists: { field: 'error.keyword' } },
          },
          timestamp_sort: {
            bucket_sort: {
              sort: [{ max_timestamp: { order: 'desc' as const } }],
              size: pageSize,
            },
          },
        },
      },
    },
  };
};
