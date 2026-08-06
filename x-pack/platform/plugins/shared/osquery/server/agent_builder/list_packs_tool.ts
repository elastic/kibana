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
import { osqueryTool, agentBuilderToolsAvailability } from './common';
import { packSavedObjectType } from '../../common/types';
import type { PackSavedObject } from '../common/types';
import type { OsqueryAppContext } from '../lib/osquery_app_context_services';
import { createInternalSavedObjectsClientForSpaceId } from '../utils/get_internal_saved_object_client';

export const LIST_PACKS_TOOL_ID = osqueryTool('list_packs');

const listPacksSchema = z.object({
  search: z.string().optional().describe('Search term to filter packs by name or description'),
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
  description:
    'List available Osquery packs (curated query bundles from Elastic and custom packs). Use this when the analyst references a pack by name (e.g. "Windows persistence pack"). Returns pack name, queries, and enabled status. Pack queries can be run with osquery.run_live_query after applying analyst-scope filters.',
  schema: listPacksSchema,
  availability: agentBuilderToolsAvailability(osqueryContext),
  handler: async (input, { request }) => {
    const { search, enabled: _enabled, page, page_size: pageSize } = input;

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

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              total: 0,
              page,
              per_page: pageSize,
              packs: [],
              error: 'Failed to retrieve packs',
            },
          },
        ],
      };
    }
  },
  tags: ['security', 'osquery', 'packs'],
});
