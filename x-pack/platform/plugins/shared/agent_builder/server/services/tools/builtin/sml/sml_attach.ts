/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId, createErrorResult } from '@kbn/agent-builder-server';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import type { SmlToolsOptions } from './types';

const smlAttachSchema = z.object({
  chunk_ids: z
    .array(z.string())
    .min(1)
    .max(50)
    .describe('One or more chunk_id values exactly as returned by sml_search.'),
});

/**
 * Creates the sml_attach tool.
 * Converts SML search results into conversation attachments.
 */
export const createSmlAttachTool = ({
  getSmlService,
}: SmlToolsOptions): BuiltinToolDefinition<typeof smlAttachSchema> => ({
  id: platformCoreTools.smlAttach,
  type: ToolType.builtin,
  description:
    'Attach assets found by sml_search to the conversation. ' +
    'Pass one or more chunk_id strings exactly as returned by sml_search. ' +
    'Chunk id follows the format: attachment_type:origin_id:uuid and could be referenced by sml://{attachment_type}/{origin_id}. ' +
    'Each chunk is resolved into a full conversation attachment (e.g. a Lens visualization). ' +
    'Chunks that cannot be resolved return individual errors without failing the entire call.',
  schema: smlAttachSchema,
  tags: ['sml', 'attachment'],
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
  handler: async ({ chunk_ids: chunkIds }, context) => {
    const smlService = getSmlService();
    const { spaceId, savedObjectsClient, request, attachments, esClient, logger } = context;

    const uniqueChunkIds = [...new Set(chunkIds)];
    const accessMap = await smlService.checkItemsAccess({
      ids: uniqueChunkIds,
      spaceId,
      esClient: esClient.asCurrentUser,
      request,
    });

    const smlDocs = await smlService.getDocuments({
      ids: uniqueChunkIds.filter((chunkId) => accessMap.get(chunkId)),
      spaceId,
      esClient: esClient.asCurrentUser,
    });

    const results = await Promise.all(
      uniqueChunkIds.map(async (chunkId) => {
        if (!accessMap.get(chunkId)) {
          return createErrorResult({
            message: `Access denied: you do not have the required permissions to access SML item '${chunkId}'`,
            metadata: { chunk_id: chunkId },
          });
        }

        const smlDoc = smlDocs.get(chunkId);
        if (!smlDoc) {
          return createErrorResult({
            message: `SML document '${chunkId}' not found in the index`,
            metadata: { chunk_id: chunkId },
          });
        }

        const typeDefinition = smlService.getTypeDefinition(smlDoc.type);
        if (!typeDefinition) {
          return createErrorResult({
            message: `SML type '${smlDoc.type}' does not support conversion to attachment`,
            metadata: { chunk_id: chunkId, attachment_type: smlDoc.type },
          });
        }

        try {
          const convertedAttachment = await typeDefinition.toAttachment(smlDoc, {
            request,
            savedObjectsClient,
            spaceId,
          });

          if (!convertedAttachment) {
            return createErrorResult({
              message: `Failed to convert SML item '${chunkId}' to attachment — toAttachment returned undefined`,
              metadata: { chunk_id: chunkId, attachment_type: smlDoc.type },
            });
          }

          const added = await attachments.add(
            {
              type: convertedAttachment.type,
              data: convertedAttachment.data,
              origin: convertedAttachment.origin ?? smlDoc.origin_id,
            },
            ATTACHMENT_REF_ACTOR.agent
          );

          return {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other as const,
            data: {
              success: true,
              attachment_id: added.id,
              attachment_type: convertedAttachment.type,
              message: `Attachment '${added.id}' of type '${convertedAttachment.type}' created from SML item '${chunkId}'`,
            },
          };
        } catch (error) {
          logger.error(
            `sml_attach: error converting item '${chunkId}' (type: ${smlDoc.type}): ${
              (error as Error).message
            }`
          );
          return createErrorResult({
            message: `Failed to convert SML item '${chunkId}' to attachment`,
            metadata: { chunk_id: chunkId, attachment_type: smlDoc.type },
          });
        }
      })
    );

    return { results };
  },
});
