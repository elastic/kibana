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
import { savedQuerySavedObjectType } from '../../common/types';
import type { SavedQuerySavedObject } from '../common/types';
import type { OsqueryAppContext } from '../lib/osquery_app_context_services';
import { createInternalSavedObjectsClientForSpaceId } from '../utils/get_internal_saved_object_client';

export const LIST_SAVED_QUERIES_TOOL_ID = osqueryTool('list_saved_queries');

const listSavedQueriesSchema = z.object({
  search: z
    .string()
    .optional()
    .describe('Search term to filter saved queries by name, description, or query text'),
  page: z.number().int().min(1).optional().default(1),
  page_size: z.number().int().min(1).max(100).optional().default(20),
});

export const listSavedQueriesTool = (
  osqueryContext: OsqueryAppContext,
  logger: Logger
): BuiltinToolDefinition<typeof listSavedQueriesSchema> => ({
  id: LIST_SAVED_QUERIES_TOOL_ID,
  type: ToolType.builtin,
  description:
    'List available Osquery saved queries (prebuilt and custom). Use this to discover existing queries before authoring a custom one. Returns query text, platform, interval, and prebuilt status.',
  schema: listSavedQueriesSchema,
  availability: agentBuilderToolsAvailability(osqueryContext),
  handler: async (input, { request }) => {
    const { search, page, page_size: pageSize } = input;

    const spaceScopedClient = await createInternalSavedObjectsClientForSpaceId(
      osqueryContext,
      request
    );

    try {
      const savedQueries = await spaceScopedClient.find<SavedQuerySavedObject>({
        type: savedQuerySavedObjectType,
        page,
        perPage: pageSize,
        sortField: 'id',
        sortOrder: 'asc',
        ...(search && {
          search,
          searchFields: ['id', 'description', 'query'],
        }),
      });

      const queries = savedQueries.saved_objects.map((sq) => {
        const attrs = sq.attributes;

        return {
          saved_object_id: sq.id,
          id: attrs.id,
          description: attrs.description,
          query: attrs.query,
          platform: attrs.platform,
          interval: attrs.interval,
          prebuilt: sq.references.some(
            (ref) => ref.type === 'osquery-pack-asset' || ref.type === 'osquery-saved-query-asset'
          ),
        };
      });

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              total: savedQueries.total,
              page: savedQueries.page,
              per_page: savedQueries.per_page,
              queries,
            },
          },
        ],
      };
    } catch (e) {
      logger.warn(`Failed to list saved queries: ${e}`);

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              total: 0,
              page,
              per_page: pageSize,
              queries: [],
              error: 'Failed to retrieve saved queries',
            },
          },
        ],
      };
    }
  },
  tags: ['security', 'osquery', 'saved-queries'],
});
