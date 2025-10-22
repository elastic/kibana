/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom } from 'rxjs';
import { reverse, uniqBy, flatten } from 'lodash';
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

          let agentIds: string[];
          let agentIdsKuery: string | undefined;

          if (requestedAgentIds) {
            // Use provided agentIds for filtering (external API consumers)
            agentIds = requestedAgentIds;

            // Build kuery to filter results to requested agents
            agentIdsKuery = requestedAgentIds.map((id) => `agent.id: "${id}"`).join(' OR ');
          } else {
            // Fetch action details to get agent IDs (internal UI usage)
            const { actionDetails } = await lastValueFrom(
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

            // Extract agent IDs from action document
            if (actionDetails?._source) {
              // Check if actionId is a child query action_id
              const queries = actionDetails._source.queries || [];
              const matchingQuery = queries.find((q) => q.action_id === request.params.actionId);

              // Use query-specific agents if found, otherwise use parent action's agents
              agentIds = matchingQuery?.agents || actionDetails._source.agents || [];
            } else {
              agentIds = [];
            }
          }

          // Combine agentIds filtering with user-provided kuery
          let combinedKuery = request.query.kuery;
          if (agentIdsKuery) {
            combinedKuery = combinedKuery
              ? `(${agentIdsKuery}) AND (${combinedKuery})`
              : agentIdsKuery;
          }

          const res = await lastValueFrom(
            search.search<ActionResultsRequestOptions, ActionResultsStrategyResponse>(
              {
                actionId: request.params.actionId,
                factoryQueryType: OsqueryQueries.actionResults,
                kuery: combinedKuery,
                startDate: request.query.startDate,
                pagination: generateTablePaginationOptions(
                  request.query.page ?? 0,
                  request.query.pageSize ?? 100
                ),
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

          const totalResponded =
            res.rawResponse?.aggregations?.aggs.responses_by_action_id?.doc_count ?? 0;
          const totalRowCount =
            res.rawResponse?.aggregations?.aggs.responses_by_action_id?.rows_count?.value ?? 0;
          const aggsBuckets =
            res.rawResponse?.aggregations?.aggs.responses_by_action_id?.responses.buckets;

          const aggregations = {
            totalRowCount,
            totalResponded,
            successful: aggsBuckets?.find((bucket) => bucket.key === 'success')?.doc_count ?? 0,
            failed: aggsBuckets?.find((bucket) => bucket.key === 'error')?.doc_count ?? 0,
            pending: Math.max(0, agentIds.length - totalResponded),
          };

          let processedEdges = res.edges;

          // Only process edges for internal UI (when agentIds NOT provided in request)
          if (!requestedAgentIds && agentIds.length > 0) {
            // Create placeholder edges for ALL agents
            const placeholderEdges = agentIds.map((agentId) => ({
              _index: '.logs-osquery_manager.action.responses-default',
              _id: `placeholder-${agentId}`,
              _source: {},
              fields: { agent_id: [agentId] },
            }));

            // Merge real results with placeholders, keeping real results when duplicates exist
            // reverse() ensures proper ordering, uniqBy keeps first occurrence (real data)
            processedEdges = reverse(
              uniqBy(flatten([res.edges, placeholderEdges]), 'fields.agent_id[0]')
            ) as typeof res.edges;
          }

          return response.ok({
            body: {
              edges: processedEdges,
              total: processedEdges.length,
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
