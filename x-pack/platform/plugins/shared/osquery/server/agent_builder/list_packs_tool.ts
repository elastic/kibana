/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId, type BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import { osqueryTool, osqueryLivePathAvailability } from './common';
import { packSavedObjectType } from '../../common/types';
import type { PackSavedObject } from '../common/types';
import type { OsqueryAppContext } from '../lib/osquery_app_context_services';
import { createInternalSavedObjectsClientForSpaceId } from '../utils/get_internal_saved_object_client';
import { hasOsqueryToolPrivilege, unauthorizedToolResult } from './tool_authz';

export const LIST_PACKS_TOOL_ID = osqueryTool('list_packs');

const listPacksSchema = z.object({
  search: z
    .string()
    .max(255)
    .optional()
    .describe('Search term to filter packs by name or description'),
  enabled: z
    .boolean()
    .optional()
    .describe('Filter to only enabled (true) or disabled (false) packs'),
  page: z.number().int().min(1).optional().default(1),
  page_size: z.number().int().min(1).max(100).optional().default(20),
});

export const listPacksTool = (
  osqueryContext: OsqueryAppContext,
  logger: Logger
): BuiltinToolDefinition<typeof listPacksSchema> => ({
  id: LIST_PACKS_TOOL_ID,
  type: ToolType.builtin,
  annotations: {
    title: 'List Osquery Packs',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  description:
    'List available Osquery packs (curated query bundles from Elastic and custom packs). Use this when the analyst references a pack by name (e.g. "Windows persistence pack"). Returns pack name, queries, and enabled status. Pack queries can be run with osquery.run_live_query after applying analyst-scope filters.',
  schema: listPacksSchema,
  availability: osqueryLivePathAvailability(osqueryContext),
  handler: async (input, { request }) => {
    const { search, enabled, page, page_size: pageSize } = input;

    if (!(await hasOsqueryToolPrivilege(osqueryContext, request, 'readPacks'))) {
      return unauthorizedToolResult('readPacks');
    }

    const spaceScopedClient = await createInternalSavedObjectsClientForSpaceId(
      osqueryContext,
      request
    );

    try {
      const packsResponse = await spaceScopedClient.find<PackSavedObject>({
        type: packSavedObjectType,
        page,
        perPage: pageSize,
        sortField: 'updated_at',
        sortOrder: 'desc',
        // `enabled` is advertised in the schema, so it has to reach the query —
        // otherwise the agent filters and silently gets the unfiltered list.
        ...(enabled !== undefined && {
          filter: `${packSavedObjectType}.attributes.enabled: ${enabled}`,
        }),
        ...(search && {
          search,
          searchFields: ['name', 'description'],
        }),
      });

      const packs = packsResponse.saved_objects.map((pack) => {
        const attrs = pack.attributes;

        return {
          saved_object_id: pack.id,
          name: attrs.name,
          description: attrs.description,
          enabled: attrs.enabled,
          query_count: attrs.queries?.length ?? 0,
          queries:
            attrs.queries?.map(
              (q: { id: string; query: string; platform?: string; interval?: number }) => ({
                id: q.id,
                query: q.query,
                platform: q.platform,
                interval: q.interval,
              })
            ) ?? [],
          read_only: attrs.version !== undefined,
        };
      });

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              total: packsResponse.total,
              page: packsResponse.page,
              per_page: packsResponse.per_page,
              packs,
            },
          },
        ],
      };
    } catch (e) {
      logger.warn(`Failed to list packs: ${e}`);

      // An empty array under `other` reads as "nothing exists", not "lookup failed".
      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.error,
            data: {
              message: `Failed to retrieve packs: ${e instanceof Error ? e.message : String(e)}`,
            },
          },
        ],
      };
    }
  },
  tags: ['security', 'osquery', 'packs'],
});
