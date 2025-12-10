/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { platformCoreTools, ToolType } from '@kbn/onechat-common';
import type { BuiltinToolDefinition, ToolHandlerReturn } from '@kbn/onechat-server';
import { createErrorResult } from '@kbn/onechat-server';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { AttachmentStateManager } from '@kbn/onechat-server/attachments';
import { getLatestVersion } from '@kbn/onechat-common/attachments';

// Schema definitions for each tool

const attachmentReadSchema = z.object({
  attachment_id: z.string().describe('ID of the attachment to read'),
  version: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Specific version to read (defaults to current)'),
});

const attachmentUpdateSchema = z.object({
  attachment_id: z.string().describe('ID of the attachment to update'),
  content: z.unknown().describe('New content for the attachment'),
  description: z.string().optional().describe('Optional new description for the attachment'),
});

const attachmentAddSchema = z.object({
  type: z.string().describe('Type of attachment (e.g., "text", "esql", "screen_context")'),
  content: z.unknown().describe('Content of the attachment'),
  description: z.string().optional().describe('Human-readable description of the attachment'),
});

const attachmentDeleteSchema = z.object({
  attachment_id: z.string().describe('ID of the attachment to delete'),
});

const attachmentListSchema = z.object({
  include_deleted: z.boolean().optional().describe('Whether to include deleted attachments'),
});

const attachmentDiffSchema = z.object({
  attachment_id: z.string().describe('ID of the attachment'),
  from_version: z.number().int().positive().describe('Starting version for the diff'),
  to_version: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Ending version for the diff (defaults to current)'),
});

/**
 * Creates attachment tools that operate on the provided AttachmentStateManager.
 * These tools allow the LLM to read, update, add, delete, and list conversation-level attachments.
 *
 * @param attachmentManager - The attachment state manager for the current conversation
 * @returns Array of builtin tool definitions
 */
