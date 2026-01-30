/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType, isOtherResult } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { AttachmentToolsOptions } from './types';

const attachmentListSchema = z.object({
  include_deleted: z
    .boolean()
    .optional()
    .describe('Whether to include deleted attachments in the list (default: false)'),
});

/**
 * Creates the attachment_list tool.
 * Lists all attachments with their metadata.
 */
export const createAttachmentListTool = ({
  attachmentManager,
}: AttachmentToolsOptions): BuiltinToolDefinition<typeof attachmentListSchema> => ({
  id: platformCoreTools.attachmentList,
  type: ToolType.builtin,
  description:
    'List all attachments in the conversation with their metadata. Use this to see what data is available.',
  schema: attachmentListSchema,
  tags: ['attachment'],
  handler: async ({ include_deleted: includeDeleted }) => {
    const attachments = includeDeleted ? attachmentManager.getAll() : attachmentManager.getActive();

    const attachmentList = attachments.map((attachment) => {
      return {
        attachment_id: attachment.id,
        type: attachment.type,
        description: attachment.description,
        current_version: attachment.current_version,
        readonly: attachment.readonly ?? true,
      };
    });

    return {
      results: [
        {
          tool_result_id: getToolResultId(),
          type: ToolResultType.other,
          data: {
            count: attachmentList.length,
            attachments: attachmentList,
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
          summary: `Listed ${data.count ?? '?'} attachments`,
          count: data.count,
        },
      },
    ];
  },
});
