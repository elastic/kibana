/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { lastValueFrom } from 'rxjs';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';
import { escapeKuery } from '@kbn/es-query';
import type { ECSMapping } from '@kbn/osquery-io-ts-types';

import { PLUGIN_ID } from '../../../common';
import { API_VERSIONS } from '../../../common/constants';
import type {
  ActionDetailsRequestOptions,
  ActionDetailsStrategyResponse,
} from '../../../common/search_strategy';
import { OsqueryQueries } from '../../../common/search_strategy';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { createExportRouteHandler } from '../export/create_export_route_handler';
import {
  exportLiveQueryParamsSchema,
  exportQuerySchema,
  exportRequestBodySchema,
} from '../export/export_request_body_schema';

export const exportLiveQueryResultsRoute = (
  router: IRouter<DataRequestHandlerContext>,
  osqueryContext: OsqueryAppContext
) => {
  const handler = createExportRouteHandler(osqueryContext);

  router.versioned
    .post({
      access: 'public',
      path: '/api/osquery/live_queries/{id}/results/{actionId}/_export',
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
            params: exportLiveQueryParamsSchema,
            query: exportQuerySchema,
            body: exportRequestBodySchema,
          },
        },
      },
      async (context, request, response) => {
        const { id, actionId } = request.params;

        const spaceId = osqueryContext?.service?.getActiveSpace
          ? (await osqueryContext.service.getActiveSpace(request))?.id || DEFAULT_SPACE_ID
          : DEFAULT_SPACE_ID;

        let query: string | undefined;
        let ecsMapping: ECSMapping | undefined;

        // Fetch action details to populate export metadata and ECS mapping.
        // When present, ECS mapping enriches all export formats: NDJSON/JSON rows
        // gain extra ECS-keyed fields (e.g. process.pid alongside osquery.pid.number)
        // and CSV column headers use ECS names rather than raw osquery field names.
        // Transport-level failures are non-fatal — the export proceeds without enriched metadata.
        // A successful fetch where the actionId is not in the queries list returns 404.
        const abortController = new AbortController();
        const sub = request.events.aborted$.subscribe(() => abortController.abort());
        try {
          const search = await context.search;

          const { actionDetails } = await lastValueFrom(
            search.search<ActionDetailsRequestOptions, ActionDetailsStrategyResponse>(
              {
                actionId: id,
                factoryQueryType: OsqueryQueries.actionDetails,
                spaceId,
              },
              { abortSignal: abortController.signal, strategy: 'osquerySearchStrategy' }
            )
          );

          const matchingQuery = actionDetails?._source?.queries?.find(
            (q) => q.action_id === actionId
          );
          if (matchingQuery) {
            query = matchingQuery.query;
            ecsMapping = matchingQuery.ecs_mapping as ECSMapping | undefined;
          } else if (actionDetails?._source != null) {
            // actionDetails was fetched successfully but the requested actionId is not in
            // its queries list — the caller provided a mismatched id/actionId pair.
            return response.notFound({ body: { message: 'Live query action not found' } });
          }
        } catch (err) {
          const logger = osqueryContext.logFactory.get('export_live_query_results');
          logger.warn(
            `Failed to fetch action details for live query export (id: ${id}, actionId: ${actionId}): ${
              err instanceof Error ? err.message : String(err)
            }. Proceeding without ECS-enriched metadata.`
          );
        } finally {
          sub.unsubscribe();
        }

        return handler(context, request, response, {
          baseFilter: `action_id: "${escapeKuery(actionId)}"`,
          metadata: { action_id: actionId, query },
          fileNamePrefix: `osquery-results-${actionId}`,
          ecsMapping,
        });
      }
    );
};
