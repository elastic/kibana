/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchRequestParams } from '@kbn/search-types';
import {
  ACTION_RESPONSES_DATA_STREAM_INDEX,
  AGENT_CARDINALITY_PRECISION,
} from '../../../../../common/constants';
import type { ScheduledActionResultsRequestOptions } from '../../../../../common/search_strategy';
import { buildIndexNamesWithNamespaces } from '../../../../utils/build_index_name_with_namespace';
import { prefixIndexPatternsWithCcs } from '../../../../utils/ccs_utils';
import { buildSpaceIdFilter } from '../../../../utils/build_space_id_filter';

export const buildScheduledActionResultsQuery = ({
  scheduleId,
  executionCount,
  spaceId,
  sort,
  pagination,
  integrationNamespaces,
  ccsEnabled,
  matchMissingSpaceId,
}: ScheduledActionResultsRequestOptions): ISearchRequestParams => {
  // Top-level hit scoping is enforced centrally in the search strategy
  // (enforceSpaceScope). The aggregation below is a separate filter context that
  // the top-level query does not constrain, so it is scoped explicitly here.
  const spaceIdFilter = buildSpaceIdFilter(spaceId, {
    matchMissingSpaceId: matchMissingSpaceId ?? true,
  });

  const filterQuery: Array<Record<string, unknown>> = [
    { term: { schedule_id: scheduleId } },
    { term: { schedule_execution_count: executionCount } },
  ];

  const index = prefixIndexPatternsWithCcs(
    buildIndexNamesWithNamespaces(`${ACTION_RESPONSES_DATA_STREAM_INDEX}*`, integrationNamespaces),
    ccsEnabled ?? false
  );

  return {
    allow_no_indices: true,
    index,
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
                  spaceIdFilter,
                ],
              },
            },
            aggs: {
              rows_count: {
                sum: {
                  field: 'action_response.osquery.count',
                },
              },
              // Agent cardinality, not `doc_count`: a bucket can hold many
              // response docs per agent, which rendered as inflated agent counts.
              responded_agents: {
                cardinality: {
                  field: 'agent_id',
                  precision_threshold: AGENT_CARDINALITY_PRECISION,
                },
              },
              success_agents: {
                filter: { bool: { must_not: { exists: { field: 'error' } } } },
                aggs: {
                  agents: {
                    cardinality: {
                      field: 'agent_id',
                      precision_threshold: AGENT_CARDINALITY_PRECISION,
                    },
                  },
                },
              },
              error_agents: {
                filter: { exists: { field: 'error' } },
                aggs: {
                  agents: {
                    cardinality: {
                      field: 'agent_id',
                      precision_threshold: AGENT_CARDINALITY_PRECISION,
                    },
                  },
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
