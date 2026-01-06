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

const attachmentDiffSchema = z.object({
  attachment_id: z.string().describe('ID of the attachment to compare versions'),
  from_version: z.number().int().positive().describe('Starting version number'),
  to_version: z.number().int().positive().describe('Ending version number'),
});

/**
 * Creates the attachment_diff tool.
 * Shows differences between two versions of an attachment.
 */
export const createAttachmentDiffTool = ({
  attachmentManager,
}: AttachmentToolsOptions): BuiltinToolDefinition<typeof attachmentDiffSchema> => ({
  id: platformCoreTools.attachmentDiff,
  type: ToolType.builtin,
  description:
    'Compare two versions of an attachment to see what changed. Use this to understand the history of modifications.',
  schema: attachmentDiffSchema,
  tags: ['attachment'],
  handler: async ({ attachment_id, from_version, to_version }, _context) => {
    const attachment = attachmentManager.get(attachment_id);

    if (!attachment) {
      return {
        results: [
          createErrorResult({
            message: `Attachment with ID '${attachment_id}' not found`,
            metadata: { attachment_id },
          }),
        ],
      };
    }

    const diff = attachmentManager.getDiff(attachment_id, from_version, to_version);

    if (!diff) {
      return {
        results: [
          createErrorResult({
            message: `Could not compute diff between versions ${from_version} and ${to_version} for attachment '${attachment_id}'`,
            metadata: { attachment_id, from_version, to_version },
          }),
        ],
      };
    }

    const fromVersionData = attachmentManager.getVersion(attachment_id, from_version);
    const toVersionData = attachmentManager.getVersion(attachment_id, to_version);

    return {
      results: [
        {
          tool_result_id: getToolResultId(),
          type: ToolResultType.other,
          data: {
            attachment_id,
            from_version,
            to_version,
            change_type: diff.change_type,
            summary: diff.summary,
            changed_fields: diff.changed_fields,
            from_data: fromVersionData?.data,
            to_data: toVersionData?.data,
          },
        },
      ],
    };
  },
});
