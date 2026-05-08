/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import { escapeKuery } from '@kbn/es-query';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';
import type { ECSMapping } from '@kbn/osquery-io-ts-types';

import { PLUGIN_ID } from '../../../common';
import { API_VERSIONS } from '../../../common/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { createExportRouteHandler } from '../export/create_export_route_handler';
import {
  exportQuerySchema,
  exportRequestBodySchema,
  exportScheduledQueryParamsSchema,
} from '../export/export_request_body_schema';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import { getPacksForSpace } from '../unified_history/process_scheduled_history';
import { buildPackLookup } from '../unified_history/pack_lookup';

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

        let query: string | undefined;
        let ecsMapping: ECSMapping | undefined;

        // Look up the ECS mapping and SQL query text from the matching pack query.
        // When present, ECS mapping enriches all export formats: NDJSON/JSON rows
        // gain extra ECS-keyed fields (e.g. process.pid alongside osquery.pid.number)
        // and CSV column headers use ECS names rather than raw osquery field names,
        // matching what users see in the UI's results table.
        // Failure here is non-fatal — the export proceeds without enriched metadata.
        try {
          const spaceScopedClient = await createInternalSavedObjectsClientForSpaceId(
            osqueryContext,
            request
          );
          const spaceId = osqueryContext?.service?.getActiveSpace
            ? (await osqueryContext.service.getActiveSpace(request))?.id || DEFAULT_SPACE_ID
            : DEFAULT_SPACE_ID;

          const packSOs = await getPacksForSpace(spaceScopedClient);
          const packLookup = buildPackLookup(packSOs, spaceId);
          const packEntry = packLookup.get(scheduleId);

          if (packEntry) {
            query = packEntry.queryText;
            ecsMapping = packEntry.ecsMapping;
          }
        } catch (err) {
          const logger = osqueryContext.logFactory.get('export_scheduled_query_results');
          logger.warn(
            `Failed to resolve pack metadata for scheduled export (scheduleId: ${scheduleId}): ${
              err instanceof Error ? err.message : String(err)
            }. Proceeding without ECS-enriched column names.`
          );
        }

        return handler(context, request, response, {
          // Mirror the KQL filter used by the results search strategy:
          //   schedule_id AND osquery_meta.schedule_execution_count
          baseFilter: `schedule_id: "${escapeKuery(
            scheduleId
          )}" AND osquery_meta.schedule_execution_count: ${executionCount}`,
          metadata: {
            action_id: scheduleId,
            execution_count: executionCount,
            query,
          },
          fileNamePrefix: `osquery-scheduled-results-${scheduleId}-${executionCount}`,
          ecsMapping,
        });
      }
    );
};
