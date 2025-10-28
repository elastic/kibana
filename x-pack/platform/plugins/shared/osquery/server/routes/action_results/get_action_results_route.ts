/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom } from 'rxjs';
import type { IRouter } from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import {
  getActionResultsRequestParamsSchema,
  getActionResultsRequestQuerySchema,
} from '../../../common/api/action_results/get_action_results_route';
import type {
  GetActionResultsRequestParamsSchema,
  GetActionResultsRequestQuerySchema,
} from '../../../common/api/action_results/get_action_results_route';
import { API_VERSIONS } from '../../../common/constants';
import { PLUGIN_ID, OSQUERY_INTEGRATION_NAME } from '../../../common';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { Direction, OsqueryQueries } from '../../../common/search_strategy';
import { TOO_MANY_AGENT_IDS } from '../../../common/translations/errors';
import type {
  ActionResultsRequestOptions,
  ActionResultsStrategyResponse,
  ActionDetailsRequestOptions,
  ActionDetailsStrategyResponse,
} from '../../../common/search_strategy';
import { generateTablePaginationOptions } from '../../../common/utils/build_query';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import { getAgentIdFromFields } from '../../../common/utils/agent_fields';

export const getActionResultsRoute = (
  router: IRouter<DataRequestHandlerContext>,
  osqueryContext: OsqueryAppContext
) => {
  router.versioned
    .get({
      access: 'public',
      path: '/api/osquery/action_results/{actionId}',
      security: {
        authz: {
          requiredPrivileges: [`${PLUGIN_ID}-read`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            query: buildRouteValidation<
              typeof getActionResultsRequestQuerySchema,
              GetActionResultsRequestQuerySchema
            >(getActionResultsRequestQuerySchema),
            params: buildRouteValidation<
              typeof getActionResultsRequestParamsSchema,
              GetActionResultsRequestParamsSchema
            >(getActionResultsRequestParamsSchema),
          },
        },
      },
      async (context, request, response) => {
        const abortSignal = getRequestAbortedSignal(request.events.aborted$);

        try {
          let integrationNamespaces: Record<string, string[]> = {};

          const logger = osqueryContext.logFactory.get('get_action_results');

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
          }

          const search = await context.search;

          // Parse agentIds from query parameter if provided (for external API consumers)
          const requestedAgentIds = request.query.agentIds
            ? request.query.agentIds.split(',').map((id) => id.trim())
            : undefined;

          if (requestedAgentIds && requestedAgentIds.length > 100) {
            return response.badRequest({
              body: TOO_MANY_AGENT_IDS,
            });
          }

          const page = request.query.page ?? 0;
          const pageSize = request.query.pageSize ?? 100;
          const startIndex = page * pageSize;

          let agentIds: string[];
          let agentIdsForCurrentPage: string[];
          let totalAgentCount: number = 0;

          console.log({ requestedAgentIds });
          if (requestedAgentIds) {
            // Client has full agent list and handles pagination UI.
            // Server only returns results for the provided agents (current page).
            agentIdsForCurrentPage = requestedAgentIds;
            totalAgentCount = requestedAgentIds.length;

            logger.info(
              `Using client-provided agent IDs for action ${request.params.actionId} (fallback path)`,
              {
                reason: 'action_document_unavailable',
                currentPageSize: requestedAgentIds.length,
                page,
              }
            );
          } else {
            // Primary path: Fetch action details from action document (preferred)
            // This is the main code path for internal UI - fetches agent list from Elasticsearch
            try {
              logger.debug(
                `Fetching action document for ${request.params.actionId} (primary path)`
              );

              const actionDetailsResponse = await lastValueFrom(
                search.search<ActionDetailsRequestOptions, ActionDetailsStrategyResponse>(
                  {
                    actionId: request.params.actionId,
                    factoryQueryType: OsqueryQueries.actionDetails,
                    spaceId:
                      (await context.core).savedObjects.client.getCurrentNamespace() || 'default',
                  },
                  { abortSignal, strategy: 'osquerySearchStrategy' }
                )
              );

              const { actionDetails } = actionDetailsResponse;

              // The action details query uses fields API, so data is in fields, not _source
              // Extract data from fields (which returns arrays) or fallback to _source
              const actionData = actionDetails?._source || {
                agents: actionDetails?.fields?.agents?.[0],
                queries: actionDetails?.fields?.queries?.[0],
              };

              console.log({ actionData });
              console.log({ matchingQuery });

              // Extract agent IDs from action document
              if (actionData?.agents || actionData?.queries) {
                // Check if actionId is a child query action_id
                const queries = actionData.queries || [];
                const matchingQuery = queries.find((q) => q.action_id === request.params.actionId);

                // Use query-specific agents if found, otherwise use parent action's agents
                agentIds = matchingQuery?.agents || actionData.agents || [];

                console.log({ agentIds });
                totalAgentCount = agentIds.length;

                if (agentIds.length > 100000) {
                  logger.warn(`Action ${request.params.actionId} has ${agentIds.length} agents`);
                }
              } else {
                logger.warn(
                  `Action details for ${request.params.actionId} has no agents data in _source or fields, setting agentIds to empty array`
                );
                agentIds = [];
                totalAgentCount = 0;
              }
            } catch (fetchError) {
              logger.error(
                `Failed to fetch action details for actionId ${request.params.actionId}: ${fetchError}`
              );

              return response.customError({
                statusCode: 404,
                body: {
                  message: `Action with ID "${request.params.actionId}" not found or inaccessible. Please verify the action exists and you have the necessary permissions.`,
                },
              });
            }

            agentIdsForCurrentPage = agentIds.slice(startIndex, endIndex);
          }

          const res = await lastValueFrom(
            search.search<ActionResultsRequestOptions, ActionResultsStrategyResponse>(
              {
                actionId: request.params.actionId,
                factoryQueryType: OsqueryQueries.actionResults,
                agentIds: agentIdsForCurrentPage,
                kuery: request.query.kuery,
                startDate: request.query.startDate,
                pagination: generateTablePaginationOptions(page, pageSize),
                sort: {
                  direction: request.query.sortOrder ?? Direction.desc,
                  field: request.query.sort ?? '@timestamp',
                },
                integrationNamespaces: integrationNamespaces[OSQUERY_INTEGRATION_NAME]?.length
                  ? integrationNamespaces[OSQUERY_INTEGRATION_NAME]
                  : undefined,
              },
              { abortSignal, strategy: 'osquerySearchStrategy' }
            )
          );

          const responseAgg = res.rawResponse?.aggregations?.aggs.responses_by_action_id;
          const totalResponded = responseAgg?.doc_count ?? 0;
          const totalRowCount = responseAgg?.rows_count?.value ?? 0;
          const aggsBuckets = responseAgg?.responses.buckets;

          const aggregations = {
            totalRowCount,
            totalResponded,
            successful: aggsBuckets?.find((bucket) => bucket.key === 'success')?.doc_count ?? 0,
            failed: aggsBuckets?.find((bucket) => bucket.key === 'error')?.doc_count ?? 0,
            pending: Math.max(0, totalAgentCount - totalResponded),
          };

          let processedEdges = res.edges;

          // Create placeholders for agents that haven't responded yet
          // This works for both internal UI (action document) and client-provided agents
          if (agentIdsForCurrentPage.length > 0) {
            // Extract agent IDs that already have responses
            const respondedAgentIds = new Set(
              res.edges
                .map((edge) => getAgentIdFromFields(edge.fields))
                .filter((id): id is string => id !== undefined)
            );

            // Create placeholder edges ONLY for agents that haven't responded
            const placeholderEdges = agentIdsForCurrentPage
              .filter((agentId) => agentId && !respondedAgentIds.has(agentId))
              .map((agentId) => ({
                _index: '.logs-osquery_manager.action.responses-default',
                _id: `placeholder-${agentId}`,
                _source: {},
                fields: { agent_id: [agentId] },
              }));

            // Merge real results with placeholders (no deduplication needed since placeholders are non-overlapping)
            processedEdges = [...res.edges, ...placeholderEdges] as typeof res.edges;
          }

          const totalPages = Math.ceil(totalAgentCount / pageSize);

          return response.ok({
            body: {
              edges: processedEdges,
              total: processedEdges.length,
              currentPage: page,
              pageSize,
              totalPages,
              aggregations,
              inspect: res.inspect,
            },
          });
        } catch (err) {
          const error = err as Error;

          return response.customError({
            statusCode: 500,
            body: { message: error.message },
          });
        }
      }
    );
};
