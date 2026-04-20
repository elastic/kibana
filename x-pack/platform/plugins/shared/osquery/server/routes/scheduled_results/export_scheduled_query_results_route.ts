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
import { packSavedObjectType } from '../../../common/types';
import { API_VERSIONS } from '../../../common/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import type { PackSavedObject } from '../../common/types';
import { createExportRouteHandler } from '../export/create_export_route_handler';
import { exportRequestBodySchema } from '../export/export_request_body_schema';

export const exportScheduledQueryResultsRoute = (
  router: IRouter<DataRequestHandlerContext>,
  osqueryContext: OsqueryAppContext
) => {
  const handleExport = createExportRouteHandler(osqueryContext);

  router.versioned
    .post({
      access: 'public',
      path: '/api/osquery/scheduled_results/{scheduleId}/{executionCount}/_export',
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
            params: schema.object({
              scheduleId: schema.string(),
              executionCount: schema.number(),
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
          const { scheduleId, executionCount } = request.params;
          const logger = osqueryContext.logFactory.get('export_scheduled_query_results');

          // Resolve the pack query for metadata + ECS mapping. A deleted pack
          // is a soft-failure — the export still runs without ecs_mapping,
          // matching get_scheduled_action_results_route behaviour.
          let queryText: string | undefined;
          let ecsMapping: ECSMapping | undefined;
          try {
            const coreContext = await context.core;
            const soClient = coreContext.savedObjects.client;
            const packSavedObjects = await soClient.find<PackSavedObject>({
              type: packSavedObjectType,
              perPage: 1,
              search: scheduleId,
              searchFields: ['queries.schedule_id'],
            });
            const packSO = packSavedObjects.saved_objects[0];
            const matchingQuery = packSO?.attributes?.queries?.find(
              (q) => q.schedule_id === scheduleId
            );
            queryText = matchingQuery?.query;
            ecsMapping = matchingQuery?.ecs_mapping as ECSMapping | undefined;
          } catch (e) {
            logger.debug(`Could not resolve pack query for schedule ${scheduleId}: ${e.message}`);
          }

          return await handleExport(context, request, response, {
            baseFilter: `schedule_id: ${escapeKuery(
              scheduleId
            )} AND osquery_meta.schedule_execution_count: ${executionCount}`,
            metadata: {
              action_id: scheduleId,
              query: queryText ?? `Scheduled query: ${scheduleId}`,
              execution_count: executionCount,
            },
            fileNamePrefix: `osquery-scheduled-results-${scheduleId}-${executionCount}`,
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
