/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/agent-builder-common';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createErrorResult, getToolResultId } from '@kbn/agent-builder-server';
import type { AttachmentServiceStart, SmlAttachmentSearchItem } from '../../../attachments';

const smlAttachSchema = z.object({
  items: z
    .array(
      z.object({
        attachment_id: z.string().describe('Attachment identifier from SML search'),
        attachment_type: z.string().describe('Attachment type from SML search'),
        title: z.string().optional().describe('Optional title from SML search'),
        content: z.string().optional().describe('Optional content from SML search'),
        spaces: z.array(z.string()).optional(),
      })
    )
    .min(1)
    .describe('SML results to convert into attachments'),
});

export const createSmlAttachTool = ({
  getAttachmentsService,
}: {
  getAttachmentsService: () => AttachmentServiceStart | undefined;
}): BuiltinToolDefinition<typeof smlAttachSchema> => ({
  id: platformCoreTools.smlAttach,
  type: ToolType.builtin,
  description: 'Convert SML search results into conversation attachments.',
  schema: smlAttachSchema,
  tags: ['sml', 'attachment'],
  handler: async ({ items }, context) => {
    const attachmentsService = getAttachmentsService();
    if (!attachmentsService) {
      return {
        results: [
          createErrorResult({
            message: 'Attachments service is not available',
          }),
        ],
      };
    }

    const results = [];

    for (const item of items) {
      const definition = attachmentsService.getTypeDefinition(item.attachment_type);
      if (!definition?.sml?.toAttachment) {
        results.push(
          createErrorResult({
            message: `Attachment type "${item.attachment_type}" does not support SML attachment conversion`,
            metadata: { attachment_type: item.attachment_type },
          })
        );
        continue;
      }

      const smlItem: SmlAttachmentSearchItem = {
        attachmentId: item.attachment_id,
        attachmentType: item.attachment_type,
        title: item.title,
        content: item.content ?? '',
        spaces: item.spaces,
      };

      const attachmentInput = await definition.sml.toAttachment(smlItem, {
        request: context.request,
        savedObjectsClient: context.savedObjectsClient,
        spaceId: context.spaceId,
      });

      if (!attachmentInput) {
        results.push(
          createErrorResult({
            message: `Failed to convert SML result for "${item.attachment_type}:${item.attachment_id}"`,
            metadata: { attachment_id: item.attachment_id },
          })
        );
        continue;
      }

      const created = await context.attachments.add(attachmentInput, ATTACHMENT_REF_ACTOR.agent);

      results.push({
        tool_result_id: getToolResultId(),
        type: ToolResultType.other,
        data: {
          attachment_id: created.id,
          type: created.type,
          source_attachment_id: item.attachment_id,
          source_attachment_type: item.attachment_type,
        },
      });
    }

    return { results };
  },
});

