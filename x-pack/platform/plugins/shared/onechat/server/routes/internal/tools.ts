/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { listSearchSources } from '@kbn/onechat-genai-utils';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import type {
  BulkDeleteToolResponse,
  BulkDeleteToolResult,
  ResolveSearchSourcesResponse,
} from '../../../common/http_api/tools';
import { apiPrivileges } from '../../../common/features';

export function registerInternalToolsRoutes({
  router,
  getInternalServices,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // bulk delete tools
  router.post(
    {
      path: '/internal/chat/tools/_bulk_delete',
      validate: {
        body: schema.object({
          ids: schema.arrayOf(schema.string()),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.manageOnechat] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { ids } = request.body;
      const { tools: toolService } = getInternalServices();
      const registry = await toolService.getRegistry({ request });
      const deleteResults = await Promise.allSettled(ids.map((id) => registry.delete(id)));

      const results: BulkDeleteToolResult[] = deleteResults.map((result, index) => {
        if (result.status !== 'fulfilled') {
          return {
            toolId: ids[index],
            success: false,
            reason: result.reason.toJSON?.() ?? {
              error: { message: 'Unknown error' },
            },
          };
        }

        return {
          toolId: ids[index],
          success: true,
        };
      });

      return response.ok<BulkDeleteToolResponse>({
        body: {
          results,
        },
      });
    })
  );

  // resolve search sources (internal)
  router.get(
    {
      path: '/internal/chat/tools/_resolve_search_sources',
      validate: {
        query: schema.object({
          pattern: schema.string(),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;
      const { pattern } = request.query;

      const {
        indices,
        aliases,
        data_streams: dataStreams,
      } = await listSearchSources({
        pattern,
        includeHidden: false,
        includeKibanaIndices: false,
        excludeIndicesRepresentedAsAlias: true,
        excludeIndicesRepresentedAsDatastream: true,
        esClient,
      });

      const results = [
        ...indices.map((i) => ({ type: 'index' as const, name: i.name })),
        ...aliases.map((a) => ({ type: 'alias' as const, name: a.name })),
        ...dataStreams.map((d) => ({ type: 'data_stream' as const, name: d.name })),
      ];
      return response.ok<ResolveSearchSourcesResponse>({
        body: {
          results,
          total: results.length,
        },
      });
    })
  );
}
