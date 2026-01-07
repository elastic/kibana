/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { platformCoreTools, ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createErrorResult, getToolResultId } from '@kbn/agent-builder-server';
import type { AttachmentToolsOptions } from './types';

const attachmentUpdateSchema = z.object({
  attachment_id: z.string().describe('ID of the attachment to update'),
  data: z.unknown().describe('New data/content for the attachment'),
  description: z.string().optional().describe('Optional new description for the attachment'),
});

/**
 * Creates the attachment_update tool.
 * Updates an attachment's content, creating a new version if content changed.
 */
export const createAttachmentUpdateTool = ({
  attachmentManager,
}: AttachmentToolsOptions): BuiltinToolDefinition<typeof attachmentUpdateSchema> => ({
  id: platformCoreTools.attachmentUpdate,
  type: ToolType.builtin,
  description:
    'Update the content of an existing attachment. This creates a new version if the content changed. Use this to modify data you previously stored.',
  schema: attachmentUpdateSchema,
  tags: ['attachment'],
  handler: async ({ attachment_id: attachmentId, data, description }, _context) => {
    const existing = attachmentManager.get(attachmentId);

    if (!existing) {
      return {
        results: [
          createErrorResult({
            message: `Attachment with ID '${attachmentId}' not found`,
            metadata: { attachmentId },
          }),
        ],
      };
    }

    if (existing.active === false) {
      return {
        results: [
          createErrorResult({
            message: `Cannot update deleted attachment '${attachmentId}'. Restore it first.`,
            metadata: { attachmentId },
          }),
        ],
      };
    }

    const previousVersion = existing.current_version;

    const updated = attachmentManager.update(attachmentId, { data, description });

    if (!updated) {
      return {
        results: [
          createErrorResult({
            message: `Failed to update attachment '${attachmentId}'`,
            metadata: { attachmentId },
          }),
        ],
      };
    }

    return {
      results: [
        {
          tool_result_id: getToolResultId(),
          type: ToolResultType.other,
          data: {
            type: updated.type,
            version: updated.current_version,
            version_created: updated.current_version !== previousVersion,
          },
        },
      ],
    };
  },
});
