/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { attachmentTools, ToolType } from '@kbn/agent-builder-common';
import {
  ToolResultType,
  isImageResult,
  isOtherResult,
} from '@kbn/agent-builder-common/tools/tool_result';
import type { InternalBuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createErrorResult, getToolResultId } from '@kbn/agent-builder-server';
import type { AttachmentToolsOptions } from './types';

const attachmentReadSchema = z.object({
  attachment_id: z.string().describe('ID of the attachment to read'),
  version: z
    .number()
    .min(1)
    .optional()
    .describe('Specific version to read (defaults to current version)'),
});

/**
 * Creates the attachment_read tool.
 * Reads the content of an attachment by ID, optionally at a specific version.
 */
export const createAttachmentReadTool = ({
  attachmentManager,
  attachmentsService,
  formatContext,
}: AttachmentToolsOptions): InternalBuiltinToolDefinition<typeof attachmentReadSchema> => ({
  id: attachmentTools.read,
  type: ToolType.builtin,
  description:
    'Read the content of a conversation attachment by ID. Use this to retrieve data you previously stored or to check the current state of an attachment.',
  schema: attachmentReadSchema,
  tags: ['attachment'],
  excludeFromMcp: true,
  handler: async ({ attachment_id: attachmentId, version }) => {
    const attachment = attachmentManager.get(attachmentId, {
      version,
    });

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

    const { data: versionData, type } = attachment;

    const representation =
      attachmentsService && formatContext
        ? await tryGetRepresentation({
            attachment: {
              id: attachment.id,
              type: attachment.type,
              data: versionData.data,
            },
            attachmentsService,
            formatContext,
          })
        : undefined;

    if (representation?.type === 'image') {
      // Image bytes are NOT inlined in the tool result — they would bloat
      // context and be persisted to ES. `getBase64` is called later by the
      // prompt builder when the image is delivered to the LLM.
      const imageData = versionData.data as { mime_type?: string; name?: string };
      const name = imageData.name ?? attachmentId;
      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.image,
            data: {
              attachment_id: attachmentId,
              mime_type: representation.mimeType,
              name: imageData.name,
              description: `Image attachment "${name}" (${representation.mimeType}). The image was provided as visual input for this turn. Call attachment_read again to view it in the current turn.`,
            },
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
            attachment_id: attachmentId,
            type,
            version: attachment.version,
            data: representation?.type === 'text' ? representation.value : versionData.data,
          },
        },
      ],
    };
  },
  summarizeToolReturn: (toolReturn) => {
    if (toolReturn.results.length === 0) return undefined;
    const result = toolReturn.results[0];

    // Image markers are already minimal (~200 bytes) — pass through unchanged.
    if (isImageResult(result)) return [result];

    if (!isOtherResult(result)) return undefined;
    const data = result.data as Record<string, unknown>;

    const attachmentId = data.attachment_id || 'unknown';
    return [
      {
        ...result,
        data: {
          summary: `Read ${data.type || 'attachment'} "${attachmentId}" v${data.version ?? '?'}`,
          attachment_id: attachmentId,
          type: data.type,
          version: data.version,
        },
      },
    ];
  },
});

const tryGetRepresentation = async ({
  attachment,
  attachmentsService,
  formatContext,
}: {
  attachment: { id: string; type: string; data: unknown };
  attachmentsService: NonNullable<AttachmentToolsOptions['attachmentsService']>;
  formatContext: NonNullable<AttachmentToolsOptions['formatContext']>;
}) => {
  const definition = attachmentsService.getTypeDefinition(attachment.type);
  if (!definition?.isReadonly) return undefined;

  try {
    const formatted = await definition.format(attachment, formatContext);
    if (!formatted.getRepresentation) return undefined;
    return await formatted.getRepresentation();
  } catch {
    return undefined;
  }
};
