/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { attachmentTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType, isOtherResult } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
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
}: AttachmentToolsOptions): BuiltinToolDefinition<typeof attachmentReadSchema> => ({
  id: attachmentTools.read,
  type: ToolType.builtin,
  description:
    'Read the content of a conversation attachment by ID. Use this to retrieve data you previously stored or to check the current state of an attachment.',
  schema: attachmentReadSchema,
  tags: ['attachment'],
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

    // Check if this is an image attachment — if so, return a small marker instead of inlining bytes.
    // The bytes are fetched lazily by the prompt builder (formatActions via imageResolver).
    // Base64 must never enter tool results: it would be persisted to ES and ~350k tokens large.
    if (attachmentsService && formatContext) {
      const definition = attachmentsService.getTypeDefinition(attachment.type);
      const typeReadonly = definition?.isReadonly ?? false;
      if (definition && typeReadonly) {
        try {
          const formatted = await definition.format(
            {
              id: attachment.id,
              type: attachment.type,
              data: versionData.data,
            },
            formatContext
          );
          if (formatted.getRepresentation) {
            const representation = await formatted.getRepresentation();
            if (representation.type === 'image') {
              // Return an image marker — ~200 bytes, safe to persist.
              // getBase64 is intentionally NOT called here.
              const imageData = versionData.data as { mime_type?: string; name?: string };
              return {
                results: [
                  {
                    tool_result_id: getToolResultId(),
                    type: ToolResultType.image,
                    data: {
                      attachment_id: attachmentId,
                      mime_type: representation.mimeType,
                      name: imageData.name,
                      description: `Image attachment "${imageData.name ?? attachmentId}" (${representation.mimeType}). The image is provided as visual input in the message following this tool result.`,
                    },
                  },
                ],
              };
            }
            // For text representations, inline as before
            return {
              results: [
                {
                  tool_result_id: getToolResultId(),
                  type: ToolResultType.other,
                  data: {
                    attachment_id: attachmentId,
                    type,
                    version: attachment.version,
                    data: representation.value,
                  },
                },
              ],
            };
          }
        } catch {
          // fall through to raw data below
        }
      }
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
            data: versionData.data,
          },
        },
      ],
    };
  },
  summarizeToolReturn: (toolReturn) => {
    if (toolReturn.results.length === 0) return undefined;
    const result = toolReturn.results[0];

    // POC: image results skip summarization — they're already minimal (~200 bytes).
    // Future improvement: add an isImageResult branch that returns the result unchanged.
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
