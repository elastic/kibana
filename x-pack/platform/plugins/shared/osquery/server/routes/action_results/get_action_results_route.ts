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
import { API_VERSIONS, ACTION_RESPONSES_INDEX } from '../../../common/constants';
import { PLUGIN_ID, OSQUERY_INTEGRATION_NAME } from '../../../common';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { Direction, OsqueryQueries } from '../../../common/search_strategy';
import type {
  ActionResultsRequestOptions,
  ActionResultsStrategyResponse,
} from '../../../common/search_strategy';
import { generateTablePaginationOptions } from '../../../common/utils/build_query';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import { isActionExpired, adjustAggregationsForExpiration } from '../../utils/aggregations';

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

          // Parse agentIds from query parameter
          const agentIds = request.query.agentIds
            ? request.query.agentIds.split(',').map((id) => id.trim())
            : [];

          const page = request.query.page ?? 0;
          const pageSize = request.query.pageSize ?? 100;

          const totalAgentCount = request.query.totalAgents ?? agentIds.length;

          const res = await lastValueFrom(
            search.search<ActionResultsRequestOptions, ActionResultsStrategyResponse>(
              {
                actionId: request.params.actionId,
                factoryQueryType: OsqueryQueries.actionResults,
                agentIds,
                kuery: request.query.kuery,
                startDate: request.query.startDate,
                // Client already sliced agents for current page, so fetch all of them (no pagination)
                pagination:
                  agentIds.length > 0
                    ? generateTablePaginationOptions(0, agentIds.length)
                    : generateTablePaginationOptions(page, pageSize),
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

          const responseAgg = res.rawResponse?.aggregations?.aggs.responses_by_action_id as
            | {
                doc_count: number;
                rows_count?: { value: number };
                responses: { buckets: Array<{ key: string; doc_count: number }> };
                unique_agent_ids?: { buckets: Array<{ key: string; doc_count: number }> };
              }
            | undefined;

          const aggsBuckets = responseAgg?.responses.buckets;
          const isExpired = isActionExpired(request.query.expiration);
          const hybridEnabled = osqueryContext.experimentalFeatures.hybridActionResults;

          let aggregations;
          let processedEdges;

          if (hybridEnabled) {
            // HYBRID MODE: Combine Fleet responses with results index data
            // Use Fleet's rows_count as primary source (canonical), fall back to results index
            const fleetRowCount = responseAgg?.rows_count?.value ?? 0;
            const resultsTotalDocs =
              'resultsTotalDocs' in res ? (res.resultsTotalDocs as number) : 0;
            // Prefer Fleet row count if available, as results index may have duplicates
            const totalRowCount = fleetRowCount > 0 ? fleetRowCount : resultsTotalDocs;

            // Extract Fleet responded agent IDs from aggregation (supports 15k+ agents)
            const fleetAgentBuckets = responseAgg?.unique_agent_ids?.buckets ?? [];
            const respondedAgentIds = new Set(fleetAgentBuckets.map((b) => b.key));

            // Build agent-to-rowCount map from results aggregation
            const agentRowCounts = new Map<string, number>();
            if ('resultsAgentBuckets' in res && Array.isArray(res.resultsAgentBuckets)) {
              (res.resultsAgentBuckets as Array<{ key: string; doc_count: number }>).forEach(
                (bucket) => {
                  agentRowCounts.set(bucket.key, bucket.doc_count);
                }
              );
            }

            // Calculate inferred successful: agents with results but no Fleet response
            const inferredSuccessfulCount = Array.from(agentRowCounts.keys()).filter(
              (agentId) => !respondedAgentIds.has(agentId)
            ).length;

            // Calculate aggregations with hybrid data
            const fleetSuccessful =
              aggsBuckets?.find((bucket) => bucket.key === 'success')?.doc_count ?? 0;
            const fleetFailed =
              aggsBuckets?.find((bucket) => bucket.key === 'error')?.doc_count ?? 0;
            const totalResponded = respondedAgentIds.size + inferredSuccessfulCount;

            const rawAggregations = {
              totalRowCount,
              totalResponded,
              successful: fleetSuccessful + inferredSuccessfulCount,
              failed: fleetFailed,
              pending: Math.max(0, totalAgentCount - totalResponded),
            };

            aggregations = adjustAggregationsForExpiration(rawAggregations, isExpired);

            // Enrich real response edges with status and row_count
            // For Fleet responses, use canonical row count from action_response.osquery.count
            const enrichedRealEdges = res.edges.map((edge) => {
              const agentId = edge.fields?.agent_id?.[0];
              const hasError = edge.fields?.['error.keyword'] || edge.fields?.error;
              const hasCompleted = edge.fields?.completed_at;

              let status: 'success' | 'error' | 'pending' | 'expired';
              if (hasError) {
                status = 'error';
              } else if (hasCompleted) {
                status = 'success';
              } else if (isExpired) {
                status = 'expired';
              } else {
                status = 'pending';
              }

              // Use Fleet's canonical row count, fall back to results index count
              const source = edge._source as { action_response?: { osquery?: { count?: number } } };
              const fleetRowCount = source?.action_response?.osquery?.count;
              const rowCount =
                typeof fleetRowCount === 'number'
                  ? fleetRowCount
                  : agentRowCounts.get(agentId ?? '') ?? 0;

              return {
                ...edge,
                fields: {
                  ...edge.fields,
                  status: [status],
                  row_count: [rowCount],
                },
              };
            });

            // Build placeholder edges for missing agents on current page
            const placeholderEdges = agentIds
              .filter((id) => !respondedAgentIds.has(id))
              .map((agentId) => {
                const rowCount = agentRowCounts.get(agentId) ?? 0;
                const hasResults = agentRowCounts.has(agentId);
                const status = hasResults ? 'success' : isExpired ? 'expired' : 'pending';

                return {
                  _index: `${ACTION_RESPONSES_INDEX}-default`,
                  _id: `placeholder-${agentId}`,
                  _source: {
                    agent_id: agentId,
                    action_response: { osquery: { count: rowCount } },
                  },
                  fields: {
                    agent_id: [agentId],
                    status: [status],
                    row_count: [rowCount],
                    ...(hasResults && { completed_at: [new Date().toISOString()] }),
                    ...(status === 'expired' && {
                      error: ['The action request timed out.'],
                      'error.keyword': ['The action request timed out.'],
                    }),
                  },
                };
              });

            processedEdges = [...enrichedRealEdges, ...placeholderEdges];
          } else {
            // LEGACY MODE: Use only Fleet responses (original behavior)
            const totalResponded = responseAgg?.doc_count ?? 0;
            const totalRowCount = responseAgg?.rows_count?.value ?? 0;

            aggregations = {
              totalRowCount,
              totalResponded,
              successful: aggsBuckets?.find((bucket) => bucket.key === 'success')?.doc_count ?? 0,
              failed: aggsBuckets?.find((bucket) => bucket.key === 'error')?.doc_count ?? 0,
              pending: Math.max(0, totalAgentCount - totalResponded),
            };

            // Return edges as-is (client will generate placeholders)
            processedEdges = res.edges;
          }

          const totalPages = Math.ceil(totalAgentCount / pageSize);

          return response.ok({
            body: {
              edges: processedEdges,
              total: totalAgentCount,
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
