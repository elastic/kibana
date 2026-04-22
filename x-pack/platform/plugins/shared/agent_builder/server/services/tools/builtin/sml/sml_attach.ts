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
import { SEMANTIC_LAYER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import type { SmlToolsOptions } from './types';

const smlAttachSchema = z.object({
  chunk_ids: z
    .array(z.string())
    .min(1)
    .max(50)
    .describe(
      'One or more chunk_id values exactly as returned by sml_search, or the path after sml:// in a user @-mention link.'
    ),
});

/**
 * Creates the sml_attach tool.
 * Resolves SML search results into conversation attachments via the attachment type's `resolve` method.
 */
export const createSmlAttachTool = ({
  getSmlService,
  getAttachmentTypeByOriginType,
}: SmlToolsOptions): BuiltinToolDefinition<typeof smlAttachSchema> => ({
  id: platformCoreTools.smlAttach,
  type: ToolType.builtin,
  description:
    'Attach assets found by sml_search to the conversation. ' +
    'When the user @-mentions an SML asset, their message contains a link like [@label](sml://CHUNK_ID); call this tool with that CHUNK_ID first so the asset is available as a conversation attachment before other work. ' +
    'Pass one or more chunk_id strings exactly as returned by sml_search or taken from those sml:// links. ' +
    'Chunk id follows the format: attachment_type:origin_id:uuid and could be referenced by sml://{attachment_type}/{origin_id}. ' +
    'Each chunk is resolved into a full conversation attachment (e.g. a Lens visualization). ' +
    'Chunks that cannot be resolved return individual errors without failing the entire call.',
  schema: smlAttachSchema,
  tags: ['sml', 'attachment'],
  availability: {
    cacheMode: 'global',
    handler: async ({ uiSettings }) => {
      const enabled = await uiSettings.get<boolean>(SEMANTIC_LAYER_EXPERIMENTAL_FEATURES_SETTING_ID);
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
    const { spaceId, request, attachments, esClient, logger } = context;

    const uniqueChunkIds = [...new Set(chunkIds)];

    const accessMap = await smlService.checkItemsAccess({
      ids: uniqueChunkIds,
      spaceId,
      esClient: esClient.asCurrentUser,
      request,
    });

    const authorizedIds = uniqueChunkIds.filter((id) => accessMap.get(id) === true);
    const smlDocs = await smlService.getDocuments({
      ids: authorizedIds,
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

        const smlTypeDef = smlService.getTypeDefinition(smlDoc.type);
        if (!smlTypeDef?.originType) {
          return createErrorResult({
            message: `SML type '${smlDoc.type}' does not support attachment`,
            metadata: { chunk_id: chunkId, attachment_type: smlDoc.type },
          });
        }

        const attachmentTypeDef = getAttachmentTypeByOriginType(smlTypeDef.originType);
        if (!attachmentTypeDef?.resolve) {
          return createErrorResult({
            message: `No attachment type with resolve found for origin type '${smlTypeDef.originType}'`,
            metadata: { chunk_id: chunkId, attachment_type: smlDoc.type },
          });
        }

        try {
          const added = await attachments.add(
            {
              type: attachmentTypeDef.id,
              origin: smlDoc.origin_id,
              description: `${smlDoc.type}/${smlDoc.title}`,
            },
            ATTACHMENT_REF_ACTOR.agent
          );

          return {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              success: true,
              attachment_id: added.id,
              attachment_type: attachmentTypeDef.id,
              message: `Attachment '${added.id}' of type '${attachmentTypeDef.id}' created from SML item '${chunkId}'`,
            },
          };
        } catch (error) {
          logger.error(
            `sml_attach: error attaching item '${chunkId}' (type: ${smlDoc.type}): ${
              error instanceof Error ? error.message : String(error)
            }`
          );
          return createErrorResult({
            message: `Failed to attach SML item '${chunkId}'`,
            metadata: { chunk_id: chunkId, attachment_type: smlDoc.type },
          });
        }
      })
    );

    return { results };
  },
});