export const createAttachmentTools = (
  attachmentManager: AttachmentStateManager
): Array<BuiltinToolDefinition<any>> => {
  const tools: Array<BuiltinToolDefinition<any>> = [
    // attachment_read - Read the full content of an attachment
    {
      id: platformCoreTools.attachmentRead,
      type: ToolType.builtin,
      description:
        'Read the full content of a conversation attachment by ID. Use this to access attachment data.',
      schema: attachmentReadSchema,
      handler: async ({ attachment_id, version }): Promise<ToolHandlerReturn> => {
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

        const targetVersion = version
          ? attachmentManager.getVersion(attachment_id, version)
          : getLatestVersion(attachment);

        if (!targetVersion) {
          return {
            results: [
              createErrorResult({
                message: `Version ${version} not found for attachment '${attachment_id}'`,
                metadata: { attachment_id, version },
              }),
            ],
          };
        }

        return {
          results: [
            {
              type: ToolResultType.resource,
              data: {
                __attachment_operation__: 'read',
                attachment_id,
                version: targetVersion.version,
                type: attachment.type,
                content: targetVersion.data,
                status: targetVersion.status,
                description: attachment.description,
              },
            },
          ],
        };
      },
      tags: ['attachment'],
    },

    // attachment_update - Update an attachment (creates new version)
    {
      id: platformCoreTools.attachmentUpdate,
      type: ToolType.builtin,
      description:
        'Update a conversation attachment. Creates a new version with the provided content.',
      schema: attachmentUpdateSchema,
      handler: async ({ attachment_id, content, description }): Promise<ToolHandlerReturn> => {
        const newVersion = attachmentManager.update(attachment_id, content, description);

        if (!newVersion) {
          return {
            results: [
              createErrorResult({
                message: `Attachment with ID '${attachment_id}' not found`,
                metadata: { attachment_id },
              }),
            ],
          };
        }

        return {
          results: [
            {
              type: ToolResultType.resource,
              data: {
                __attachment_operation__: 'update',
                attachment_id,
                new_version: newVersion.version,
                message: `Successfully updated attachment to version ${newVersion.version}`,
              },
            },
          ],
        };
      },
      tags: ['attachment'],
    },

    // attachment_add - Add a new attachment
    {
      id: platformCoreTools.attachmentAdd,
      type: ToolType.builtin,
      description: 'Add a new attachment to the conversation.',
      schema: attachmentAddSchema,
      handler: async ({ type, content, description }): Promise<ToolHandlerReturn> => {
        const attachment = attachmentManager.add({
          type,
          data: content,
          description,
        });

        return {
          results: [
            {
              type: ToolResultType.resource,
              data: {
                __attachment_operation__: 'add',
                attachment_id: attachment.id,
                type: attachment.type,
                version: 1,
                message: `Successfully added new ${type} attachment`,
              },
            },
          ],
        };
      },
      tags: ['attachment'],
    },

    // attachment_delete - Soft-delete an attachment
    {
      id: platformCoreTools.attachmentDelete,
      type: ToolType.builtin,
      description:
        'Soft-delete an attachment from the conversation. The attachment can be restored later.',
      schema: attachmentDeleteSchema,
      handler: async ({ attachment_id }): Promise<ToolHandlerReturn> => {
        const success = attachmentManager.delete(attachment_id);

        if (!success) {
          return {
            results: [
              createErrorResult({
                message: `Attachment with ID '${attachment_id}' not found or already deleted`,
                metadata: { attachment_id },
              }),
            ],
          };
        }

        return {
          results: [
            {
              type: ToolResultType.resource,
              data: {
                __attachment_operation__: 'delete',
                attachment_id,
                message: `Successfully deleted attachment`,
              },
            },
          ],
        };
      },
      tags: ['attachment'],
    },

    // attachment_list - List all attachments
    {
      id: platformCoreTools.attachmentList,
      type: ToolType.builtin,
      description: 'List all attachments in the conversation with their summaries.',
      schema: attachmentListSchema,
      handler: async ({ include_deleted }): Promise<ToolHandlerReturn> => {
        const attachments = include_deleted
          ? attachmentManager.getAll()
          : attachmentManager.getActive();

        const summaries = attachments.map((attachment) => {
          const latest = getLatestVersion(attachment);
          return {
            id: attachment.id,
            type: attachment.type,
            version: attachment.current_version,
            status: latest?.status ?? 'unknown',
            description: attachment.description,
            estimated_tokens: latest?.estimated_tokens,
          };
        });

        return {
          results: [
            {
              type: ToolResultType.resource,
              data: {
                __attachment_operation__: 'list',
                count: summaries.length,
                attachments: summaries,
                total_estimated_tokens: attachmentManager.getTotalTokenEstimate(),
              },
            },
          ],
        };
      },
      tags: ['attachment'],
    },

    // attachment_diff - Get diff between two versions
    {
      id: platformCoreTools.attachmentDiff,
      type: ToolType.builtin,
      description: 'Get the diff between two versions of an attachment to understand what changed.',
      schema: attachmentDiffSchema,
      handler: async ({ attachment_id, from_version, to_version }): Promise<ToolHandlerReturn> => {
        const diff = attachmentManager.getDiff(attachment_id, from_version, to_version);

        if (!diff) {
          return {
            results: [
              createErrorResult({
                message: `Could not generate diff for attachment '${attachment_id}'`,
                metadata: { attachment_id, from_version, to_version },
              }),
            ],
          };
        }

        return {
          results: [
            {
              type: ToolResultType.resource,
              data: {
                __attachment_operation__: 'diff',
                attachment_id,
                from_version,
                to_version: to_version ?? 'current',
                ...diff,
              },
            },
          ],
        };
      },
      tags: ['attachment'],
    },
  ];

  return tools;
};

/**
 * Tool IDs for attachment operations.
 * Can be used to selectively enable/disable tools based on presentation mode.
 */
export const attachmentToolIds = {
  read: platformCoreTools.attachmentRead,
  update: platformCoreTools.attachmentUpdate,
  add: platformCoreTools.attachmentAdd,
  delete: platformCoreTools.attachmentDelete,
  list: platformCoreTools.attachmentList,
  diff: platformCoreTools.attachmentDiff,
} as const;

/**
 * Tool IDs for inline presentation mode (few attachments).
 * When attachments are inlined, reading is unnecessary.
 */
export const inlineModeAttachmentToolIds = [
  attachmentToolIds.update,
  attachmentToolIds.add,
  attachmentToolIds.delete,
];

/**
 * Tool IDs for summary presentation mode (many attachments).
 * All tools are needed when attachments are summarized.
 */
export const summaryModeAttachmentToolIds = [
  attachmentToolIds.read,
  attachmentToolIds.update,
  attachmentToolIds.add,
  attachmentToolIds.delete,
  attachmentToolIds.list,
  attachmentToolIds.diff,
];
