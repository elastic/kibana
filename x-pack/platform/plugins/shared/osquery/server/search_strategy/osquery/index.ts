/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, mergeMap, forkJoin, from, of } from 'rxjs';
import type { ISearchStrategy, PluginStart } from '@kbn/data-plugin/server';
import { shimHitsTotal } from '@kbn/data-plugin/server';
import { ENHANCED_ES_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import type { CoreStart } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { KbnServerError } from '@kbn/kibana-utils-plugin/server';
import { ACTION_RESPONSES_DATA_STREAM_INDEX, ACTIONS_INDEX } from '../../../common/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { hasOsqueryReadPrivilege } from '../../lib/has_osquery_read_privilege';
import { OSQUERY_SEARCH_STRATEGY_AUTHZ_ERROR } from '../constants';
import { enforceSpaceScope } from './enforce_space_scope';
import type {
  FactoryQueryTypes,
  StrategyResponseType,
  StrategyRequestType,
} from '../../../common/search_strategy/osquery';
import { OsqueryQueries } from '../../../common/search_strategy/osquery';
import { osqueryFactory } from './factory';
import type { OsqueryFactory, OsqueryFactoryRequest } from './factory/types';
import { hasConnectedRemoteClusters } from '../../utils/ccs_utils';
import { shouldUseInternalSearchClient } from '../../utils/cps_read_routing';

/**
 * Factory query types constrained by an `action_id` and reading documents that
 * can actually carry `action_data`, and which may therefore also match the
 * agent-carried `action_data.space_id` (see {@link buildSpaceIdFilter}).
 *
 * SECURITY: the id binding narrows the read to documents the caller named, but it
 * is not an authorization gate on its own — route-level ownership checks are
 * uneven (`get_action_results_route.ts` verifies the action document only when CPS
 * is active). Isolation rests on the clause itself matching only documents whose
 * surviving provenance already names the active space. Do not add a query type
 * here unless its builder unconditionally filters on an `action_id`.
 *
 * Types not allowlisted for `action_data.space_id`: `actions` enumerates across
 * actions; `exportResults` is not unconditionally id-bound in the factory
 * (opaque `baseFilter` KQL), so named-space live-query export remains a known
 * gap; `actionDetails` is an id-bound lookup of Kibana-written action metadata
 * on `ACTIONS_INDEX`, not agent `action_data`.
 *
 * `scheduledActionResults` is deliberately absent even though it is `schedule_id`
 * bound. `action_data` only exists on documents produced by a Fleet action, and
 * scheduled pack executions never create one — their `space_id` travels in the
 * agent policy (`routes/pack/utils.ts`), which is not subject to Fleet Server's
 * per-field action whitelist, so those documents already carry the top-level
 * field. Allowlisting it would widen a space-isolation decision to an
 * agent-writable field in exchange for a clause that can never match.
 *
 * Membership here is necessary but not sufficient: `results` serves scheduled
 * reads too, because `get_scheduled_query_results_route.ts` passes a
 * `scheduleId`/`executionCount` pair that selects the `schedule_id` branch of
 * `buildResultsQuery`. `schedule_id` is minted per pack query
 * (`create_pack_route.ts`) and delivered by the policy, so that branch matches
 * the same action-less documents as `scheduledActionResults`. See
 * {@link isScheduleBoundRequest}, which withholds the flag there for the same
 * reason.
 */
export const ID_BOUND_FACTORY_QUERY_TYPES: readonly FactoryQueryTypes[] = [
  OsqueryQueries.results,
  OsqueryQueries.actionResults,
];

/**
 * True when the request selects a builder's `schedule_id` branch rather than its
 * `action_id` one, mirroring the condition in `buildResultsQuery`.
 */
const isScheduleBoundRequest = <T extends FactoryQueryTypes>(
  request: StrategyRequestType<T>
): boolean =>
  'scheduleId' in request &&
  request.scheduleId != null &&
  'executionCount' in request &&
  request.executionCount != null;

export const osquerySearchStrategyProvider = <T extends FactoryQueryTypes>(
  data: PluginStart,
  esClient: CoreStart['elasticsearch']['client'],
  osqueryContext: Pick<OsqueryAppContext, 'security' | 'service' | 'isCpsActive'>
): ISearchStrategy<StrategyRequestType<T>, StrategyResponseType<T>> => {
  // Only used by `cancel`, which has no access to the request that selected a
  // client. Every search binds its own client locally, so concurrent requests
  // cannot steal each other's identity.
  let lastUsedEs: typeof data.search.searchAsInternalUser;

  return {
    search: (request, options, deps) => {
      const factoryQueryType = request.factoryQueryType;
      if (factoryQueryType == null) {
        throw new Error('factoryQueryType is required');
      }

      const queryFactory: OsqueryFactory<T> = osqueryFactory[factoryQueryType];

      return from(hasOsqueryReadPrivilege(osqueryContext.security, deps.request)).pipe(
        mergeMap((isAuthorized) => {
          if (!isAuthorized) {
            throw new KbnServerError(OSQUERY_SEARCH_STRATEGY_AUTHZ_ERROR, 403);
          }

          return forkJoin({
            actionsIndexExists: esClient.asInternalUser.indices.exists({
              index: `${ACTIONS_INDEX}*`,
            }),
            newDataStreamIndexExists: esClient.asInternalUser.indices.exists({
              index: `${ACTION_RESPONSES_DATA_STREAM_INDEX}*`,
              allow_no_indices: false,
              expand_wildcards: 'all',
            }),
            ccsEnabled: hasConnectedRemoteClusters(esClient.asInternalUser),
            activeSpace: from(Promise.resolve(osqueryContext.service.getActiveSpace(deps.request))),
            cpsActive: from(osqueryContext.isCpsActive(deps.request)),
          });
        }),
        mergeMap(
          ({
            actionsIndexExists,
            newDataStreamIndexExists,
            ccsEnabled,
            activeSpace,
            cpsActive,
          }) => {
            // Single decision for hit-level enforceSpaceScope and for any
            // global-agg builder that cannot inherit the top-level query.
            const matchActionDataSpaceId =
              ID_BOUND_FACTORY_QUERY_TYPES.includes(factoryQueryType) &&
              !isScheduleBoundRequest(request);

            const strictRequest = {
              factoryQueryType,
              kuery: request.kuery,
              ...('pagination' in request ? { pagination: request.pagination } : {}),
              ...('sort' in request ? { sort: request.sort } : {}),
              ...('actionId' in request ? { actionId: request.actionId } : {}),
              ...('startDate' in request ? { startDate: request.startDate } : {}),
              ...('agentId' in request ? { agentId: request.agentId } : {}),
              ...('agentIds' in request ? { agentIds: request.agentIds } : {}),
              ...('policyIds' in request ? { policyIds: request.policyIds } : {}),
              ...('integrationNamespaces' in request
                ? { integrationNamespaces: request.integrationNamespaces }
                : {}),
              ...('scheduleId' in request ? { scheduleId: request.scheduleId } : {}),
              ...('executionCount' in request ? { executionCount: request.executionCount } : {}),
              ...('esFilters' in request ? { esFilters: request.esFilters } : {}),
              ...('matchMissingSpaceId' in request
                ? { matchMissingSpaceId: request.matchMissingSpaceId }
                : {}),
              // exportResults factory fields — baseFilter is required and unique to this
              // factory type, so its presence is a reliable discriminator for all six fields.
              ...('baseFilter' in request
                ? {
                    baseFilter: request.baseFilter,
                    pit: 'pit' in request ? request.pit : undefined,
                    searchAfter: 'searchAfter' in request ? request.searchAfter : undefined,
                    size: 'size' in request ? request.size : undefined,
                    ecsMapping: 'ecsMapping' in request ? request.ecsMapping : undefined,
                    trackTotalHits:
                      'trackTotalHits' in request ? request.trackTotalHits : undefined,
                  }
                : {}),
            } as StrategyRequestType<T>;

            const spaceId = activeSpace?.id ?? DEFAULT_SPACE_ID;

            const spaceScopeOptions = {
              ...('matchMissingSpaceId' in request && request.matchMissingSpaceId !== undefined
                ? { matchMissingSpaceId: request.matchMissingSpaceId }
                : {}),
              matchActionDataSpaceId,
            };

            const factoryRequest = {
              ...strictRequest,
              spaceId,
              componentTemplateExists: actionsIndexExists,
              ccsEnabled,
              matchActionDataSpaceId,
            } as OsqueryFactoryRequest<T>;

            const dsl = enforceSpaceScope(
              queryFactory.buildDsl(factoryRequest),
              spaceId,
              spaceScopeOptions
            );

            // Client selection is per search, not per request: the legacy and data-stream
            // reads below target different index families, so a single decision taken from
            // the legacy DSL would silently apply the wrong client to the other. On a project
            // without the osquery integration installed the legacy read resolves to
            // `.fleet-actions-results*`, which pins that read to the internal client, and
            // reusing it for the data-stream read would cancel fan-out for every result.
            const selectSearchClient = (searchDsl: typeof dsl) => {
              const indices = Array.isArray(searchDsl.index)
                ? searchDsl.index
                : searchDsl.index
                ? [searchDsl.index]
                : [];

              return shouldUseInternalSearchClient(indices, cpsActive)
                ? data.search.searchAsInternalUser
                : data.search.getSearchStrategy(ENHANCED_ES_SEARCH_STRATEGY);
            };

            const es = selectSearchClient(dsl);

            lastUsedEs = es;

            // When a PIT is present ES rejects requests that also specify `index`,
            // `allow_no_indices`, or `ignore_unavailable` (the PIT already encodes
            // the index scope). Strip those fields from the params before the call
            // while keeping `dsl.index` above for client-selection routing.
            const esParams = dsl.pit
              ? {
                  ...dsl,
                  index: undefined,
                  allow_no_indices: undefined,
                  ignore_unavailable: undefined,
                }
              : dsl;

            const searchLegacyIndex$ = es.search(
              {
                ...strictRequest,
                params: esParams,
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
                if (
                  factoryQueryType === OsqueryQueries.actionResults &&
                  (newDataStreamIndexExists || ccsEnabled || cpsActive)
                ) {
                  const dataStreamDsl = enforceSpaceScope(
                    queryFactory.buildDsl({
                      ...factoryRequest,
                      useNewDataStream: true,
                    } as OsqueryFactoryRequest<T>),
                    spaceId,
                    spaceScopeOptions
                  );

                  const dataStreamEs = selectSearchClient(dataStreamDsl);

                  lastUsedEs = dataStreamEs;

                  return from(
                    dataStreamEs.search(
                      {
                        ...strictRequest,
                        params: dataStreamDsl,
                      },
                      options,
                      deps
                    )
                  ).pipe(
                    map((newDataStreamIndexResponse) => {
                      if (newDataStreamIndexResponse.rawResponse.hits.total) {
                        return newDataStreamIndexResponse;
                      }

                      return legacyIndexResponse;
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
              mergeMap((esSearchRes) => queryFactory.parse(factoryRequest, esSearchRes))
            );
          }
        )
      );
    },
    cancel: async (id, options, deps) => {
      if (lastUsedEs?.cancel) {
        return lastUsedEs.cancel(id, options, deps);
      }
    },
  };
};
