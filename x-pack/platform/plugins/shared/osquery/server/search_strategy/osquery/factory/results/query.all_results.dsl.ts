/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchRequestParams } from '@kbn/search-types';
import type { estypes } from '@elastic/elasticsearch';
import { isEmpty } from 'lodash';
import moment from 'moment/moment';
import type { Filter } from '@kbn/es-query';
import { buildQueryFromFilters } from '@kbn/es-query';
import { buildIndexNamesWithNamespaces } from '../../../../utils/build_index_name_with_namespace';
import { getQueryFilter } from '../../../../utils/build_query';
import { OSQUERY_INTEGRATION_NAME } from '../../../../../common';
import type { ResultsRequestOptions } from '../../../../../common/search_strategy';
import { prefixIndexPatternsWithCcs } from '../../../../utils/ccs_utils';

export const buildResultsQuery = ({
  actionId,
  agentId,
  kuery,
  esFilters,
  sort,
  startDate,
  pagination: { activePage, querySize },
  integrationNamespaces,
  scheduleId,
  executionCount,
  ccsEnabled,
}: ResultsRequestOptions): ISearchRequestParams => {
  const baseIndex = `logs-${OSQUERY_INTEGRATION_NAME}.result*`;

  const identifierFilters: estypes.QueryDslQueryContainer[] =
    scheduleId != null && executionCount != null
      ? [
          { term: { schedule_id: scheduleId } },
          { term: { 'osquery_meta.schedule_execution_count': executionCount } },
        ]
      : [{ term: { action_id: actionId } }];
  const agentIdFilter: estypes.QueryDslQueryContainer[] = agentId
    ? [{ term: { 'agent.id': agentId } }]
    : [];
  const kueryFilter = kuery ? [getQueryFilter({ filter: kuery })] : [];

  // Window on `event.ingested` (Fleet's ingest-time stamp) rather than
  // `@timestamp` (osquery's collection time): agents can backfill results whose
  // `@timestamp` predates the action, so an ingest-time window is what reliably
  // captures a live query's responses.
  const timeRangeFilter =
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

  const parsedEsFilters: Filter[] = esFilters ? (JSON.parse(esFilters) as Filter[]) : [];

  const { filter: esFilterClauses, must_not: esFilterMustNotClauses } =
    parsedEsFilters.length > 0
      ? buildQueryFromFilters(parsedEsFilters, undefined)
      : { filter: [], must_not: [] };

  // Space scoping is enforced centrally in the search strategy (enforceSpaceScope).
  const filterQuery = [
    ...timeRangeFilter,
    ...identifierFilters,
    ...agentIdFilter,
    ...kueryFilter,
    ...esFilterClauses,
  ];

  const index = prefixIndexPatternsWithCcs(
    buildIndexNamesWithNamespaces(baseIndex, integrationNamespaces),
    ccsEnabled ?? false
  );

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
    query: {
      bool: {
        filter: filterQuery,
        ...(esFilterMustNotClauses.length > 0 ? { must_not: esFilterMustNotClauses } : {}),
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
