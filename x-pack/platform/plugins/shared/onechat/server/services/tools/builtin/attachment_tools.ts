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
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import {
  getLatestVersion,
  AttachmentType,
  hashContent,
  type VisualizationRefAttachmentData,
  type VisualizationRefSavedObjectType,
} from '@kbn/onechat-common/attachments';
import { savedObjectResolver } from '../../attachments/saved_object_resolver';

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

const attachmentAddRefSchema = z.object({
  saved_object_id: z.string().describe('ID of the saved visualization to reference'),
  saved_object_type: z
    .enum(['lens', 'visualization', 'map'])
    .default('lens')
    .describe('Type of saved object (lens, visualization, or map)'),
  description: z.string().optional().describe('Description for this attachment'),
});

/**
 * Options for creating attachment tools.
 */
export interface CreateAttachmentToolsOptions {
  /** The attachment state manager for the current conversation */
  attachmentManager: AttachmentStateManager;
  /** Optional saved objects client for resolving reference attachments */
  savedObjectsClient?: SavedObjectsClientContract;
}

/**
 * Creates attachment tools that operate on the provided AttachmentStateManager.
 * These tools allow the LLM to read, update, add, delete, and list conversation-level attachments.
 *
 * @param attachmentManager - The attachment state manager for the current conversation
 * @returns Array of builtin tool definitions
 *
 * @deprecated Use createAttachmentToolsWithOptions instead for full functionality
 */
export const createAttachmentTools = (
  attachmentManager: AttachmentStateManager
): Array<BuiltinToolDefinition<any>> => {
  return createAttachmentToolsWithOptions({ attachmentManager });
};

/**
 * Creates attachment tools with full options support.
 * These tools allow the LLM to read, update, add, delete, and list conversation-level attachments.
 *
 * @param options - Options including attachment manager and optional saved objects client
 * @returns Array of builtin tool definitions
 */
