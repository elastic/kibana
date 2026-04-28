/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { omit } from 'lodash';
import type { Observable } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import type { FindLiveQueryRequestQuerySchema } from '../../../common/api';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import { API_VERSIONS } from '../../../common/constants';
import { PLUGIN_ID } from '../../../common';

import type {
  ActionDetails,
  ActionsRequestOptions,
  ActionsStrategyResponse,
  Direction,
} from '../../../common/search_strategy';
import { OsqueryQueries } from '../../../common/search_strategy';
import { findLiveQueryRequestQuerySchema } from '../../../common/api';
import { generateTablePaginationOptions } from '../../../common/utils/build_query';
import { getResultCountsForActions } from '../../lib/get_result_counts_for_actions';
import { hasConnectedRemoteClusters } from '../../utils/ccs_utils';
import { buildPackResultCounts, buildSingleQueryResultCounts } from '../../lib/build_result_counts';
import { findLiveQueryResponseSchema } from './response_schemas';

export const findLiveQueryRoute = (
  router: IRouter<DataRequestHandlerContext>,
  osqueryContext: OsqueryAppContext
) => {
  router.versioned
    .get({
      access: 'public',
      path: '/api/osquery/live_queries',
      security: {
        authz: {
          requiredPrivileges: [`${PLUGIN_ID}-readLiveQueries`],
        },
      },
      options: { tags: ['api'] },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            query: buildRouteValidation<
              typeof findLiveQueryRequestQuerySchema,
              FindLiveQueryRequestQuerySchema
            >(findLiveQueryRequestQuerySchema),
          },
          response: {
            200: {
              body: () => findLiveQueryResponseSchema,
            },
          },
        },
      },
      async (context, request, response) => {
        const abortSignal = getRequestAbortedSignal(request.events.aborted$);

        try {
          const spaceId = osqueryContext?.service?.getActiveSpace
            ? (await osqueryContext.service.getActiveSpace(request))?.id || DEFAULT_SPACE_ID
            : DEFAULT_SPACE_ID;

          const search = await context.search;
          const res = await lastValueFrom(
            search.search<ActionsRequestOptions, ActionsStrategyResponse>(
              {
                factoryQueryType: OsqueryQueries.actions,
                kuery: request.query.kuery,
                pagination: generateTablePaginationOptions(
                  request.query.page ?? 0,
                  request.query.pageSize ?? 100
                ),
                sort: {
                  direction: (request.query.sortOrder ?? 'desc') as Direction,
                  field: request.query.sort ?? 'created_at',
                },
                spaceId,
              },
              { abortSignal, strategy: 'osquerySearchStrategy' }
            )
          );

          let items = res.edges;

          if (
            osqueryContext.experimentalFeatures.resultCountsEnabled &&
            request.query.withResultCounts &&
            items.length > 0
          ) {
            try {
              const [coreStartServices] = await osqueryContext.getStartServices();
              const esClient = coreStartServices.elasticsearch.client.asInternalUser;
              const ccsEnabled = await hasConnectedRemoteClusters(esClient);

              const allActionIds: string[] = [];
              for (const item of items) {
                const action = item._source as ActionDetails | undefined;
                if (action?.queries) {
                  for (const query of action.queries) {
                    if (query.action_id) {
                      allActionIds.push(query.action_id);
                    }
                  }
                }
              }

              const resultCountsMap = await getResultCountsForActions(
                esClient,
                allActionIds,
                spaceId,
                ccsEnabled
              );

              items = items.map((item) => {
                const action = item._source as ActionDetails | undefined;
                if (!action?.queries) return item;

                const actionQueryIds = action.queries
                  .map((query) => query.action_id)
                  .filter((id): id is string => !!id);

                const resultCounts = action.pack_id
                  ? buildPackResultCounts(actionQueryIds, resultCountsMap)
                  : buildSingleQueryResultCounts(actionQueryIds[0], resultCountsMap);

                return {
                  ...item,
                  _source: { ...action, result_counts: resultCounts },
                };
              });
            } catch (err) {
              const logger = osqueryContext.logFactory.get('findLiveQuery');
              logger.warn(`Failed to enrich result_counts for live query listing: ${String(err)}`);
            }
          }

          return response.ok({
            body: {
              data: {
                ...omit(res, 'edges'),
                items,
              },
            },
          });
        } catch (e) {
          return response.customError({
            statusCode: e.statusCode ?? 500,
            body: {
              message: e.message,
            },
          });
        }
      }
    );
};

function getRequestAbortedSignal(aborted$: Observable<void>): AbortSignal {
  const controller = new AbortController();
  aborted$.subscribe(() => controller.abort());

  return controller.signal;
}
