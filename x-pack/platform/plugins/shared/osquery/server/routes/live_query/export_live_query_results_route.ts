/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';

import type { ECSMapping } from '@kbn/osquery-io-ts-types';
import { escapeKuery } from '@kbn/es-query';
import { PLUGIN_ID } from '../../../common';
import { API_VERSIONS, OSQUERY_ACTIONS_INDEX } from '../../../common/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { createExportRouteHandler } from '../export/create_export_route_handler';
import { exportRequestBodySchema } from '../export/export_request_body_schema';

export const exportLiveQueryResultsRoute = (
  router: IRouter<DataRequestHandlerContext>,
  osqueryContext: OsqueryAppContext
) => {
  const handleExport = createExportRouteHandler(osqueryContext);

  router.versioned
    .post({
      access: 'public',
      path: '/api/osquery/results/{actionId}/_export',
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
            params: schema.object({
              actionId: schema.string(),
            }),
            query: schema.object({
              format: schema.oneOf(
                [schema.literal('ndjson'), schema.literal('json'), schema.literal('csv')],
                { defaultValue: 'ndjson' }
              ),
            }),
            body: exportRequestBodySchema,
          },
        },
      },
      async (context, request, response) => {
        try {
          const { actionId } = request.params;
          const logger = osqueryContext.logFactory.get('export_live_query_results');

          // Fetch the SQL query string and ECS mapping from the action document.
          // The ECS mapping lets the export enrich rows with the same user-defined
          // ECS columns visible in the UI table.
          let queryString: string | undefined;
          let ecsMapping: ECSMapping | undefined;
          try {
            const coreContext = await context.core;
            const esClient = coreContext.elasticsearch.client.asCurrentUser;
            const actionDoc = await esClient.search({
              index: OSQUERY_ACTIONS_INDEX,
              query: { term: { action_id: actionId } },
              size: 1,
              _source: ['queries'],
            });
            const actionSource = actionDoc.hits.hits[0]?._source as
              | {
                  queries?: Array<{
                    action_id: string;
                    query: string;
                    ecs_mapping?: ECSMapping;
                  }>;
                }
              | undefined;
            const matchingQuery = actionSource?.queries?.find((q) => q.action_id === actionId);
            queryString = matchingQuery?.query;
            ecsMapping = matchingQuery?.ecs_mapping;
          } catch (e) {
            logger.debug(`Could not fetch query string for action ${actionId}: ${e.message}`);
          }

          return await handleExport(context, request, response, {
            baseFilter: `action_id: ${escapeKuery(actionId)}`,
            metadata: {
              action_id: actionId,
              query: queryString,
            },
            fileNamePrefix: `osquery-results-${actionId}`,
            ecsMapping,
          });
        } catch (e) {
          return response.customError({
            statusCode: e.statusCode ?? 500,
            body: { message: e.message },
          });
        }
      }
    );
};
