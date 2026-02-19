/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ISearchRequestParams } from '@kbn/search-types';
import { isEmpty } from 'lodash';
import moment from 'moment/moment';
import { buildIndexNameWithNamespace } from '../../../../utils/build_index_name_with_namespace';
import { getQueryFilter } from '../../../../utils/build_query';
import { OSQUERY_INTEGRATION_NAME } from '../../../../../common';
import type { ResultsRequestOptions } from '../../../../../common/search_strategy';

export const buildResultsQuery = ({
  actionId,
  agentId,
  kuery,
  sort,
  startDate,
  responseId,
  pagination: { activePage, querySize },
  integrationNamespaces,
}: ResultsRequestOptions): ISearchRequestParams => {
  const baseIndex = `logs-${OSQUERY_INTEGRATION_NAME}.result*`;

  // Match either action_id (live queries) or schedule_id (scheduled queries)
  const actionIdFilter: estypes.QueryDslQueryContainer = {
    bool: {
      should: [
        { term: { action_id: actionId } },
        { term: { schedule_id: actionId } },
      ],
      minimum_should_match: 1,
    },
  };

  const agentFilter: estypes.QueryDslQueryContainer[] = agentId
    ? [{ term: { 'agent.id': agentId } }]
    : [];

  const responseIdFilter: estypes.QueryDslQueryContainer[] = responseId
    ? [{ term: { response_id: responseId } }]
    : [];

  const kueryFilter: estypes.QueryDslQueryContainer[] = !isEmpty(kuery)
    ? [getQueryFilter({ filter: kuery })]
    : [];

  const timeRangeFilter: estypes.QueryDslQueryContainer[] =
    startDate && !isEmpty(startDate)
      ? [
          {
            range: {
              'event.ingested': {
                gte: startDate,
                lte: moment(startDate).clone().add(30, 'minutes').toISOString(),
              },
            },
          },
        ]
      : [];
  const filterQuery: estypes.QueryDslQueryContainer[] = [
    ...timeRangeFilter,
    actionIdFilter,
    ...agentFilter,
    ...responseIdFilter,
    ...kueryFilter,
  ];

  let index: string;

  if (integrationNamespaces && integrationNamespaces.length > 0) {
    index = integrationNamespaces
      .map((namespace) => buildIndexNameWithNamespace(baseIndex, namespace))
      .join(',');
  } else {
    index = baseIndex;
  }

  return {
    allow_no_indices: true,
    index,
    ignore_unavailable: true,
    aggs: {
      count_by_agent_id: {
        terms: {
          field: 'elastic_agent.id',
          size: 10000,
        },
      },
      unique_agents: {
        cardinality: {
          field: 'elastic_agent.id',
        },
      },
    },
    query: { bool: { filter: filterQuery } },
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
