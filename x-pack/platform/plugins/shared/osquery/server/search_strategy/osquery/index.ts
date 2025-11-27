/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, mergeMap, forkJoin, from, of, lastValueFrom } from 'rxjs';
import type {
  ISearchStrategy,
  PluginStart,
  SearchStrategyDependencies,
} from '@kbn/data-plugin/server';
import { shimHitsTotal } from '@kbn/data-plugin/server';
import { ENHANCED_ES_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import type { CoreStart } from '@kbn/core/server';
import type { IKibanaSearchResponse, ISearchOptions } from '@kbn/search-types';
import {
  ACTION_RESPONSES_DATA_STREAM_INDEX,
  ACTIONS_INDEX,
  RESULTS_DATA_STREAM_INDEX,
} from '../../../common/constants';
import type { ExperimentalFeatures } from '../../../common/experimental_features';
import type {
  FactoryQueryTypes,
  StrategyResponseType,
  StrategyRequestType,
} from '../../../common/search_strategy/osquery';
import { OsqueryQueries } from '../../../common/search_strategy/osquery';
import { osqueryFactory } from './factory';
import type { OsqueryFactory } from './factory/types';
import { buildResultsAgentsQuery } from './factory/actions/results/query.results_agents.dsl';

interface CompositeAgentBucket {
  key: { agent_id: string };
  doc_count: number;
}

interface ResultsAgentsData {
  agentIds: Set<string>;
  agentBuckets: Array<{ key: string; doc_count: number }>;
  totalDocs: number;
}

interface ResultsAgentsAggregations {
  unique_agents?: {
    buckets: CompositeAgentBucket[];
    after_key?: { agent_id: string };
  };
}

const MAX_PAGINATION_ITERATIONS = 1000;
const LARGE_AGENT_COUNT_THRESHOLD = 50000;

/**
 * Fetches all unique agent IDs from results index using composite aggregation pagination.
 * Handles unlimited agent counts by paginating through results.
 * Includes safeguards: max iterations (1000 = 10M agents max), error handling, timeout protection.
 */
async function fetchAllResultsAgents(
  es: PluginStart['search']['searchAsInternalUser'],
  queryParams: { actionId: string; startDate?: string; integrationNamespaces?: string[] },
  options: ISearchOptions,
  deps: SearchStrategyDependencies
): Promise<ResultsAgentsData> {
  const agentIds = new Set<string>();
  const agentBuckets: Array<{ key: string; doc_count: number }> = [];
  let totalDocs = 0;
  let afterKey: { agent_id: string } | undefined;
  let iterationCount = 0;

  try {
    // Paginate through all composite aggregation pages
    do {
      iterationCount++;

      if (iterationCount > MAX_PAGINATION_ITERATIONS) {
        // eslint-disable-next-line no-console
        console.warn(
          `[osquery] fetchAllResultsAgents exceeded max iterations (${MAX_PAGINATION_ITERATIONS}) for action ${queryParams.actionId}. ` +
            `Processed ${agentBuckets.length} agents. This may indicate an issue with composite aggregation pagination.`
        );
        break;
      }

      const response = (await lastValueFrom(
        es.search(
          {
            params: buildResultsAgentsQuery({
              ...queryParams,
              afterKey,
            }),
          },
          options,
          deps
        )
      )) as IKibanaSearchResponse<{
        hits: { total?: number | { value: number } };
        aggregations?: ResultsAgentsAggregations;
      }>;

      // Get total docs from first request only
      if (totalDocs === 0) {
        const hitsTotal = response.rawResponse.hits?.total;
        totalDocs = typeof hitsTotal === 'number' ? hitsTotal : hitsTotal?.value ?? 0;
      }

      // Extract agent IDs from composite aggregation buckets
      const buckets = response.rawResponse.aggregations?.unique_agents?.buckets;

      if (buckets && buckets.length > 0) {
        for (const bucket of buckets) {
          const agentId = bucket.key.agent_id;
          agentIds.add(agentId);
          agentBuckets.push({ key: agentId, doc_count: bucket.doc_count });
        }

        // Get after_key for next page
        afterKey = response.rawResponse.aggregations?.unique_agents?.after_key;
      } else {
        afterKey = undefined;
      }
    } while (afterKey);

    if (agentBuckets.length > LARGE_AGENT_COUNT_THRESHOLD) {
      // eslint-disable-next-line no-console
      console.warn(
        `[osquery] fetchAllResultsAgents processed ${agentBuckets.length} agents for action ${queryParams.actionId} ` +
          `(iterations: ${iterationCount}). Large agent counts may impact performance.`
      );
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      `[osquery] Error in fetchAllResultsAgents for action ${queryParams.actionId} after ${iterationCount} iterations: ${error}`
    );
    throw error;
  }

  return { agentIds, agentBuckets, totalDocs };
}

export const osquerySearchStrategyProvider = <T extends FactoryQueryTypes>(
  data: PluginStart,
  esClient: CoreStart['elasticsearch']['client'],
  experimentalFeatures: ExperimentalFeatures
): ISearchStrategy<StrategyRequestType<T>, StrategyResponseType<T>> => {
  let es: typeof data.search.searchAsInternalUser;

  return {
    search: (request, options, deps) => {
      if (request.factoryQueryType == null) {
        throw new Error('factoryQueryType is required');
      }

      const queryFactory: OsqueryFactory<T> = osqueryFactory[request.factoryQueryType];

      return forkJoin({
        actionsIndexExists: esClient.asInternalUser.indices.exists({
          index: `${ACTIONS_INDEX}*`,
        }),
        newDataStreamIndexExists: esClient.asInternalUser.indices.exists({
          index: `${ACTION_RESPONSES_DATA_STREAM_INDEX}*`,
          allow_no_indices: false,
          expand_wildcards: 'all',
        }),
        resultsIndexExists: esClient.asInternalUser.indices.exists({
          index: `${RESULTS_DATA_STREAM_INDEX}*`,
        }),
      }).pipe(
        mergeMap(({ actionsIndexExists, newDataStreamIndexExists, resultsIndexExists }) => {
          const strictRequest = {
            factoryQueryType: request.factoryQueryType,
            kuery: request.kuery,
            ...('pagination' in request ? { pagination: request.pagination } : {}),
            ...('sort' in request ? { sort: request.sort } : {}),
            ...('actionId' in request ? { actionId: request.actionId } : {}),
            ...('startDate' in request ? { startDate: request.startDate } : {}),
            ...('agentId' in request ? { agentId: request.agentId } : {}),
            ...('agentIds' in request ? { agentIds: request.agentIds } : {}),
            ...('policyIds' in request ? { policyIds: request.policyIds } : {}),
            ...('spaceId' in request ? { spaceId: request.spaceId } : {}),
            ...('integrationNamespaces' in request
              ? { integrationNamespaces: request.integrationNamespaces }
              : {}),
            ...('useNewDataStream' in request
              ? { useNewDataStream: request.useNewDataStream }
              : {}),
          } as StrategyRequestType<T>;

          const dsl = queryFactory.buildDsl({
            ...strictRequest,
            componentTemplateExists: actionsIndexExists,
          } as StrategyRequestType<T>);

          // Select internal client for all osquery indices that require it
          es =
            dsl.index?.includes('fleet') ||
            dsl.index?.includes('logs-osquery_manager.action') ||
            dsl.index?.includes('logs-osquery_manager.result')
              ? data.search.searchAsInternalUser
              : data.search.getSearchStrategy(ENHANCED_ES_SEARCH_STRATEGY);

          const searchLegacyIndex$ = es.search(
            {
              ...strictRequest,
              params: dsl,
            },
            options,
            deps
          );

          // With the introduction of a new DS that sends data directly from an agent into the new index
          // logs-osquery_manager.action.responses-default, instead of the old index .logs-osquery_manager.action.responses-default
          // which was populated by a transform, we now need to check both places for results.
          // The new index was introduced in integration package 1.12, so users running earlier versions won't have it.

          return searchLegacyIndex$.pipe(
            mergeMap((legacyIndexResponse) => {
              if (request.factoryQueryType === OsqueryQueries.actionResults) {
                // For action results, run parallel queries for data stream comparison
                // and optionally results aggregation (when hybrid feature is enabled)
                const dataStreamQuery$ = newDataStreamIndexExists
                  ? from(
                      es.search(
                        {
                          ...strictRequest,
                          params: queryFactory.buildDsl({
                            ...strictRequest,
                            componentTemplateExists: actionsIndexExists,
                            useNewDataStream: true,
                          } as StrategyRequestType<T>),
                        },
                        options,
                        deps
                      )
                    )
                  : of(null);

                // Query results index for unique agent IDs (for hybrid merge)
                // Only when hybridActionResults feature flag is enabled
                // Uses composite aggregation with pagination for unlimited agent scale
                const resultsAgentsQuery$ =
                  experimentalFeatures.hybridActionResults && resultsIndexExists
                    ? from(
                        fetchAllResultsAgents(
                          es,
                          {
                            actionId: 'actionId' in strictRequest ? strictRequest.actionId : '',
                            startDate:
                              'startDate' in strictRequest ? strictRequest.startDate : undefined,
                            integrationNamespaces:
                              'integrationNamespaces' in strictRequest
                                ? strictRequest.integrationNamespaces
                                : undefined,
                          },
                          options,
                          deps
                        )
                      )
                    : of(null);

                return forkJoin({
                  dataStreamResponse: dataStreamQuery$,
                  resultsAgentsData: resultsAgentsQuery$,
                }).pipe(
                  map(({ dataStreamResponse, resultsAgentsData }) => {
                    // Extract agent IDs and total docs from results aggregation (hybrid mode only)
                    const resultsAgentIds = resultsAgentsData?.agentIds ?? new Set<string>();
                    const resultsAgentBuckets = resultsAgentsData?.agentBuckets ?? [];
                    const resultsTotalDocs = resultsAgentsData?.totalDocs ?? 0;

                    // Compare hit counts and select best response
                    let selectedResponse = legacyIndexResponse;
                    if (dataStreamResponse) {
                      const newTotal =
                        typeof dataStreamResponse.rawResponse.hits.total === 'number'
                          ? dataStreamResponse.rawResponse.hits.total
                          : dataStreamResponse.rawResponse.hits.total?.value ?? 0;
                      const legacyTotal =
                        typeof legacyIndexResponse.rawResponse.hits.total === 'number'
                          ? legacyIndexResponse.rawResponse.hits.total
                          : legacyIndexResponse.rawResponse.hits.total?.value ?? 0;

                      if (newTotal > legacyTotal) {
                        selectedResponse = dataStreamResponse;
                      }
                    }

                    // Attach results data for hybrid merge (only when feature enabled)
                    if (experimentalFeatures.hybridActionResults) {
                      return {
                        ...selectedResponse,
                        resultsAgentIds,
                        resultsAgentBuckets,
                        resultsTotalDocs,
                      };
                    }

                    return selectedResponse;
                  })
                );
              }

              return of(legacyIndexResponse);
            }),
            map((response) => ({
              ...response,
              ...{
                rawResponse: shimHitsTotal(response.rawResponse, options),
              },
              total: response.rawResponse.hits.total as number,
            })),
            mergeMap((esSearchRes) => queryFactory.parse(request, esSearchRes))
          );
        })
      );
    },
    cancel: async (id, options, deps) => {
      if (es?.cancel) {
        return es.cancel(id, options, deps);
      }
    },
  };
};
