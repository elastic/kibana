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
import { ACTION_RESPONSES_DATA_STREAM_INDEX, ACTIONS_INDEX } from '../../../common/constants';
import type {
  FactoryQueryTypes,
  StrategyResponseType,
  StrategyRequestType,
} from '../../../common/search_strategy/osquery';
import { OsqueryQueries } from '../../../common/search_strategy/osquery';
import { osqueryFactory } from './factory';
import type { OsqueryFactory } from './factory/types';

export const osquerySearchStrategyProvider = <T extends FactoryQueryTypes>(
  data: PluginStart,
  esClient: CoreStart['elasticsearch']['client']
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
      }).pipe(
        mergeMap(({ actionsIndexExists, newDataStreamIndexExists }) => {
          const strictRequest = {
            factoryQueryType: request.factoryQueryType,
            kuery: request.kuery,
            ...('pagination' in request ? { pagination: request.pagination } : {}),
            ...('sort' in request ? { sort: request.sort } : {}),
            ...('actionId' in request ? { actionId: request.actionId } : {}),
            ...('startDate' in request ? { startDate: request.startDate } : {}),
            ...('agentId' in request ? { agentId: request.agentId } : {}),
          } as StrategyRequestType<T>;

          const dsl = queryFactory.buildDsl({
            ...strictRequest,
            componentTemplateExists: actionsIndexExists,
          } as StrategyRequestType<T>);
          // use internal user for searching .fleet* indices
          es =
            dsl.index?.includes('fleet') || dsl.index?.includes('logs-osquery_manager.action')
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
              if (
                request.factoryQueryType === OsqueryQueries.actionResults &&
                newDataStreamIndexExists
              ) {
                const dataStreamDsl = queryFactory.buildDsl({
                  ...strictRequest,
                  componentTemplateExists: actionsIndexExists,
                  useNewDataStream: true,
                } as StrategyRequestType<T>);

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