export const createAttachmentToolsWithOptions = ({
  attachmentManager,
  savedObjectsClient,
}: CreateAttachmentToolsOptions): Array<BuiltinToolDefinition<any>> => {
  const tools: Array<BuiltinToolDefinition<any>> = [
    // attachment_read - Read the full content of an attachment
    {
      id: platformCoreTools.attachmentRead,
      type: ToolType.builtin,
      description:
        'Read the full content of a conversation attachment by ID. Use this to access attachment data. For reference attachments, this resolves the current content from the saved object.',
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

        // Handle visualization_ref attachments specially - resolve from saved object
        if (attachment.type === AttachmentType.visualizationRef) {
          return handleVisualizationRefRead({
            attachment_id,
            attachment,
            attachmentManager,
            savedObjectsClient,
          });
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
        'Update a conversation attachment. Creates a new version with the provided content. Note: Reference attachments (visualization_ref) cannot be updated - they are read-only.',
      schema: attachmentUpdateSchema,
      handler: async ({ attachment_id, content, description }): Promise<ToolHandlerReturn> => {
        // Check if this is a reference attachment - these are read-only
        const attachment = attachmentManager.get(attachment_id);
        if (attachment?.type === AttachmentType.visualizationRef) {
          return {
            results: [
              createErrorResult({
                message: `Reference attachments cannot be modified. Attachment '${attachment_id}' is a visualization_ref that points to a saved object. To modify the visualization, edit the saved object directly in the Kibana UI.`,
                metadata: { attachment_id, type: attachment.type },
              }),
            ],
          };
        }

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

    // attachment_add_ref - Add a reference to a saved visualization
    {
      id: platformCoreTools.attachmentAddRef,
      type: ToolType.builtin,
      description:
        'Add a reference to a saved visualization (Lens, Visualization, or Map) as an attachment. The visualization content is resolved dynamically when read, so changes to the saved object are reflected automatically.',
      schema: attachmentAddRefSchema,
      handler: async ({
        saved_object_id,
        saved_object_type,
        description,
      }): Promise<ToolHandlerReturn> => {
        // Validate the saved object exists before creating the reference
        if (savedObjectsClient) {
          const resolution = await savedObjectResolver.resolve(
            saved_object_id,
            saved_object_type as VisualizationRefSavedObjectType,
            savedObjectsClient
          );

          if (!resolution.found) {
            return {
              results: [
                createErrorResult({
                  message: resolution.error || `Saved object not found: ${saved_object_type}/${saved_object_id}`,
                  metadata: { saved_object_id, saved_object_type },
                }),
              ],
            };
          }

          // Create the reference attachment with cached metadata
          const refData: VisualizationRefAttachmentData = {
            saved_object_id,
            saved_object_type: saved_object_type as VisualizationRefSavedObjectType,
            title: resolution.title,
            description: resolution.description,
            last_resolved_at: new Date().toISOString(),
          };

          const attachment = attachmentManager.add({
            type: AttachmentType.visualizationRef,
            data: refData,
            description: description || resolution.title || `${saved_object_type} reference`,
          });

          return {
            results: [
              {
                type: ToolResultType.resource,
                data: {
                  __attachment_operation__: 'add_ref',
                  attachment_id: attachment.id,
                  type: AttachmentType.visualizationRef,
                  saved_object_id,
                  saved_object_type,
                  title: resolution.title,
                  message: `Successfully added reference to ${saved_object_type} "${resolution.title || saved_object_id}"`,
                },
              },
            ],
          };
        } else {
          // No savedObjectsClient - create reference without validation
          const refData: VisualizationRefAttachmentData = {
            saved_object_id,
            saved_object_type: saved_object_type as VisualizationRefSavedObjectType,
          };

          const attachment = attachmentManager.add({
            type: AttachmentType.visualizationRef,
            data: refData,
            description: description || `${saved_object_type} reference`,
          });

          return {
            results: [
              {
                type: ToolResultType.resource,
                data: {
                  __attachment_operation__: 'add_ref',
                  attachment_id: attachment.id,
                  type: AttachmentType.visualizationRef,
                  saved_object_id,
                  saved_object_type,
                  message: `Successfully added reference to ${saved_object_type}/${saved_object_id} (not validated)`,
                },
              },
            ],
          };
        }
      },
      tags: ['attachment'],
    },
  ];

  return tools;
};

/**
 * Helper function to handle reading visualization_ref attachments.
 * Resolves the saved object and returns the current content.
 * Also handles versioning - if the content has changed since last read,
 * creates a new version of the attachment.
 */
async function handleVisualizationRefRead({
  attachment_id,
  attachment,
  attachmentManager,
  savedObjectsClient,
}: {
  attachment_id: string;
  attachment: { type: string; description?: string };
  attachmentManager: AttachmentStateManager;
  savedObjectsClient?: SavedObjectsClientContract;
}): Promise<ToolHandlerReturn> {
  const latestVersion = attachmentManager.getLatest(attachment_id);
  if (!latestVersion) {
    return {
      results: [
        createErrorResult({
          message: `No version found for attachment '${attachment_id}'`,
          metadata: { attachment_id },
        }),
      ],
    };
  }

  const refData = latestVersion.data as VisualizationRefAttachmentData;

  // If no savedObjectsClient, return the reference data without resolution
  if (!savedObjectsClient) {
    return {
      results: [
        {
          type: ToolResultType.resource,
          data: {
            __attachment_operation__: 'read',
            attachment_id,
            version: latestVersion.version,
            type: attachment.type,
            is_reference: true,
            reference: {
              saved_object_id: refData.saved_object_id,
              saved_object_type: refData.saved_object_type,
              title: refData.title,
            },
            content: refData.resolved_content || null,
            status: latestVersion.status,
            description: attachment.description,
            warning: 'Reference could not be resolved (no saved objects client available)',
          },
        },
      ],
    };
  }

  // Resolve the saved object
  const resolution = await savedObjectResolver.resolve(
    refData.saved_object_id,
    refData.saved_object_type,
    savedObjectsClient
  );

  if (!resolution.found) {
    return {
      results: [
        {
          type: ToolResultType.resource,
          data: {
            __attachment_operation__: 'read',
            attachment_id,
            version: latestVersion.version,
            type: attachment.type,
            is_reference: true,
            reference: {
              saved_object_id: refData.saved_object_id,
              saved_object_type: refData.saved_object_type,
              title: refData.title,
            },
            content: null,
            status: 'not_found',
            description: attachment.description,
            error: resolution.error,
          },
        },
      ],
    };
  }

  // Check if content has changed by comparing hashes
  const newContentHash = hashContent(resolution.content);
  const cachedContentHash = refData.resolved_content ? hashContent(refData.resolved_content) : null;
  const contentChanged = cachedContentHash !== null && cachedContentHash !== newContentHash;

  // Get the current version number (may change if we update)
  let currentVersion = latestVersion.version;

  // If content has changed, update the attachment to create a new version
  if (contentChanged) {
    // eslint-disable-next-line no-console
    console.debug('[handleVisualizationRefRead] Content changed, creating new version', {
      attachment_id,
      oldHash: cachedContentHash,
      newHash: newContentHash,
    });

    // Update attachment data with new resolved content
    const updatedRefData: VisualizationRefAttachmentData = {
      ...refData,
      title: resolution.title || refData.title,
      description: resolution.description || refData.description,
      last_resolved_at: new Date().toISOString(),
      resolved_content: resolution.content,
    };

    // This creates a new version because the content hash changed
    const newVersion = attachmentManager.update(attachment_id, updatedRefData);
    if (newVersion) {
      currentVersion = newVersion.version;
    }
  } else if (!refData.resolved_content) {
    // First read - cache the content without creating a new version
    // We do this by updating with the same content hash (no version bump)
    // Actually, we need to update to cache it, which will create version 2
    // eslint-disable-next-line no-console
    console.debug('[handleVisualizationRefRead] First read, caching content', {
      attachment_id,
      newHash: newContentHash,
    });

    const updatedRefData: VisualizationRefAttachmentData = {
      ...refData,
      title: resolution.title || refData.title,
      description: resolution.description || refData.description,
      last_resolved_at: new Date().toISOString(),
      resolved_content: resolution.content,
    };

    // This will create a new version (2) on first read to cache the content
    const newVersion = attachmentManager.update(attachment_id, updatedRefData);
    if (newVersion) {
      currentVersion = newVersion.version;
    }
  }

  // Return the resolved content (without the cached resolved_content)
  return {
    results: [
      {
        type: ToolResultType.resource,
        data: {
          __attachment_operation__: 'read',
          attachment_id,
          version: currentVersion,
          type: attachment.type,
          is_reference: true,
          reference: {
            saved_object_id: refData.saved_object_id,
            saved_object_type: refData.saved_object_type,
            title: resolution.title || refData.title,
            updated_at: resolution.updated_at,
          },
          content: resolution.content,
          status: latestVersion.status,
          description: attachment.description,
          last_resolved_at: new Date().toISOString(),
        },
      },
    ],
  };
}

/**
 * Tool IDs for attachment operations.
 * Can be used to selectively enable/disable tools based on presentation mode.
 */
export const attachmentToolIds = {
  read: platformCoreTools.attachmentRead,
  update: platformCoreTools.attachmentUpdate,
  add: platformCoreTools.attachmentAdd,
  addRef: platformCoreTools.attachmentAddRef,
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
  attachmentToolIds.addRef,
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
  attachmentToolIds.addRef,
  attachmentToolIds.delete,
  attachmentToolIds.list,
  attachmentToolIds.diff,
];
