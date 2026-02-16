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
import type { SmlToolsOptions } from './types';

const smlAttachItemSchema = z.object({
  chunk_id: z
    .string()
    .describe('The chunk_id value from an sml_search result item (identifies the indexed chunk)'),
  attachment_id: z
    .string()
    .describe(
      'The attachment_id value from an sml_search result item (identifies the source asset, e.g. a saved object ID)'
    ),
  attachment_type: z
    .string()
    .describe('The attachment_type value from an sml_search result item (e.g. "visualization")'),
});

const smlAttachSchema = z.object({
  items: z
    .array(smlAttachItemSchema)
    .min(1)
    .describe(
      'One or more items from sml_search results to attach. ' +
        'Copy chunk_id, attachment_id, and attachment_type exactly as returned by sml_search.'
    ),
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
    'Pass one or more items using the chunk_id, attachment_id, and attachment_type fields exactly as returned by sml_search. ' +
    'Each item is resolved into a full conversation attachment (e.g. a Lens visualization). ' +
    'Items that cannot be resolved return individual errors without failing the entire call.',
  schema: smlAttachSchema,
  tags: ['sml', 'attachment'],
  handler: async ({ items }, context) => {
    const smlService = getSmlService();
    const { spaceId, savedObjectsClient, request, attachments, esClient } = context;

    const accessMap = await smlService.checkItemsAccess({
      items: items.map((item) => ({ id: item.chunk_id, type: item.attachment_type })),
      spaceId,
      esClient: esClient.asCurrentUser,
      request,
    });

    const chunkIds = items.filter((item) => accessMap.get(item.chunk_id)).map((i) => i.chunk_id);
    const smlDocs = await smlService.getDocuments({
      ids: chunkIds,
      spaceId,
      esClient: esClient.asCurrentUser,
    });

    const results = [];

    for (const item of items) {
      if (!accessMap.get(item.chunk_id)) {
        results.push(
          createErrorResult({
            message: `Access denied: you do not have the required permissions to access SML item '${item.chunk_id}'`,
            metadata: { chunk_id: item.chunk_id, attachment_type: item.attachment_type },
          })
        );
        continue;
      }

      const smlDoc = smlDocs.get(item.chunk_id);
      if (!smlDoc) {
        results.push(
          createErrorResult({
            message: `SML document '${item.chunk_id}' not found in the index`,
            metadata: { chunk_id: item.chunk_id, attachment_type: item.attachment_type },
          })
        );
        continue;
      }

      const typeDefinition = smlService.getTypeDefinition(smlDoc.type);
      if (!typeDefinition) {
        results.push(
          createErrorResult({
            message: `SML type '${smlDoc.type}' does not support conversion to attachment`,
            metadata: { chunk_id: item.chunk_id, attachment_type: smlDoc.type },
          })
        );
        continue;
      }

      try {
        const convertedAttachment = await typeDefinition.toAttachment(smlDoc, {
          request,
          savedObjectsClient,
          spaceId,
        });

        if (!convertedAttachment) {
          results.push(
            createErrorResult({
              message: `Failed to convert SML item '${item.chunk_id}' to attachment — toAttachment returned undefined`,
              metadata: { chunk_id: item.chunk_id, attachment_type: item.attachment_type },
            })
          );
          continue;
        }

        const added = await attachments.add(
          {
            type: convertedAttachment.type,
            data: convertedAttachment.data,
          },
          ATTACHMENT_REF_ACTOR.agent
        );

        results.push({
          tool_result_id: getToolResultId(),
          type: ToolResultType.other as const,
          data: {
            success: true,
            attachment_id: added.id,
            attachment_type: convertedAttachment.type,
            message: `Attachment '${added.id}' of type '${convertedAttachment.type}' created from SML item '${item.chunk_id}'`,
          },
        });
      } catch (error) {
        results.push(
          createErrorResult({
            message: `Error converting SML item '${item.chunk_id}': ${error.message}`,
            metadata: { chunk_id: item.chunk_id, attachment_type: item.attachment_type },
          })
        );
      }
    }

    return { results };
  },
});
