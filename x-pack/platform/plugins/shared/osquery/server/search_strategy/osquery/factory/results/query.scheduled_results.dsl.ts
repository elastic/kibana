/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchRequestParams } from '@kbn/search-types';
import { OSQUERY_INTEGRATION_NAME } from '../../../../../common';
import type { ScheduledResultsRequestOptions } from '../../../../../common/search_strategy';

export const buildScheduledResultsQuery = ({
  scheduleId,
  executionCount,
  sort,
  pagination: { activePage, querySize },
}: ScheduledResultsRequestOptions): ISearchRequestParams => {
  return {
    allow_no_indices: true,
    index: `logs-${OSQUERY_INTEGRATION_NAME}.result*`,
    ignore_unavailable: true,
    query: {
      bool: {
        filter: [
          { term: { schedule_id: scheduleId } },
          { term: { 'osquery_meta.schedule_execution_count': executionCount } },
        ],
      },
    },
    from: activePage * querySize,
    size: querySize,
    track_total_hits: true,
    fields: ['elastic_agent.*', 'agent.*', 'osquery.*'],
    sort:
      sort?.map((sortConfig) => ({
        [sortConfig.field]: {
          order: sortConfig.direction,
        },
      })) ?? [],
  };
};
