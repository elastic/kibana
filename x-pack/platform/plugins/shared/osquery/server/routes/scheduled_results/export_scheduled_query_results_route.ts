/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import { escapeKuery } from '@kbn/es-query';

import { PLUGIN_ID } from '../../../common';
import { API_VERSIONS } from '../../../common/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { createExportRouteHandler } from '../export/create_export_route_handler';
import {
  exportQuerySchema,
  exportRequestBodySchema,
  exportScheduledQueryParamsSchema,
} from '../export/export_request_body_schema';

export const exportScheduledQueryResultsRoute = (
  router: IRouter<DataRequestHandlerContext>,
  osqueryContext: OsqueryAppContext
) => {
  const handler = createExportRouteHandler(osqueryContext);

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
            params: exportScheduledQueryParamsSchema,
            query: exportQuerySchema,
            body: exportRequestBodySchema,
          },
        },
      },
      async (context, request, response) => {
        const { scheduleId, executionCount } = request.params;

        return handler(
          context,
          // The shared handler only reads request.query.format and request.body;
          // route-specific params are not accessed inside it so the cast is safe.
          request as Parameters<typeof handler>[1],
          response,
          {
            // Mirror the KQL filter used by the results search strategy:
            //   schedule_id AND osquery_meta.schedule_execution_count
            baseFilter: `schedule_id: "${escapeKuery(
              scheduleId
            )}" AND osquery_meta.schedule_execution_count: ${executionCount}`,
            metadata: {
              action_id: scheduleId,
              execution_count: executionCount,
            },
            fileNamePrefix: `osquery-scheduled-results-${scheduleId}-${executionCount}`,
          }
        );
      }
    );
};
