/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { map } from 'lodash';
import { lastValueFrom, zip } from 'rxjs';
import type { Observable } from 'rxjs';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type {
  GetLiveQueryResultsRequestQuerySchema,
  GetLiveQueryResultsRequestParamsSchema,
} from '../../../common/api';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import {
  API_VERSIONS,
  OSQUERY_INTEGRATION_NAME,
  MAX_OFFSET_RESULTS,
  PIT_KEEP_ALIVE,
  MAX_PIT_OFFSET,
  MAX_PIT_ID_LENGTH,
  MAX_SEARCH_AFTER_SIZE,
  MAX_SORT_FIELDS,
} from '../../../common/constants';
import { PLUGIN_ID } from '../../../common';
import type {
  ActionDetailsRequestOptions,
  ActionDetailsStrategyResponse,
  ResultsRequestOptions,
  ResultsStrategyResponse,
} from '../../../common/search_strategy';
import { Direction, OsqueryQueries } from '../../../common/search_strategy';
import { generateTablePaginationOptions } from '../../../common/utils/build_query';
import { getActionResponses } from './utils';
import {
  getLiveQueryResultsRequestParamsSchema,
  getLiveQueryResultsRequestQuerySchema,
} from '../../../common/api';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { buildIndexNameWithNamespace } from '../../utils/build_index_name_with_namespace';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import { executePitSearch } from '../../lib/pit_search';

/**
 * Type guard to validate that a parsed JSON value is a valid SortResults array.
 * SortResults is used for Elasticsearch search_after pagination and must contain
 * only primitive values (string, number, boolean, or null).
 *
 * @param value - The parsed JSON value to validate
 * @returns true if value is a valid SortResults array
 *
 * @remarks
 * Empty arrays are considered valid SortResults - this handles the edge case where
 * a document has no sort values. ES will simply ignore an empty search_after array.
 */
function isSortResults(value: unknown): value is SortResults {
  if (!Array.isArray(value)) {
    return false;
  }

  // Empty arrays are valid - ES ignores empty search_after values
  // SortResults items must be primitives: string, number, boolean, or null
  return value.every((item) => {
    const itemType = typeof item;

    return (
      item === null || itemType === 'string' || itemType === 'number' || itemType === 'boolean'
    );
  });
}

