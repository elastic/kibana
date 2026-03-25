/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchRequestParams } from '@kbn/search-types';
import { ACTION_RESPONSES_DATA_STREAM_INDEX } from '../../../../../common/constants';
import type { ScheduledActionResultsRequestOptions } from '../../../../../common/search_strategy';

export const buildScheduledActionResultsQuery = ({
  scheduleId,
  executionCount,
  spaceId,
  sort,
  pagination,
}: ScheduledActionResultsRequestOptions): ISearchRequestParams => {
  const filterQuery: Array<Record<string, unknown>> = [
    { term: { schedule_id: scheduleId } },
    { term: { schedule_execution_count: executionCount } },
  ];

  if (spaceId) {
    filterQuery.push({ term: { space_id: spaceId } });
  }

  return {
    allow_no_indices: true,
    index: `${ACTION_RESPONSES_DATA_STREAM_INDEX}*`,
    ignore_unavailable: true,
    aggs: {
      aggs: {
        global: {},
        aggs: {
          responses_by_schedule: {
            filter: {
              bool: {
                must: [
                  { term: { schedule_id: scheduleId } },
                  { term: { schedule_execution_count: executionCount } },
                  ...(spaceId ? [{ term: { space_id: spaceId } }] : []),
                ],
              },
            },
            aggs: {
              rows_count: {
                sum: {
                  field: 'action_response.osquery.count',
                },
              },
              responses: {
                terms: {
                  script: {
                    lang: 'painless',
                    source:
                      "if (doc['error.keyword'].size()==0) { return 'success' } else { return 'error' }",
                  } as const,
                },
              },
            },
          },
        },
      },
    },
    query: { bool: { filter: filterQuery } },
    from: pagination ? pagination.activePage * pagination.querySize : 0,
    size: pagination?.querySize ?? 100,
    track_total_hits: true,
    fields: ['*'],
    sort: [
      {
        [sort.field]: {
          order: sort.direction,
        },
      },
    ],
  };
};
