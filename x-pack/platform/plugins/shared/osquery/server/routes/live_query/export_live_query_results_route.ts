/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';

import { PLUGIN_ID, OSQUERY_INTEGRATION_NAME } from '../../../common';
import { API_VERSIONS, OSQUERY_ACTIONS_INDEX } from '../../../common/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import { buildIndexNameWithNamespace } from '../../utils/build_index_name_with_namespace';
import { getQueryFilter } from '../../utils/build_query';
import { exportResultsToStream } from '../../lib/export_results_to_stream';
import { createFormatter } from '../../lib/format_results';
import type { ExportFormat } from '../../lib/format_results';
import { getUserInfo } from '../../lib/get_user_info';

export const exportLiveQueryResultsRoute = (
  router: IRouter<DataRequestHandlerContext>,
  osqueryContext: OsqueryAppContext
) => {
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
            body: schema.nullable(
              schema.object({
                kuery: schema.maybe(schema.string()),
                agentIds: schema.maybe(schema.arrayOf(schema.string())),
              })
            ),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { actionId } = request.params;
          const format = request.query.format as ExportFormat;
          const kuery = request.body?.kuery;
          const agentIds = request.body?.agentIds;

          const logger = osqueryContext.logFactory.get('export_live_query_results');

          // Build filter query
          let baseFilter = `action_id: "${actionId}"`;
          if (agentIds && agentIds.length > 0) {
            const agentFilter = agentIds.map((id) => `agent.id: "${id}"`).join(' OR ');
            baseFilter += ` AND (${agentFilter})`;
          }

          if (kuery) {
            baseFilter += ` AND ${kuery}`;
          }

          const kqlFilterClause = getQueryFilter({ filter: baseFilter });

          // Resolve space-aware index
          let index = `logs-${OSQUERY_INTEGRATION_NAME}.result*`;

          if (osqueryContext?.service?.getIntegrationNamespaces) {
            const spaceScopedClient = await createInternalSavedObjectsClientForSpaceId(
              osqueryContext,
              request
            );
            const integrationNamespaces = await osqueryContext.service.getIntegrationNamespaces(
              [OSQUERY_INTEGRATION_NAME],
              spaceScopedClient,
              logger
            );

            const osqueryNamespaces = integrationNamespaces[OSQUERY_INTEGRATION_NAME];
            if (osqueryNamespaces && osqueryNamespaces.length > 0) {
              index = osqueryNamespaces
                .map((namespace) =>
                  buildIndexNameWithNamespace(`logs-${OSQUERY_INTEGRATION_NAME}.result*`, namespace)
                )
                .join(',');
            }
          }

          // Get user info for metadata
          const user = await getUserInfo({
            request,
            security: osqueryContext.security,
            logger,
          });

          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;

          // Fetch the SQL query string from the action document
          let queryString: string | undefined;
          try {
            const actionDoc = await esClient.search({
              index: OSQUERY_ACTIONS_INDEX,
              query: { term: { action_id: actionId } },
              size: 1,
              _source: ['queries'],
            });
            const actionSource = actionDoc.hits.hits[0]?._source as
              | { queries?: Array<{ action_id: string; query: string }> }
              | undefined;
            const matchingQuery = actionSource?.queries?.find((q) => q.action_id === actionId);
            queryString = matchingQuery?.query;
          } catch (e) {
            logger.debug(`Could not fetch query string for action ${actionId}: ${e.message}`);
          }

          const formatter = createFormatter(format);
          const timestamp = new Date().toISOString();
          const fileName = `osquery-results-${actionId}-${timestamp.replace(/[:.]/g, '-')}.${
            formatter.fileExtension
          }`;

          const result = await exportResultsToStream({
            esClient,
            index,
            query: { bool: { filter: [kqlFilterClause] } },
            formatter,
            metadata: {
              action_id: actionId,
              query: queryString,
              timestamp,
              exported_by: user?.username ?? 'unknown',
              format,
            },
            aborted$: request.events.aborted$,
            logger,
          });

          // Check if we got an error (max results exceeded)
          if ('statusCode' in result) {
            return response.badRequest({
              body: { message: result.message },
            });
          }

          return response.ok({
            body: result,
            headers: {
              'Content-Disposition': `attachment; filename="${fileName}"`,
              'Content-Type': formatter.contentType,
            },
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
