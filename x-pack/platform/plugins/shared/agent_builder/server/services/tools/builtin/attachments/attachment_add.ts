/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { AttachmentToolsOptions } from './types';

const attachmentAddSchema = z.object({
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
}: AttachmentToolsOptions): BuiltinToolDefinition<typeof attachmentAddSchema> => ({
  id: platformCoreTools.attachmentAdd,
  type: ToolType.builtin,
  description:
    'Create a new attachment to store data for later use in the conversation. Attachments persist across conversation rounds and can be read, updated, or deleted.',
  schema: attachmentAddSchema,
  tags: ['attachment'],
  handler: async ({ type, data, description }, _context) => {
    const attachment = attachmentManager.add({ type, data, description });

    return {
      results: [
        {
          tool_result_id: getToolResultId(),
          type: ToolResultType.other,
          data: {
            __attachment_operation__: 'add',
            attachment_id: attachment.id,
            type: attachment.type,
            description: attachment.description,
            version: attachment.current_version,
            estimated_tokens: attachment.versions[0]?.estimated_tokens,
          },
        },
      ],
    };
  },
});
