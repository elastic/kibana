/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import { ToolResultType, isOtherResult } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { AttachmentToolsOptions } from './types';

const attachmentAddSchema = z.object({
  id: z.string().optional().describe('Optional custom ID for the attachment'),
  type: z.string().describe('Type of attachment (e.g., "text", "json", "code")'),
  data: z.unknown().describe('The attachment data/content'),
  description: z.string().optional().describe('Human-readable description of the attachment'),
});

/**
 * Creates the attachment_add tool.
 * Creates a new attachment with the specified type and content.
 */
export const createAttachmentAddTool = ({
  attachmentManager,
  attachmentsService,
}: AttachmentToolsOptions): BuiltinToolDefinition<typeof attachmentAddSchema> => ({
  id: platformCoreTools.attachmentAdd,
  type: ToolType.builtin,
  description:
    'Create a new attachment to store data for later use in the conversation. Attachments persist across conversation rounds and can be read, updated, or deleted.',
  schema: attachmentAddSchema,
  tags: ['attachment'],
  handler: async ({ id, type, data, description }, _context) => {
    const definition = attachmentsService?.getTypeDefinition(type);
    const isReadonly = definition?.isReadonly ?? true;
    if (isReadonly) {
      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.error,
            data: { message: `Attachment type '${type}' is read-only` },
          },
        ],
      };
    }

    // Check for duplicate ID if provided
    const existing = id ? attachmentManager.getAttachmentRecord(id) : undefined;
    if (existing) {
      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.error,
            data: { message: `Attachment with ID '${id}' already exists` },
          },
        ],
      };
    }

    let attachment;
    try {
      attachment = await attachmentManager.add(
        { id, type, data, description },
        ATTACHMENT_REF_ACTOR.agent
      );
    } catch (e) {
      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.error,
            data: { message: e.message },
          },
        ],
      };
    }

    return {
      results: [
        {
          tool_result_id: getToolResultId(),
          type: ToolResultType.other,
          data: {
            attachment_id: attachment.id,
            type: attachment.type,
            version: attachment.current_version,
          },
        },
      ],
    };
  },
  summarizeToolReturn: (toolReturn) => {
    if (toolReturn.results.length === 0) return undefined;
    const result = toolReturn.results[0];
    if (!isOtherResult(result)) return undefined;
    const data = result.data as Record<string, unknown>;

    return [
      {
        ...result,
        data: {
          summary: `Added new ${data.type || 'attachment'} "${data.attachment_id}"`,
          attachment_id: data.attachment_id,
          type: data.type,
          version: data.version,
        },
      },
    ];
  },
});
