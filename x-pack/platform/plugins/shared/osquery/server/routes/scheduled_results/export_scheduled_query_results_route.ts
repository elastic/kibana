/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';

import { escapeKuery } from '@kbn/es-query';
import { PLUGIN_ID } from '../../../common';
import { API_VERSIONS } from '../../../common/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { createExportRouteHandler } from '../export/create_export_route_handler';

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
            body: schema.nullable(
              schema.object({
                kuery: schema.maybe(schema.string()),
                agentIds: schema.maybe(schema.arrayOf(schema.string())),
                esFilters: schema.maybe(schema.arrayOf(schema.any())),
              })
            ),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { scheduleId, executionCount } = request.params;

          return await handleExport(context, request, response, {
            baseFilter: `schedule_id: "${escapeKuery(scheduleId)}" AND osquery_meta.schedule_execution_count: ${executionCount}`,
            metadata: {
              action_id: scheduleId,
              query: `Scheduled query: ${scheduleId}`,
            },
            fileNamePrefix: `osquery-scheduled-results-${scheduleId}-${executionCount}`,
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
