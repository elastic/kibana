/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { estypes } from '@elastic/elasticsearch';

import type { Filter } from '@kbn/es-query';
import { buildQueryFromFilters } from '@kbn/es-query';

import { OSQUERY_INTEGRATION_NAME } from '../../../common';
import { escapeKuery } from '@kbn/es-query';
import { getQueryFilter } from '../../utils/build_query';
import { buildIndexNameWithNamespace } from '../../utils/build_index_name_with_namespace';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import { exportResultsToStream } from '../../lib/export_results_to_stream';
import { createFormatter } from '../../lib/format_results';
import type { ExportFormat, ExportMetadata } from '../../lib/format_results';
import { getUserInfo } from '../../lib/get_user_info';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';

export interface ExportRouteParams {
  /** KQL base filter (e.g. `action_id: "abc"` or `schedule_id: "x" AND ...`) */
  baseFilter: string;
  /** Metadata fields specific to this export type */
  metadata: Pick<ExportMetadata, 'action_id' | 'query'>;
  /** Filename prefix (e.g. `osquery-results-{id}` or `osquery-scheduled-results-{id}-{count}`) */
  fileNamePrefix: string;
}

export const createExportRouteHandler =
  (osqueryContext: OsqueryAppContext) =>
  async (
    context: RequestHandlerContext & DataRequestHandlerContext,
    request: KibanaRequest<unknown, { format: string }, { kuery?: string; agentIds?: string[]; esFilters?: unknown[] } | null>,
    response: KibanaResponseFactory,
    params: ExportRouteParams
  ) => {
    const { baseFilter, metadata: routeMetadata, fileNamePrefix } = params;
    const format = request.query.format as ExportFormat;
    const kuery = request.body?.kuery;
    const agentIds = request.body?.agentIds;
    const esFilters = request.body?.esFilters;

    const logger = osqueryContext.logFactory.get('export_results');

    // Build filter query
    let filter = baseFilter;
    if (agentIds && agentIds.length > 0) {
      const agentFilter = agentIds.map((id) => `agent.id: "${escapeKuery(id)}"`).join(' OR ');
      filter += ` AND (${agentFilter})`;
    }
    if (kuery) {
      filter += ` AND ${kuery}`;
    }

    const kqlFilterClause = getQueryFilter({ filter });

    // Build ES filter clauses from SearchBar filter pills
    let esFilterClauses: estypes.QueryDslQueryContainer[] = [];
    if (esFilters && esFilters.length > 0) {
      try {
        const built = buildQueryFromFilters(esFilters as unknown as Filter[], undefined);
        esFilterClauses = built.filter as estypes.QueryDslQueryContainer[];
      } catch {
        logger.debug('Failed to build query from esFilters, ignoring');
      }
    }

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

    const formatter = createFormatter(format);
    const timestamp = new Date().toISOString();
    const fileName = `${fileNamePrefix}-${timestamp.replace(/[:.]/g, '-')}.${formatter.fileExtension}`;

    const result = await exportResultsToStream({
      esClient,
      index,
      query: { bool: { filter: [kqlFilterClause, ...esFilterClauses] } },
      formatter,
      metadata: {
        ...routeMetadata,
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
  };
