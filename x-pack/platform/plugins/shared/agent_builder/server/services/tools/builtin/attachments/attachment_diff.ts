/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { getVersion } from '@kbn/agent-builder-common/attachments';
import { ToolResultType, isOtherResult } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createErrorResult, getToolResultId } from '@kbn/agent-builder-server';
import type { AttachmentToolsOptions } from './types';

const attachmentDiffSchema = z.object({
  attachment_id: z.string().describe('ID of the attachment to compare versions'),
  from_version: z.number().min(1).describe('Starting version number'),
  to_version: z.number().min(1).describe('Ending version number'),
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
  handler: async ({
    attachment_id: attachmentId,
    from_version: fromVersion,
    to_version: toVersion,
  }) => {
    const attachment = attachmentManager.getAttachmentRecord(attachmentId);

    if (!attachment) {
      return {
        results: [
          createErrorResult({
            message: `Attachment with ID '${attachmentId}' not found`,
            metadata: { attachment_id: attachmentId },
          }),
        ],
      };
    }

    const diff = attachmentManager.getDiff(attachmentId, fromVersion, toVersion);

    if (!diff) {
      return {
        results: [
          createErrorResult({
            message: `Could not compute diff between versions ${fromVersion} and ${toVersion} for attachment '${attachmentId}'`,
            metadata: {
              attachment_id: attachmentId,
              from_version: fromVersion,
              to_version: toVersion,
            },
          }),
        ],
      };
    }

    const fromVersionData = getVersion(attachment, fromVersion);
    const toVersionData = getVersion(attachment, toVersion);

    return {
      results: [
        {
          tool_result_id: getToolResultId(),
          type: ToolResultType.other,
          data: {
            __attachment_operation__: 'diff',
            attachment_id: attachmentId,
            from_version: fromVersion,
            to_version: toVersion,
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
  summarizeToolReturn: (toolReturn) => {
    if (toolReturn.results.length === 0) return undefined;
    const result = toolReturn.results[0];
    if (!isOtherResult(result)) return undefined;
    const data = result.data as Record<string, unknown>;
    if (data.__attachment_operation__ !== 'diff') return undefined;

    return [
      {
        ...result,
        data: {
          summary: `Compared attachment "${data.attachment_id}" v${data.from_version} to v${
            data.to_version
          }: ${data.change_type || 'changes found'}`,
          attachment_id: data.attachment_id,
          from_version: data.from_version,
          to_version: data.to_version,
          change_type: data.change_type,
        },
      },
    ];
  },
});
