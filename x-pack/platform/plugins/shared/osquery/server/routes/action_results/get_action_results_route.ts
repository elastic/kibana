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
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';

import { flatten, reverse, uniqBy } from 'lodash/fp';
import type { estypes } from '@elastic/elasticsearch';
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
import type {
  ActionResultsRequestOptions,
  ActionResultsStrategyResponse,
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
        const spaceId = osqueryContext?.service?.getActiveSpace
          ? (await osqueryContext.service.getActiveSpace(request))?.id || DEFAULT_SPACE_ID
          : DEFAULT_SPACE_ID;

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

          // Fetch action details - searches for both direct action_id match and queries.action_id match
          const { actionDetails } = await lastValueFrom(
            search.search<ActionDetailsRequestOptions, ActionDetailsStrategyResponse>(
              {
                actionId: request.params.actionId,
                factoryQueryType: OsqueryQueries.actionDetails,
                spaceId,
              },
              { abortSignal, strategy: 'osquerySearchStrategy' }
            )
          );

          if (!actionDetails) {
            return response.notFound({
              body: { message: 'Action not found' },
            });
          }

          // The actionId might be a query action_id (child) rather than parent action_id.
          // Check if we need to extract agents from a specific query in the queries array.
          const queries = actionDetails._source?.queries || [];
          const matchingQuery = queries.find((q) => q.action_id === request.params.actionId);

          // Use query-specific agents if this is a query action_id, otherwise use parent action's agents
          const agentIds = matchingQuery?.agents || actionDetails._source?.agents || [];

          logger.debug(
            `Action ${request.params.actionId}: Found ${agentIds.length} agents (isQueryAction: ${!!matchingQuery}, queriesCount: ${queries.length})`
          );

          // Calculate pagination for agents (not ES responses)
          const page = request.query.page ?? 0;
          const pageSize = request.query.pageSize ?? 100;
          const startIndex = page * pageSize;
          const endIndex = startIndex + pageSize;
          const agentsForCurrentPage = agentIds?.slice(startIndex, endIndex) ?? [];

          // Build kuery filter for current page agents only
          const agentIdsKuery = agentsForCurrentPage
            .map((id) => `agent.id: "${id}"`)
            .join(' OR ');
          const combinedKuery = request.query.kuery
            ? `(${agentIdsKuery}) AND (${request.query.kuery})`
            : agentIdsKuery;

          const res = await lastValueFrom(
            search.search<ActionResultsRequestOptions, ActionResultsStrategyResponse>(
              {
                actionId: request.params.actionId,
                factoryQueryType: OsqueryQueries.actionResults,
                kuery: combinedKuery, // Filter by current page agents
                startDate: request.query.startDate,
                pagination: generateTablePaginationOptions(
                  0, // Always fetch from 0 since we're filtering by specific agents
                  pageSize // Fetch up to pageSize results
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

          // Create placeholder edges for agents that haven't responded yet
          const previousEdges =
            agentsForCurrentPage.map(
              (agentId) =>
                ({ fields: { agent_id: [agentId] } } as unknown as estypes.SearchHit<object>)
            );

          const processedEdges = reverse(
            uniqBy('fields.agent_id[0]', flatten([res.edges, previousEdges]))
          );

          const aggregations = {
            totalRowCount,
            totalResponded,
            successful: aggsBuckets?.find((bucket) => bucket.key === 'success')?.doc_count ?? 0,
            failed: aggsBuckets?.find((bucket) => bucket.key === 'error')?.doc_count ?? 0,
            pending: agentIds?.length ? Math.max(0, agentIds.length - totalResponded) : 0,
          };

          return response.ok({
            body: {
              edges: processedEdges,
              total: agentIds.length, // Use total agent count for pagination, not ES response count
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
