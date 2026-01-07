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

const attachmentReadSchema = z.object({
  attachment_id: z.string().describe('ID of the attachment to read'),
  version: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Specific version to read (defaults to current version)'),
});

/**
 * Creates the attachment_read tool.
 * Reads the content of an attachment by ID, optionally at a specific version.
 */
export const createAttachmentReadTool = ({
  attachmentManager,
}: AttachmentToolsOptions): BuiltinToolDefinition<typeof attachmentReadSchema> => ({
  id: platformCoreTools.attachmentRead,
  type: ToolType.builtin,
  description:
    'Read the content of a conversation attachment by ID. Use this to retrieve data you previously stored or to check the current state of an attachment.',
  schema: attachmentReadSchema,
  tags: ['attachment'],
  handler: async ({ attachment_id: attachmentId, version }, _context) => {
    const attachment = attachmentManager.get(attachmentId);

    if (!attachment) {
      return {
        results: [
          createErrorResult({
            message: `Attachment with ID '${attachmentId}' not found`,
            metadata: { attachmentId },
          }),
        ],
      };
    }

    const versionData = version
      ? attachmentManager.getVersion(attachmentId, version)
      : attachmentManager.getLatest(attachmentId);

    if (!versionData) {
      return {
        results: [
          createErrorResult({
            message: `Version ${version} not found for attachment '${attachmentId}'`,
            metadata: { attachmentId, version },
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
            type: attachment.type,
            data: versionData.data,
          },
        },
      ],
    };
  },
});
