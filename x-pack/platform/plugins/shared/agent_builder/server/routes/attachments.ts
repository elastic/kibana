/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { schema } from '@kbn/config-schema';
import type { ConversationRound, ToolCallStep } from '@kbn/agent-builder-common';
import { isToolCallStep } from '@kbn/agent-builder-common';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import type {
  ListAttachmentsResponse,
  CreateAttachmentResponse,
  UpdateAttachmentResponse,
  DeleteAttachmentResponse,
  RestoreAttachmentResponse,
  RenameAttachmentResponse,
} from '../../common/http_api/attachments';
import { apiPrivileges } from '../../common/features';
import { publicApiPath } from '../../common/constants';

/**
 * Check if an attachment is referenced in any conversation round.
 * This checks tool calls to see if any attachment tools were used with this attachment ID.
 */
function isAttachmentReferencedInRounds(
  attachmentId: string,
  rounds: ConversationRound[]
): boolean {
  const attachmentToolIds = [
    'platform.core.attachment_read',
    'platform.core.attachment_update',
    'platform.core.attachment_diff',
  ];

  for (const round of rounds) {
    for (const step of round.steps) {
      if (isToolCallStep(step)) {
        const toolCallStep = step as ToolCallStep;
        // Check if this is an attachment tool call
        if (attachmentToolIds.includes(toolCallStep.tool_id)) {
          // Check if the params reference this attachment ID
          const params = toolCallStep.params as Record<string, unknown>;
          if (params.attachment_id === attachmentId) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

const hasClientId = (attachment: { client_id?: string; versions: Array<{ data: unknown }> }) => {
  if (attachment.client_id) {
    return true;
  }

  return attachment.versions.some((version) => {
    if (!version?.data || typeof version.data !== 'object') {
      return false;
    }

    return Boolean((version.data as { client_id?: string }).client_id);
  });
};

export function registerAttachmentRoutes({
  router,
  getInternalServices,
  coreSetup,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // List attachments for a conversation
  router.versioned
    .get({
      path: `${publicApiPath}/conversations/{conversation_id}/attachments`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'public',
      summary: 'List conversation attachments',
      description:
        'List all attachments for a conversation. Use the optional include_deleted query parameter to include soft-deleted attachments.',
      options: {
        tags: ['attachment', 'oas-tag:agent builder'],
        availability: {
          stability: 'experimental',
          since: '9.2.0',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: schema.object({
              conversation_id: schema.string({
                meta: { description: 'The unique identifier of the conversation.' },
              }),
            }),
            query: schema.object({
              include_deleted: schema.maybe(
                schema.boolean({
                  meta: { description: 'Whether to include deleted attachments in the list.' },
                })
              ),
            }),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/attachments_list.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { conversations: conversationsService, attachments: attachmentsService } =
          getInternalServices();
        const { conversation_id: conversationId } = request.params;
        const { include_deleted: includeDeleted } = request.query;

        const client = await conversationsService.getScopedClient({ request });
        const conversation = await client.get(conversationId);

        const stateManager = createAttachmentStateManager(conversation.attachments ?? [], {
          getTypeDefinition: attachmentsService.getTypeDefinition,
        });
        const attachments = includeDeleted ? stateManager.getAll() : stateManager.getActive();

        return response.ok<ListAttachmentsResponse>({
          body: {
            results: attachments,
            total_token_estimate: stateManager.getTotalTokenEstimate(),
          },
        });
      })
    );

  // Create a new attachment
  router.versioned
    .post({
      path: `${publicApiPath}/conversations/{conversation_id}/attachments`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'public',
      summary: 'Create conversation attachment',
      description: 'Create a new attachment for a conversation with version tracking.',
      options: {
        tags: ['attachment', 'oas-tag:agent builder'],
        availability: {
          stability: 'experimental',
          since: '9.2.0',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: schema.object({
              conversation_id: schema.string({
                meta: { description: 'The unique identifier of the conversation.' },
              }),
            }),
            body: schema.object({
              id: schema.maybe(
                schema.string({
                  meta: { description: 'Optional custom ID for the attachment.' },
                })
              ),
              type: schema.string({
                meta: {
                  description: 'The type of the attachment (e.g., text, esql, visualization).',
                },
              }),
              data: schema.maybe(
                schema.any({
                  meta: {
                    description: 'The attachment data/content. Required unless origin is provided.',
                  },
                })
              ),
              origin: schema.maybe(
                schema.any({
                  meta: {
                    description:
                      'Origin/reference info for by-reference attachments (e.g. saved_object_id). When provided without data, the content is resolved once at creation time.',
                  },
                })
              ),
              description: schema.maybe(
                schema.string({
                  meta: { description: 'Human-readable description of the attachment.' },
                })
              ),
              hidden: schema.maybe(
                schema.boolean({
                  meta: { description: 'Whether the attachment should be hidden from the user.' },
                })
              ),
            }),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/attachments_create.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { conversations: conversationsService, attachments: attachmentsService } =
          getInternalServices();
        const { conversation_id: conversationId } = request.params;
        const { id, type, data, origin, description, hidden } = request.body;

        const client = await conversationsService.getScopedClient({ request });
        const conversation = await client.get(conversationId);

        const stateManager = createAttachmentStateManager(conversation.attachments ?? [], {
          getTypeDefinition: attachmentsService.getTypeDefinition,
        });

        // Check for duplicate ID if provided
        if (id && stateManager.getAttachmentRecord(id)) {
          return response.conflict({
            body: { message: `Attachment with ID '${id}' already exists` },
          });
        }

        let attachment;
        try {
          const [coreStart] = await coreSetup.getStartServices();
          const spaceId = (await ctx.agentBuilder).spaces.getSpaceId();
          const resolveContext = {
            request,
            spaceId,
            savedObjectsClient: coreStart.savedObjects.getScopedClient(request),
          };

          attachment = await stateManager.add(
            { id, type, data, origin, description, hidden },
            ATTACHMENT_REF_ACTOR.user,
            resolveContext
          );
        } catch (e) {
          return response.badRequest({
            body: { message: e.message },
          });
        }

        // Save the updated conversation
        await client.update({
          id: conversationId,
          attachments: stateManager.getAll(),
        });

        return response.ok<CreateAttachmentResponse>({
          body: { attachment },
        });
      })
    );

  // Update an attachment
  router.versioned
    .put({
      path: `${publicApiPath}/conversations/{conversation_id}/attachments/{attachment_id}`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'public',
      summary: 'Update conversation attachment',
      description: 'Update an attachment content. Creates a new version if content changed.',
      options: {
        tags: ['attachment', 'oas-tag:agent builder'],
        availability: {
          stability: 'experimental',
          since: '9.2.0',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: schema.object({
              conversation_id: schema.string({
                meta: { description: 'The unique identifier of the conversation.' },
              }),
              attachment_id: schema.string({
                meta: { description: 'The unique identifier of the attachment to update.' },
              }),
            }),
            body: schema.object({
              data: schema.any({
                meta: { description: 'The new attachment data/content.' },
              }),
              description: schema.maybe(
                schema.string({
                  meta: { description: 'Optional new description for the attachment.' },
                })
              ),
            }),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/attachments_update.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { conversations: conversationsService, attachments: attachmentsService } =
          getInternalServices();
        const { conversation_id: conversationId, attachment_id: attachmentId } = request.params;
        const { data, description } = request.body;

        const client = await conversationsService.getScopedClient({ request });
        const conversation = await client.get(conversationId);

        const stateManager = createAttachmentStateManager(conversation.attachments ?? [], {
          getTypeDefinition: attachmentsService.getTypeDefinition,
        });
        const existing = stateManager.getAttachmentRecord(attachmentId);

        if (!existing) {
          return response.notFound({
            body: { message: `Attachment '${attachmentId}' not found` },
          });
        }

        if (existing.active === false) {
          return response.badRequest({
            body: {
              message: `Cannot update deleted attachment '${attachmentId}'. Restore it first.`,
            },
          });
        }

        let updated;
        try {
          updated = await stateManager.update(attachmentId, { data, description });
        } catch (e) {
          return response.badRequest({
            body: { message: e.message },
          });
        }

        if (!updated) {
          return response.customError({
            body: { message: `Failed to update attachment '${attachmentId}'` },
            statusCode: 500,
          });
        }

        // Save the updated conversation
        await client.update({
          id: conversationId,
          attachments: stateManager.getAll(),
        });

        return response.ok<UpdateAttachmentResponse>({
          body: {
            attachment: updated,
            new_version: updated.current_version,
          },
        });
      })
    );

  // Delete an attachment (soft or permanent)
  router.versioned
    .delete({
      path: `${publicApiPath}/conversations/{conversation_id}/attachments/{attachment_id}`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'public',
      summary: 'Delete conversation attachment',
      description:
        'Delete an attachment. By default performs a soft delete (can be restored). Use permanent=true to permanently remove unreferenced attachments.',
      options: {
        tags: ['attachment', 'oas-tag:agent builder'],
        availability: {
          stability: 'experimental',
          since: '9.2.0',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: schema.object({
              conversation_id: schema.string({
                meta: { description: 'The unique identifier of the conversation.' },
              }),
              attachment_id: schema.string({
                meta: { description: 'The unique identifier of the attachment to delete.' },
              }),
            }),
            query: schema.object({
              permanent: schema.maybe(
                schema.boolean({
                  meta: {
                    description:
                      'If true, permanently removes the attachment (only for unreferenced attachments).',
                  },
                })
              ),
            }),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/attachments_delete.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { conversations: conversationsService, attachments: attachmentsService } =
          getInternalServices();
        const { conversation_id: conversationId, attachment_id: attachmentId } = request.params;
        const { permanent } = request.query;

        const client = await conversationsService.getScopedClient({ request });
        const conversation = await client.get(conversationId);

        const stateManager = createAttachmentStateManager(conversation.attachments ?? [], {
          getTypeDefinition: attachmentsService.getTypeDefinition,
        });
        const existing = stateManager.getAttachmentRecord(attachmentId);

        if (!existing) {
          return response.notFound({
            body: { message: `Attachment '${attachmentId}' not found` },
          });
        }

        // Block delete for screen context attachments
        if (existing.type === 'screen_context') {
          return response.badRequest({
            body: { message: 'Screen context attachments cannot be deleted' },
          });
        }

        if (permanent) {
          if (hasClientId(existing)) {
            return response.conflict({
              body: {
                message: `Cannot permanently delete attachment '${attachmentId}' because it was created from flyout configuration`,
              },
            });
          }

          // Check if attachment is referenced in rounds
          if (isAttachmentReferencedInRounds(attachmentId, conversation.rounds)) {
            return response.conflict({
              body: {
                message: `Cannot permanently delete attachment '${attachmentId}' because it is referenced in conversation rounds`,
              },
            });
          }

          const success = stateManager.permanentDelete(attachmentId);
          if (!success) {
            return response.customError({
              body: { message: `Failed to permanently delete attachment '${attachmentId}'` },
              statusCode: 500,
            });
          }
        } else {
          // Soft delete
          if (existing.active === false) {
            return response.badRequest({
              body: { message: `Attachment '${attachmentId}' is already deleted` },
            });
          }

          const success = stateManager.delete(attachmentId);
          if (!success) {
            return response.customError({
              body: { message: `Failed to delete attachment '${attachmentId}'` },
              statusCode: 500,
            });
          }
        }

        // Save the updated conversation
        await client.update({
          id: conversationId,
          attachments: stateManager.getAll(),
        });

        return response.ok<DeleteAttachmentResponse>({
          body: {
            success: true,
            permanent: permanent ?? false,
          },
        });
      })
    );

  // Restore a soft-deleted attachment
  router.versioned
    .post({
      path: `${publicApiPath}/conversations/{conversation_id}/attachments/{attachment_id}/_restore`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'public',
      summary: 'Restore deleted attachment',
      description: 'Restore a soft-deleted attachment.',
      options: {
        tags: ['attachment', 'oas-tag:agent builder'],
        availability: {
          stability: 'experimental',
          since: '9.2.0',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: schema.object({
              conversation_id: schema.string({
                meta: { description: 'The unique identifier of the conversation.' },
              }),
              attachment_id: schema.string({
                meta: { description: 'The unique identifier of the attachment to restore.' },
              }),
            }),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/attachments_restore.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { conversations: conversationsService, attachments: attachmentsService } =
          getInternalServices();
        const { conversation_id: conversationId, attachment_id: attachmentId } = request.params;

        const client = await conversationsService.getScopedClient({ request });
        const conversation = await client.get(conversationId);

        const stateManager = createAttachmentStateManager(conversation.attachments ?? [], {
          getTypeDefinition: attachmentsService.getTypeDefinition,
        });
        const existing = stateManager.getAttachmentRecord(attachmentId);

        if (!existing) {
          return response.notFound({
            body: { message: `Attachment '${attachmentId}' not found` },
          });
        }

        if (existing.active !== false) {
          return response.badRequest({
            body: { message: `Attachment '${attachmentId}' is not deleted` },
          });
        }

        const success = stateManager.restore(attachmentId);
        if (!success) {
          return response.customError({
            body: { message: `Failed to restore attachment '${attachmentId}'` },
            statusCode: 500,
          });
        }

        const restored = stateManager.getAttachmentRecord(attachmentId)!;

        // Save the updated conversation
        await client.update({
          id: conversationId,
          attachments: stateManager.getAll(),
        });

        return response.ok<RestoreAttachmentResponse>({
          body: {
            success: true,
            attachment: restored,
          },
        });
      })
    );

  // Rename an attachment (without creating new version)
  router.versioned
    .patch({
      path: `${publicApiPath}/conversations/{conversation_id}/attachments/{attachment_id}`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'public',
      summary: 'Rename attachment',
      description: 'Rename an attachment without creating a new version.',
      options: {
        tags: ['attachment', 'oas-tag:agent builder'],
        availability: {
          stability: 'experimental',
          since: '9.2.0',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: schema.object({
              conversation_id: schema.string({
                meta: { description: 'The unique identifier of the conversation.' },
              }),
              attachment_id: schema.string({
                meta: { description: 'The unique identifier of the attachment to rename.' },
              }),
            }),
            body: schema.object({
              description: schema.string({
                meta: { description: 'The new description/name for the attachment.' },
              }),
            }),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/attachments_rename.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { conversations: conversationsService, attachments: attachmentsService } =
          getInternalServices();
        const { conversation_id: conversationId, attachment_id: attachmentId } = request.params;
        const { description } = request.body;

        const client = await conversationsService.getScopedClient({ request });
        const conversation = await client.get(conversationId);

        const stateManager = createAttachmentStateManager(conversation.attachments ?? [], {
          getTypeDefinition: attachmentsService.getTypeDefinition,
        });
        const existing = stateManager.getAttachmentRecord(attachmentId);

        if (!existing) {
          return response.notFound({
            body: { message: `Attachment '${attachmentId}' not found` },
          });
        }

        const success = stateManager.rename(attachmentId, description);
        if (!success) {
          return response.customError({
            body: { message: `Failed to rename attachment '${attachmentId}'` },
            statusCode: 500,
          });
        }

        const renamed = stateManager.getAttachmentRecord(attachmentId)!;

        // Save the updated conversation
        await client.update({
          id: conversationId,
          attachments: stateManager.getAll(),
        });

        return response.ok<RenameAttachmentResponse>({
          body: {
            success: true,
            attachment: renamed,
          },
        });
      })
    );
}