export const getLiveQueryResultsRoute = (
  router: IRouter<DataRequestHandlerContext>,
  osqueryContext: OsqueryAppContext
) => {
  router.versioned
    .get({
      access: 'public',
      path: '/api/osquery/live_queries/{id}/results/{actionId}',
      security: {
        authz: {
          requiredPrivileges: [`${PLUGIN_ID}-readLiveQueries`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            query: buildRouteValidation<
              typeof getLiveQueryResultsRequestQuerySchema,
              GetLiveQueryResultsRequestQuerySchema
            >(getLiveQueryResultsRequestQuerySchema),
            params: buildRouteValidation<
              typeof getLiveQueryResultsRequestParamsSchema,
              GetLiveQueryResultsRequestParamsSchema
            >(getLiveQueryResultsRequestParamsSchema),
          },
        },
      },
      async (context, request, response) => {
        const abortSignal = getRequestAbortedSignal(request.events.aborted$);

        try {
          const spaceId = osqueryContext?.service?.getActiveSpace
            ? (await osqueryContext.service.getActiveSpace(request))?.id || DEFAULT_SPACE_ID
            : DEFAULT_SPACE_ID;

          let integrationNamespaces: Record<string, string[]> = {};
          let spaceAwareIndexPatterns: string[] = [];

          const logger = osqueryContext.logFactory.get('get_live_query_results');

          if (osqueryContext?.service?.getIntegrationNamespaces) {
            const spaceScopedClient = await createInternalSavedObjectsClientForSpaceId(
              osqueryContext,
              request
            );
            integrationNamespaces = await osqueryContext.service.getIntegrationNamespaces(
              [OSQUERY_INTEGRATION_NAME],
              spaceScopedClient,
              logger
            );

            logger.debug(
              `Retrieved integration namespaces: ${JSON.stringify(integrationNamespaces)}`
            );

            const baseIndexPatterns = [`logs-${OSQUERY_INTEGRATION_NAME}.result*`];

            spaceAwareIndexPatterns = baseIndexPatterns.flatMap((pattern) => {
              const osqueryNamespaces = integrationNamespaces[OSQUERY_INTEGRATION_NAME];

              if (osqueryNamespaces && osqueryNamespaces.length > 0) {
                return osqueryNamespaces.map((namespace) =>
                  buildIndexNameWithNamespace(pattern, namespace)
                );
              }

              return [pattern];
            });

            logger.debug(
              `Built space-aware index patterns: ${JSON.stringify(spaceAwareIndexPatterns)}`
            );
          }

          const search = await context.search;
          const { actionDetails } = await lastValueFrom(
            search.search<ActionDetailsRequestOptions, ActionDetailsStrategyResponse>(
              {
                actionId: request.params.id,
                kuery: request.query.kuery,
                factoryQueryType: OsqueryQueries.actionDetails,
                spaceId,
              },
              { abortSignal, strategy: 'osquerySearchStrategy' }
            )
          );

          if (!actionDetails) {
            return response.notFound({ body: { message: 'Action not found' } });
          }

          const queries = actionDetails?._source?.queries;

          const osqueryNamespaces = integrationNamespaces[OSQUERY_INTEGRATION_NAME];
          const namespacesOrUndefined =
            osqueryNamespaces && osqueryNamespaces.length > 0 ? osqueryNamespaces : undefined;

          await lastValueFrom(
            zip(
              ...map(queries, (query) =>
                getActionResponses(
                  search,
                  query.action_id,
                  query.agents?.length ?? 0,
                  namespacesOrUndefined
                )
              )
            )
          );

          const page = request.query.page ?? 0;
          const pageSize = request.query.pageSize ?? 100;
          const providedPitId = request.query.pitId;
          const providedSearchAfter = request.query.searchAfter;

          // Validate pitId length to prevent abuse
          if (providedPitId && providedPitId.length > MAX_PIT_ID_LENGTH) {
            return response.badRequest({
              body: { message: 'pitId parameter exceeds maximum allowed size' },
            });
          }

          let parsedSearchAfter: SortResults | undefined;
          if (providedSearchAfter) {
            // Validate searchAfter size to prevent abuse
            if (providedSearchAfter.length > MAX_SEARCH_AFTER_SIZE) {
              return response.badRequest({
                body: { message: 'searchAfter parameter exceeds maximum allowed size' },
              });
            }

            try {
              const parsed = JSON.parse(providedSearchAfter);

              if (!isSortResults(parsed)) {
                logger.error('Invalid searchAfter format: must be array of primitives');

                return response.badRequest({
                  body: { message: 'Invalid searchAfter parameter format' },
                });
              }

              // Additional validation: limit array length
              if (parsed.length > MAX_SORT_FIELDS) {
                return response.badRequest({
                  body: { message: 'searchAfter array exceeds maximum allowed length' },
                });
              }

              parsedSearchAfter = parsed;
            } catch (e) {
              return response.badRequest({
                body: { message: `Invalid searchAfter parameter: ${e.message}` },
              });
            }
          }

          const esClient = (await context.core).elasticsearch.client.asCurrentUser;
          const offset = page * pageSize;

          // Validate offset doesn't exceed maximum to prevent excessive batch fetching
          if (offset >= MAX_PIT_OFFSET) {
            return response.badRequest({
              body: {
                message: `Requested offset (${offset}) exceeds maximum allowed (${MAX_PIT_OFFSET}). Use filters to narrow results.`,
              },
            });
          }

          const needsPitPagination = offset >= MAX_OFFSET_RESULTS;

          // Only use provided PIT if searchAfter is also provided (both are required for PIT-based pagination)
          // If pitId is provided without searchAfter, ignore it and start fresh
          let pitId = providedPitId && parsedSearchAfter ? providedPitId : undefined;
          let searchAfterValues = parsedSearchAfter;

          if (needsPitPagination && !pitId) {
            const baseIndex = `logs-${OSQUERY_INTEGRATION_NAME}.result*`;
            const pitIndex =
              namespacesOrUndefined && namespacesOrUndefined.length > 0
                ? namespacesOrUndefined
                    .map((namespace) => buildIndexNameWithNamespace(baseIndex, namespace))
                    .join(',')
                : baseIndex;

            let newlyOpenedPitId: string | undefined;
            try {
              const pitResponse = await esClient.openPointInTime({
                index: pitIndex,
                keep_alive: PIT_KEEP_ALIVE,
              });
              pitId = pitResponse.id;
              newlyOpenedPitId = pitId;

              if (!parsedSearchAfter) {
                const batchSize = 10000;
                let currentSearchAfter: SortResults | undefined;
                let fetchedCount = 0;
                const targetOffset = page * pageSize;

                while (fetchedCount < targetOffset) {
                  const remaining = targetOffset - fetchedCount;
                  const fetchSize = Math.min(batchSize, remaining);

                  const batchRes = await executePitSearch({
                    esClient,
                    pitId,
                    searchAfter: currentSearchAfter,
                    size: fetchSize,
                    actionId: request.params.actionId,
                    kuery: request.query.kuery,
                    startDate: request.query.startDate,
                    sort: [
                      {
                        field: request.query.sort ?? '@timestamp',
                        direction: (request.query.sortOrder as Direction) ?? Direction.desc,
                      },
                    ],
                    integrationNamespaces: namespacesOrUndefined,
                  });

                  if (!batchRes.hits.length) {
                    break;
                  }

                  if (batchRes.pitId) {
                    pitId = batchRes.pitId;
                    newlyOpenedPitId = pitId;
                  }

                  currentSearchAfter = batchRes.searchAfter;
                  fetchedCount += batchRes.hits.length;

                  if (batchRes.hits.length < fetchSize) {
                    break;
                  }
                }

                searchAfterValues = currentSearchAfter;
              }
            } catch (e) {
              // Clean up PIT if we opened one before the error
              if (newlyOpenedPitId) {
                try {
                  await esClient.closePointInTime({ id: newlyOpenedPitId });
                } catch (closeErr) {
                  logger.warn(`Failed to close PIT after error: ${closeErr.message}`);
                }
              }

              logger.error(`Failed to setup PIT pagination: ${e.message}`);

              return response.customError({
                statusCode: 500,
                body: {
                  message: `Failed to initialize deep pagination. Please try again. Error: ${e.message}`,
                },
              });
            }
          }

          const usePitMode = needsPitPagination && pitId && searchAfterValues;

          let res: ResultsStrategyResponse;

          if (usePitMode && pitId) {
            const pitRes = await executePitSearch({
              esClient,
              pitId,
              searchAfter: searchAfterValues,
              size: pageSize,
              actionId: request.params.actionId,
              kuery: request.query.kuery,
              startDate: request.query.startDate,
              sort: [
                {
                  field: request.query.sort ?? '@timestamp',
                  direction: (request.query.sortOrder as Direction) ?? Direction.desc,
                },
              ],
              integrationNamespaces: namespacesOrUndefined,
            });

            const responsePitId = pitRes.pitId ?? pitId;

            res = {
              rawResponse: { hits: { hits: pitRes.hits, total: pitRes.total } },
              isPartial: false,
              isRunning: false,
              total: pitRes.total,
              loaded: pitRes.hits.length,
              edges: pitRes.hits,
              pitId: responsePitId,
              searchAfter: pitRes.searchAfter,
              hasMore: pitRes.hits.length === pageSize,
            } as ResultsStrategyResponse;
          } else {
            res = await lastValueFrom(
              search.search<ResultsRequestOptions, ResultsStrategyResponse>(
                {
                  actionId: request.params.actionId,
                  factoryQueryType: OsqueryQueries.results,
                  kuery: request.query.kuery,
                  startDate: request.query.startDate,
                  pagination: generateTablePaginationOptions(page, pageSize),
                  sort: [
                    {
                      direction: request.query.sortOrder ?? Direction.desc,
                      field: request.query.sort ?? '@timestamp',
                    },
                  ],
                  integrationNamespaces: namespacesOrUndefined,
                },
                { abortSignal, strategy: 'osquerySearchStrategy' }
              )
            );
          }

          return response.ok({
            body: {
              data: {
                ...res,
                pitId: usePitMode ? res.pitId : undefined,
                searchAfter: res.searchAfter ? JSON.stringify(res.searchAfter) : undefined,
                hasMore: res.hasMore,
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
