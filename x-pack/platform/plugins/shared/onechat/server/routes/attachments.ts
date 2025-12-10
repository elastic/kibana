/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { VersionedAttachment } from '@kbn/onechat-common/attachments';
import { AttachmentType } from '@kbn/onechat-common/attachments';
import type { Conversation, ConversationRound } from '@kbn/onechat-common';
import { isToolCallStep } from '@kbn/onechat-common';
import { createAttachmentStateManager } from '@kbn/onechat-server/attachments';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { apiPrivileges } from '../../common/features';
import { publicApiPath } from '../../common/constants';

/**
 * Check if an attachment is referenced in any conversation round.
 * An attachment is referenced if any tool call result contains an __attachment_operation__
 * marker with the matching attachment_id.
 */
function isAttachmentReferencedInRounds(
  attachmentId: string,
  rounds: ConversationRound[]
): boolean {
  for (const round of rounds) {
    for (const step of round.steps) {
      if (!isToolCallStep(step)) continue;

      for (const result of step.results) {
        const data = result.data as Record<string, unknown> | undefined;
        if (!data || !data.__attachment_operation__) continue;

        if (data.attachment_id === attachmentId) {
          return true;
        }
      }
    }
  }
  return false;
}

export function registerAttachmentRoutes({
  router,
  getInternalServices,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // GET /api/agent_builder/conversations/{conversation_id}/attachments
  // List all attachments for a conversation
  router.versioned
    .get({
      path: `${publicApiPath}/conversations/{conversation_id}/attachments`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      access: 'public',
      summary: 'List conversation attachments',
      description: 'List all versioned attachments for a conversation.',
      options: {
        tags: ['attachment', 'oas-tag:agent builder'],
        availability: {
          stability: 'experimental',
          since: '9.3.0',
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
                  meta: { description: 'Include deleted attachments.' },
                })
              ),
            }),
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { conversations: conversationsService } = getInternalServices();
        const { conversation_id: conversationId } = request.params;
        const { include_deleted: includeDeleted } = request.query;

        const client = await conversationsService.getScopedClient({ request });
        const conversation = await client.get(conversationId);

        const attachments = conversation.attachments ?? [];
        const stateManager = createAttachmentStateManager(attachments);

        const results = includeDeleted ? stateManager.getAll() : stateManager.getActive();

        return response.ok({
          body: {
            results,
            total_token_estimate: stateManager.getTotalTokenEstimate(),
          },
        });
      })
    );

  // POST /api/agent_builder/conversations/{conversation_id}/attachments
  // Add a new attachment to a conversation
  router.versioned
    .post({
      path: `${publicApiPath}/conversations/{conversation_id}/attachments`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      access: 'public',
      summary: 'Add attachment to conversation',
      description: 'Add a new versioned attachment to a conversation.',
      options: {
        tags: ['attachment', 'oas-tag:agent builder'],
        availability: {
          stability: 'experimental',
          since: '9.3.0',
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
              type: schema.string({
                meta: { description: 'Type of the attachment.' },
              }),
              data: schema.any({
                meta: { description: 'Content of the attachment.' },
              }),
              description: schema.maybe(
                schema.string({
                  meta: { description: 'Human-readable description.' },
                })
              ),
              hidden: schema.maybe(
                schema.boolean({
                  meta: { description: 'Whether the attachment should be hidden.' },
                })
              ),
            }),
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { conversations: conversationsService } = getInternalServices();
        const { conversation_id: conversationId } = request.params;
        const { type, data, description, hidden } = request.body;

        const client = await conversationsService.getScopedClient({ request });
        const conversation = await client.get(conversationId);

        const attachments = conversation.attachments ?? [];
        const stateManager = createAttachmentStateManager(attachments);

        const newAttachment = stateManager.add({ type, data, description, hidden });

        // Save updated conversation
        await client.update({
          id: conversationId,
          attachments: stateManager.toArray(),
        });

        return response.ok({
          body: newAttachment,
        });
      })
    );

  // PUT /api/agent_builder/conversations/{conversation_id}/attachments/{attachment_id}
  // Update an attachment (creates new version)
  router.versioned
    .put({
      path: `${publicApiPath}/conversations/{conversation_id}/attachments/{attachment_id}`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      access: 'public',
      summary: 'Update attachment',
      description: 'Update an attachment content. Creates a new version.',
      options: {
        tags: ['attachment', 'oas-tag:agent builder'],
        availability: {
          stability: 'experimental',
          since: '9.3.0',
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
                meta: { description: 'The unique identifier of the attachment.' },
              }),
            }),
            body: schema.object({
              data: schema.any({
                meta: { description: 'New content for the attachment.' },
              }),
              description: schema.maybe(
                schema.string({
                  meta: { description: 'New description for the attachment.' },
                })
              ),
            }),
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { conversations: conversationsService } = getInternalServices();
        const { conversation_id: conversationId, attachment_id: attachmentId } = request.params;
        const { data, description } = request.body;

        const client = await conversationsService.getScopedClient({ request });
        const conversation = await client.get(conversationId);

        const attachments = conversation.attachments ?? [];
        const stateManager = createAttachmentStateManager(attachments);

        const newVersion = stateManager.update(attachmentId, data, description);
        if (!newVersion) {
          return response.notFound({
            body: { message: `Attachment '${attachmentId}' not found` },
          });
        }

        // Save updated conversation
        await client.update({
          id: conversationId,
          attachments: stateManager.toArray(),
        });

        return response.ok({
          body: {
            attachment: stateManager.get(attachmentId),
            new_version: newVersion,
          },
        });
      })
    );

  // DELETE /api/agent_builder/conversations/{conversation_id}/attachments/{attachment_id}
  // Soft-delete or permanently delete an attachment
  router.versioned
    .delete({
      path: `${publicApiPath}/conversations/{conversation_id}/attachments/{attachment_id}`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      access: 'public',
      summary: 'Delete attachment',
      description:
        'Delete an attachment. By default performs soft-delete (can be restored). Use permanent=true to permanently remove attachments that have not been referenced in any round.',
      options: {
        tags: ['attachment', 'oas-tag:agent builder'],
        availability: {
          stability: 'experimental',
          since: '9.3.0',
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
                      'If true, permanently removes the attachment. Only allowed for attachments not referenced in any round.',
                  },
                })
              ),
            }),
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { conversations: conversationsService } = getInternalServices();
        const { conversation_id: conversationId, attachment_id: attachmentId } = request.params;
        const { permanent } = request.query;

        const client = await conversationsService.getScopedClient({ request });
        const conversation = await client.get(conversationId);

        const attachments = conversation.attachments ?? [];
        const stateManager = createAttachmentStateManager(attachments);

        // Check if attachment exists
        const attachment = stateManager.get(attachmentId);
        if (!attachment) {
          return response.notFound({
            body: { message: `Attachment '${attachmentId}' not found` },
          });
        }

        // Screen context attachments cannot be deleted
        if (attachment.type === AttachmentType.screenContext) {
          return response.badRequest({
            body: { message: `Cannot delete screen context attachments` },
          });
        }

        if (permanent) {
          // For permanent delete, check if attachment is referenced in any round
          const isReferenced = isAttachmentReferencedInRounds(attachmentId, conversation.rounds);

          if (isReferenced) {
            return response.badRequest({
              body: {
                message: `Cannot permanently delete attachment '${attachmentId}' because it is referenced in conversation rounds. Use soft delete instead.`,
              },
            });
          }

          // Permanently remove the attachment
          const success = stateManager.permanentDelete(attachmentId);
          if (!success) {
            return response.notFound({
              body: { message: `Attachment '${attachmentId}' not found` },
            });
          }
        } else {
          // Soft delete
          const success = stateManager.delete(attachmentId);
          if (!success) {
            return response.notFound({
              body: { message: `Attachment '${attachmentId}' not found or already deleted` },
            });
          }
        }

        // Save updated conversation
        await client.update({
          id: conversationId,
          attachments: stateManager.toArray(),
        });

        return response.ok({
          body: { success: true, permanent: Boolean(permanent) },
        });
      })
    );

  // POST /api/agent_builder/conversations/{conversation_id}/attachments/{attachment_id}/_restore
  // Restore a soft-deleted attachment
  router.versioned
    .post({
      path: `${publicApiPath}/conversations/{conversation_id}/attachments/{attachment_id}/_restore`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      access: 'public',
      summary: 'Restore deleted attachment',
      description: 'Restore a previously soft-deleted attachment.',
      options: {
        tags: ['attachment', 'oas-tag:agent builder'],
        availability: {
          stability: 'experimental',
          since: '9.3.0',
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
      },
      wrapHandler(async (ctx, request, response) => {
        const { conversations: conversationsService } = getInternalServices();
        const { conversation_id: conversationId, attachment_id: attachmentId } = request.params;

        const client = await conversationsService.getScopedClient({ request });
        const conversation = await client.get(conversationId);

        const attachments = conversation.attachments ?? [];
        const stateManager = createAttachmentStateManager(attachments);

        const success = stateManager.restore(attachmentId);
        if (!success) {
          return response.notFound({
            body: { message: `Attachment '${attachmentId}' not found or not deleted` },
          });
        }

        // Save updated conversation
        await client.update({
          id: conversationId,
          attachments: stateManager.toArray(),
        });

        return response.ok({
          body: {
            success: true,
            attachment: stateManager.get(attachmentId),
          },
        });
      })
    );

  // PATCH /api/agent_builder/conversations/{conversation_id}/attachments/{attachment_id}
  // Rename an attachment (update description without creating a new version)
  router.versioned
    .patch({
      path: `${publicApiPath}/conversations/{conversation_id}/attachments/{attachment_id}`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      access: 'public',
      summary: 'Rename attachment',
      description:
        'Update attachment metadata (description/title) without creating a new version.',
      options: {
        tags: ['attachment', 'oas-tag:agent builder'],
        availability: {
          stability: 'experimental',
          since: '9.3.0',
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
                meta: { description: 'The unique identifier of the attachment.' },
              }),
            }),
            body: schema.object({
              description: schema.string({
                meta: { description: 'New description/title for the attachment.' },
              }),
            }),
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { conversations: conversationsService } = getInternalServices();
        const { conversation_id: conversationId, attachment_id: attachmentId } = request.params;
        const { description } = request.body;

        const client = await conversationsService.getScopedClient({ request });
        const conversation = await client.get(conversationId);

        const attachments = conversation.attachments ?? [];
        const stateManager = createAttachmentStateManager(attachments);

        const success = stateManager.rename(attachmentId, description);
        if (!success) {
          return response.notFound({
            body: { message: `Attachment '${attachmentId}' not found` },
          });
        }

        // Save updated conversation
        await client.update({
          id: conversationId,
          attachments: stateManager.toArray(),
        });

        return response.ok({
          body: {
            success: true,
            attachment: stateManager.get(attachmentId),
          },
        });
      })
    );
}
