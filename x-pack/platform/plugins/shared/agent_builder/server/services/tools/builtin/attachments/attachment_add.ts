/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { attachmentTools, ToolType } from '@kbn/agent-builder-common';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import { ToolResultType, isOtherResult } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { AttachmentToolsOptions } from './types';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Normalizes LLM tool input into the canonical attachment_add shape.
 * Models often omit the `data` wrapper or pass a string instead of an object.
 */
export const normalizeAttachmentAddInput = (
  input: unknown
): { id?: string; type: string; data: Record<string, unknown>; description?: string } => {
  if (!isPlainObject(input)) {
    throw new Error('Attachment add parameters must be a JSON object');
  }

  const { id, type, description, data, ...rest } = input;

  if (typeof type !== 'string' || type.length === 0) {
    throw new Error('Attachment type is required');
  }

  let resolvedData: Record<string, unknown>;

  if (data !== undefined) {
    if (typeof data === 'string') {
      resolvedData = { content: data };
    } else if (isPlainObject(data)) {
      resolvedData = data;
    } else {
      throw new Error('Attachment data must be a JSON object');
    }
  } else if (Object.keys(rest).length > 0) {
    resolvedData = rest;
  } else {
    throw new Error('Attachment data is required (use a `data` object or pass fields at the top level)');
  }

  return {
    ...(typeof id === 'string' ? { id } : {}),
    type,
    data: resolvedData,
    ...(typeof description === 'string' ? { description } : {}),
  };
};

const attachmentAddSchema = z
  .object({
    id: z.string().optional().describe('Optional custom ID for the attachment'),
    type: z.string().describe('Type of attachment (e.g., "text", "json", "code")'),
    data: z
      .record(z.string(), z.any())
      .optional()
      .describe(
        'The attachment payload as a JSON object. Required before the attachment is created — ' +
          'either pass it here or pass attachment fields at the top level (they are folded into `data`).'
      ),
    description: z.string().optional().describe('Human-readable description of the attachment'),
  })
  .catchall(z.any())
  .describe(
    'Create a conversation attachment. Prefer `{ "type": "<type>", "data": { ... } }`. ' +
      'Example: `{ "type": "threat-intel-subscription-confirmation", "data": { "tags": ["ransomware"], "severity_threshold": "high", ... } }`.'
  );

/**
 * Creates the attachment_add tool.
 * Creates a new attachment with the specified type and content.
 */
export const createAttachmentAddTool = ({
  attachmentManager,
  attachmentsService,
}: AttachmentToolsOptions): BuiltinToolDefinition<typeof attachmentAddSchema> => ({
  id: attachmentTools.add,
  type: ToolType.builtin,
  description:
    'Create a new attachment to store data for later use in the conversation. Required: `type` and a `data` object with the attachment payload. ' +
    'Example: `{ "type": "threat-intel-subscription-confirmation", "data": { "tags": ["ransomware"], "severity_threshold": "high", ... } }`. ' +
    'Attachments persist across conversation rounds and can be read, updated, or deleted.',
  schema: attachmentAddSchema,
  tags: ['attachment'],
  handler: async (params, _context) => {
    const { id, type, data, description } = normalizeAttachmentAddInput(params);
    const definition = attachmentsService?.getTypeDefinition(type);
    if (!definition) {
      const validTypes = attachmentsService?.getRegisteredTypeIds() ?? [];
      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.error,
            data: {
              message: `Unknown attachment type '${type}'. Valid attachment types are: ${validTypes.join(
                ', '
              )}`,
            },
          },
        ],
      };
    }
    const isReadonly = definition.isReadonly ?? false;
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
