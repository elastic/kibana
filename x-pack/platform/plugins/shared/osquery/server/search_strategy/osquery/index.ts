/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, mergeMap, forkJoin, from, of } from 'rxjs';
import type { ISearchStrategy, PluginStart } from '@kbn/data-plugin/server';
import { shimHitsTotal } from '@kbn/data-plugin/server';
import type { ISearchRequestParams } from '@kbn/search-types';
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
import { findOsqueryActionMetadata } from '../../utils/find_osquery_action_metadata';

/**
 * Factory query types constrained by an `action_id` and reading documents that
 * can actually carry `action_data`, and which may therefore also match the
 * agent-carried `action_data.space_id` (see {@link buildSpaceIdFilter}).
 *
 * SECURITY: the id binding narrows the read to documents the caller named, but it
 * is not an authorization gate on its own. Where no action document gate runs
 * (see {@link ACTION_DOC_GATED_FACTORY_QUERY_TYPES}), isolation rests on the clause
 * itself matching only documents whose surviving provenance already names the
 * active space. Do not add a query type here unless its builder unconditionally
 * filters on an `action_id`.
 *
 * Types not allowlisted for `action_data.space_id`: `actions` enumerates across
 * actions; `exportResults` is not unconditionally id-bound in the factory
 * (opaque `baseFilter` KQL), so live-query export reaches unstamped documents
 * only through the action document gate, and stays on the top-level `space_id`
 * filter where that gate does not run; `actionDetails` is an id-bound lookup of
 * Kibana-written action metadata on `ACTIONS_INDEX`, not agent `action_data`.
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

/**
 * Factory query types whose live-query reads are authorized against the
 * Kibana-written action document on `ACTIONS_INDEX` rather than by filtering
 * agent-written documents on `space_id` (Defend's request-then-responses split).
 *
 * SECURITY: the provider looks up the request's `actionId` (parent or
 * `queries.action_id`) in the active space itself, and only a hit omits the
 * data-document space filter. A miss is a 404. Each builder here MUST filter on
 * that `actionId` whenever it is set, or the skip would widen the read beyond the
 * verified id. Schedule-bound requests are never gated: pack executions have no
 * action document and keep the space filter.
 */
export const ACTION_DOC_GATED_FACTORY_QUERY_TYPES: readonly FactoryQueryTypes[] = [
  OsqueryQueries.results,
  OsqueryQueries.actionResults,
  OsqueryQueries.exportResults,
];

const getActionDocGatedActionId = <T extends FactoryQueryTypes>(
  request: StrategyRequestType<T>
): string | undefined => {
  if (
    request.factoryQueryType == null ||
    !ACTION_DOC_GATED_FACTORY_QUERY_TYPES.includes(request.factoryQueryType) ||
    isScheduleBoundRequest(request)
  ) {
    return undefined;
  }

  return 'actionId' in request && typeof request.actionId === 'string' && request.actionId !== ''
    ? request.actionId
    : undefined;
};

export const osquerySearchStrategyProvider = <T extends FactoryQueryTypes>(
  data: PluginStart,
  esClient: CoreStart['elasticsearch']['client'],
  osqueryContext: Pick<OsqueryAppContext, 'security' | 'service'>
): ISearchStrategy<StrategyRequestType<T>, StrategyResponseType<T>> => {
  let es: typeof data.search.searchAsInternalUser;

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
          });
        }),
        mergeMap((probed) => {
          const gatedActionId = getActionDocGatedActionId(request);

          // Without an osquery actions index, live actions exist only on
          // `.fleet-actions`, which the gate never reads. Those reads keep the
          // data-document space filter instead of failing.
          if (gatedActionId == null || !probed.actionsIndexExists) {
            return of({ ...probed, skipSpaceFilter: false });
          }

          return from(
            findOsqueryActionMetadata({
              esClient: esClient.asInternalUser,
              spaceId: probed.activeSpace?.id ?? DEFAULT_SPACE_ID,
              actionId: gatedActionId,
              actionsIndexExists: probed.actionsIndexExists,
              request: deps.request,
            })
          ).pipe(
            map((found) => {
              if (!found) {
                throw new KbnServerError('Action not found', 404);
              }

              return { ...probed, skipSpaceFilter: true };
            })
          );
        }),
        mergeMap(
          ({
            actionsIndexExists,
            newDataStreamIndexExists,
            ccsEnabled,
            activeSpace,
            skipSpaceFilter,
          }) => {
            // Single decision for hit-level enforceSpaceScope and for any
            // global-agg builder that cannot inherit the top-level query.
            const matchActionDataSpaceId =
              !skipSpaceFilter &&
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
              skipSpaceFilter,
            } as OsqueryFactoryRequest<T>;

            const scopeToSpace = (searchDsl: ISearchRequestParams) =>
              skipSpaceFilter
                ? searchDsl
                : enforceSpaceScope(searchDsl, spaceId, spaceScopeOptions);

            const dsl = scopeToSpace(queryFactory.buildDsl(factoryRequest));

            // Select internal client for all osquery indices that require it.
            // The 'osquery_manager' substring matches both local and CCS-prefixed patterns
            // (e.g. '*:logs-osquery_manager.action...').
            const indices = Array.isArray(dsl.index) ? dsl.index : dsl.index ? [dsl.index] : [];
            es = indices.some(
              (index) => index.includes('fleet') || index.includes('osquery_manager')
            )
              ? data.search.searchAsInternalUser
              : data.search.getSearchStrategy(ENHANCED_ES_SEARCH_STRATEGY);

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
                  (newDataStreamIndexExists || ccsEnabled)
                ) {
                  const dataStreamDsl = scopeToSpace(
                    queryFactory.buildDsl({
                      ...factoryRequest,
                      useNewDataStream: true,
                    } as OsqueryFactoryRequest<T>)
                  );

                  return from(
                    es.search(
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
      if (es?.cancel) {
        return es.cancel(id, options, deps);
      }
    },
  };
};
