/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId, createErrorResult } from '@kbn/agent-builder-server';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import type { SmlToolsOptions } from './types';

const smlReadSchema = z.object({
  chunk_id: z
    .string()
    .min(1)
    .describe('The chunk_id of the SML item to read, as returned by sml_search.'),
});

export const createSmlReadTool = ({
  getSmlService,
}: SmlToolsOptions): BuiltinToolDefinition<typeof smlReadSchema> => ({
  id: platformCoreTools.smlRead,
  type: ToolType.builtin,
  description:
    'Read the full content of a single SML chunk by its chunk_id. ' +
    'Use this when sml_search returned has_more=true and you need the complete content. ' +
    'Returns the full content, title, type, item_id, created_at, and attachable flag.',
  schema: smlReadSchema,
  tags: ['sml', 'read'],
  availability: {
    cacheMode: 'global',
    handler: async ({ uiSettings }) => {
      const enabled = await uiSettings.get<boolean>(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID);
      return enabled
        ? { status: 'available' }
        : {
            status: 'unavailable',
            reason: 'SML features require experimental features to be enabled',
          };
    },
  },
  handler: async ({ chunk_id: chunkId }, context) => {
    const smlService = getSmlService();
    const { spaceId, esClient, request } = context;

    try {
      const docs = await smlService.getDocuments({
        ids: [chunkId],
        spaceId,
        esClient: esClient.asCurrentUser,
      });

      const doc = docs.get(chunkId);
      if (!doc) {
        return {
          results: [
            createErrorResult({
              message: `SML chunk '${chunkId}' not found`,
              metadata: { chunk_id: chunkId },
            }),
          ],
        };
      }

      const accessMap = await smlService.checkItemsAccess({
        ids: [chunkId],
        spaceId,
        esClient: esClient.asCurrentUser,
        request,
      });

      if (!accessMap.get(chunkId)) {
        return {
          results: [
            createErrorResult({
              message: `Access denied for SML chunk '${chunkId}'`,
              metadata: { chunk_id: chunkId },
            }),
          ],
        };
      }

      const typeDef = smlService.getTypeDefinition(doc.type);
      const attachable = typeDef?.toAttachment != null;

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              chunk_id: doc.id,
              item_id: doc.origin_id,
              type: doc.type,
              title: doc.title,
              content: doc.content,
              created_at: doc.created_at,
              attachable,
            },
          },
        ],
      };
    } catch (error) {
      return {
        results: [
          createErrorResult({
            message: `Failed to read SML chunk: ${(error as Error).message}`,
            metadata: { chunk_id: chunkId },
          }),
        ],
      };
    }
  },
});
