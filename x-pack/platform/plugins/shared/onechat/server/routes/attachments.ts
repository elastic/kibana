/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import path from 'node:path';
import type { VersionedAttachment } from '@kbn/onechat-common/attachments';
import { createAttachmentStateManager } from '@kbn/onechat-server/attachments';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { apiPrivileges } from '../../common/features';
import { publicApiPath } from '../../common/constants';

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
        await client.update(conversationId, {
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
        await client.update(conversationId, {
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
  // Soft-delete an attachment
  router.versioned
    .delete({
      path: `${publicApiPath}/conversations/{conversation_id}/attachments/{attachment_id}`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      access: 'public',
      summary: 'Delete attachment',
      description: 'Soft-delete an attachment. The attachment can be restored later.',
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

        const success = stateManager.delete(attachmentId);
        if (!success) {
          return response.notFound({
            body: { message: `Attachment '${attachmentId}' not found or already deleted` },
          });
        }

        // Save updated conversation
        await client.update(conversationId, {
          attachments: stateManager.toArray(),
        });

        return response.ok({
          body: { success: true },
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
        await client.update(conversationId, {
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
