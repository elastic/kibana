/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { schema } from '@kbn/config-schema';
import type { UpdateOriginResponse } from '@kbn/agent-builder-common/attachments';
import type { AttachmentResolveContext } from '@kbn/agent-builder-server/attachments';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import { CONVERSATION_ID_MAX_LENGTH, isAgentBuilderError } from '@kbn/agent-builder-common';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import type {
  ListAttachmentsResponse,
  CreateAttachmentResponse,
  UpdateAttachmentResponse,
  DeleteAttachmentResponse,
  RestoreAttachmentResponse,
  RenameAttachmentResponse,
  CheckStaleAttachmentsResponse,
  GetAttachmentResponse,
} from '../../common/http_api/attachments';
import { createAttachmentPublicClient } from '../services/attachments';
import { apiPrivileges } from '../../common/features';
import { publicApiPath } from '../../common/constants';
import { AGENT_BUILDER_READ_SECURITY } from './route_security';

// Defensive caps on client-supplied attachment fields to avoid unbounded request payloads.
const ATTACHMENT_ID_MAX_LENGTH = 256;
const ATTACHMENT_TYPE_MAX_LENGTH = 256;
const ATTACHMENT_ORIGIN_MAX_LENGTH = 2048;
const ATTACHMENT_DESCRIPTION_MAX_LENGTH = 2048;

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
                maxLength: CONVERSATION_ID_MAX_LENGTH,
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

        const [coreStart, startDeps] = await coreSetup.getStartServices();
        const client = createAttachmentPublicClient({
          request,
          conversationsService,
          attachmentsService,
          coreStart,
          spaces: startDeps.spaces,
        });

        const result = await client.list({ conversationId, includeDeleted });
        return response.ok<ListAttachmentsResponse>({ body: result });
      })
    );

  // Get a single attachment
  router.versioned
    .get({
      path: `${publicApiPath}/conversations/{conversation_id}/attachments/{attachment_id}`,
      security: AGENT_BUILDER_READ_SECURITY,
      access: 'public',
      summary: 'Get conversation attachment',
      description: 'Get a single attachment by ID for a conversation.',
      options: {
        tags: ['attachment', 'oas-tag:agent builder'],
        availability: {
          stability: 'experimental',
          since: '9.6.0',
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
                maxLength: CONVERSATION_ID_MAX_LENGTH,
                meta: { description: 'The unique identifier of the conversation.' },
              }),
              attachment_id: schema.string({
                maxLength: ATTACHMENT_ID_MAX_LENGTH,
                meta: { description: 'The unique identifier of the attachment.' },
              }),
            }),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/attachments_get.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { conversations: conversationsService, attachments: attachmentsService } =
          getInternalServices();
        const { conversation_id: conversationId, attachment_id: attachmentId } = request.params;

        const [coreStart, startDeps] = await coreSetup.getStartServices();
        const client = createAttachmentPublicClient({
          request,
          conversationsService,
          attachmentsService,
          coreStart,
          spaces: startDeps.spaces,
        });

        try {
          const attachment = await client.get({ conversationId, attachmentId });
          return response.ok<GetAttachmentResponse>({ body: { attachment } });
        } catch (e) {
          if (isAgentBuilderError(e)) {
            return response.customError({
              statusCode: (e.meta.statusCode as number) ?? 500,
              body: { message: e.message },
            });
          }
          throw e;
        }
      })
    );

  // Check stale status for all latest conversation attachments
  router.versioned
    .get({
      path: `${publicApiPath}/conversations/{conversation_id}/attachments/stale`,
      security: AGENT_BUILDER_READ_SECURITY,
      access: 'public',
      summary: 'Check attachment staleness',
      description:
        'Checks staleness for the latest version of all conversation attachments against their origin snapshot.',
      options: {
        tags: ['attachment', 'oas-tag:agent builder'],
        availability: {
          stability: 'experimental',
          since: '9.4.0',
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
                maxLength: CONVERSATION_ID_MAX_LENGTH,
                meta: { description: 'The unique identifier of the conversation.' },
              }),
            }),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/attachments_stale.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { conversations: conversationsService, attachments: attachmentsService } =
          getInternalServices();
        const { conversation_id: conversationId } = request.params;

        const client = await conversationsService.getScopedClient({ request });
        const conversation = await client.get(conversationId);
        const stateManager = createAttachmentStateManager(conversation.attachments ?? [], {
          getTypeDefinition: attachmentsService.getTypeDefinition,
        });

        const [coreStart] = await coreSetup.getStartServices();
        const spaceId = (await ctx.agentBuilder).spaces.getSpaceId();
        const resolveContext: AttachmentResolveContext = {
          request,
          spaceId,
          savedObjectsClient: coreStart.savedObjects.getScopedClient(request),
        };

        const staleResults = await stateManager.evaluateStalenessForActiveAttachments(
          resolveContext
        );
        const staleCount = staleResults.filter((result) => result.is_stale).length;
        for (const result of staleResults) {
          if (!result.is_stale && result.error) {
            logger.warn(
              `Attachment staleness check failed for attachment "${result.id}" in conversation "${conversationId}": ${result.error}`
            );
          }
        }
        logger.debug(
          `Attachment staleness check completed for conversation "${conversationId}" (checked=${staleResults.length}, stale=${staleCount})`
        );

        return response.ok<CheckStaleAttachmentsResponse>({
          body: {
            attachments: staleResults,
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
                maxLength: CONVERSATION_ID_MAX_LENGTH,
                meta: { description: 'The unique identifier of the conversation.' },
              }),
            }),
            body: schema.object({
              id: schema.maybe(
                schema.string({
                  maxLength: ATTACHMENT_ID_MAX_LENGTH,
                  meta: { description: 'Optional custom ID for the attachment.' },
                })
              ),
              type: schema.string({
                maxLength: ATTACHMENT_TYPE_MAX_LENGTH,
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
                schema.string({
                  maxLength: ATTACHMENT_ORIGIN_MAX_LENGTH,
                  meta: {
                    description:
                      'Origin string (for example, saved object ID) for by-reference attachments. When provided without data, the content is resolved once at creation time.',
                  },
                })
              ),
              description: schema.maybe(
                schema.string({
                  maxLength: ATTACHMENT_DESCRIPTION_MAX_LENGTH,
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

        const [coreStart, startDeps] = await coreSetup.getStartServices();
        const client = createAttachmentPublicClient({
          request,
          conversationsService,
          attachmentsService,
          coreStart,
          spaces: startDeps.spaces,
        });

        try {
          const attachment = await client.create({ conversationId, ...request.body });
          return response.ok<CreateAttachmentResponse>({ body: { attachment } });
        } catch (e) {
          if (isAgentBuilderError(e)) {
            return response.customError({
              statusCode: (e.meta.statusCode as number) ?? 500,
              body: { message: e.message },
            });
          }
          throw e;
        }
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
                maxLength: CONVERSATION_ID_MAX_LENGTH,
                meta: { description: 'The unique identifier of the conversation.' },
              }),
              attachment_id: schema.string({
                maxLength: ATTACHMENT_ID_MAX_LENGTH,
                meta: { description: 'The unique identifier of the attachment to update.' },
              }),
            }),
            body: schema.object({
              data: schema.any({
                meta: { description: 'The new attachment data/content.' },
              }),
              description: schema.maybe(
                schema.string({
                  maxLength: ATTACHMENT_DESCRIPTION_MAX_LENGTH,
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

        const [coreStart, startDeps] = await coreSetup.getStartServices();
        const client = createAttachmentPublicClient({
          request,
          conversationsService,
          attachmentsService,
          coreStart,
          spaces: startDeps.spaces,
        });

        try {
          const updated = await client.update({
            conversationId,
            attachmentId,
            ...request.body,
          });
          return response.ok<UpdateAttachmentResponse>({
            body: { attachment: updated, new_version: updated.current_version },
          });
        } catch (e) {
          if (isAgentBuilderError(e)) {
            return response.customError({
              statusCode: (e.meta.statusCode as number) ?? 500,
              body: { message: e.message },
            });
          }
          throw e;
        }
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
                maxLength: CONVERSATION_ID_MAX_LENGTH,
                meta: { description: 'The unique identifier of the conversation.' },
              }),
              attachment_id: schema.string({
                maxLength: ATTACHMENT_ID_MAX_LENGTH,
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

        const [coreStart, startDeps] = await coreSetup.getStartServices();
        const client = createAttachmentPublicClient({
          request,
          conversationsService,
          attachmentsService,
          coreStart,
          spaces: startDeps.spaces,
        });

        try {
          await client.delete({ conversationId, attachmentId, permanent });
          return response.ok<DeleteAttachmentResponse>({
            body: { success: true, permanent: permanent ?? false },
          });
        } catch (e) {
          if (isAgentBuilderError(e)) {
            return response.customError({
              statusCode: (e.meta.statusCode as number) ?? 500,
              body: { message: e.message },
            });
          }
          throw e;
        }
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
                maxLength: CONVERSATION_ID_MAX_LENGTH,
                meta: { description: 'The unique identifier of the conversation.' },
              }),
              attachment_id: schema.string({
                maxLength: ATTACHMENT_ID_MAX_LENGTH,
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
                maxLength: CONVERSATION_ID_MAX_LENGTH,
                meta: { description: 'The unique identifier of the conversation.' },
              }),
              attachment_id: schema.string({
                maxLength: ATTACHMENT_ID_MAX_LENGTH,
                meta: { description: 'The unique identifier of the attachment to rename.' },
              }),
            }),
            body: schema.object({
              description: schema.string({
                maxLength: ATTACHMENT_DESCRIPTION_MAX_LENGTH,
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

  // Update attachment origin
  router.versioned
    .put({
      path: `${publicApiPath}/conversations/{conversation_id}/attachments/{attachment_id}/origin`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'public',
      summary: 'Update attachment origin',
      description:
        'Update the origin reference for an attachment. Use this after saving a by-value attachment to link it to its persistent store.',
      options: {
        tags: ['attachment', 'oas-tag:agent builder'],
        availability: {
          stability: 'experimental',
          since: '9.4.0',
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
                maxLength: CONVERSATION_ID_MAX_LENGTH,
                meta: { description: 'The unique identifier of the conversation.' },
              }),
              attachment_id: schema.string({
                maxLength: ATTACHMENT_ID_MAX_LENGTH,
                meta: { description: 'The unique identifier of the attachment to update.' },
              }),
            }),
            body: schema.object({
              origin: schema.string({
                maxLength: ATTACHMENT_ORIGIN_MAX_LENGTH,
                meta: {
                  description:
                    'The origin string (e.g., saved object ID for visualizations and dashboards).',
                },
              }),
            }),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/attachments_update_origin.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { conversations: conversationsService, attachments: attachmentsService } =
          getInternalServices();
        const { conversation_id: conversationId, attachment_id: attachmentId } = request.params;
        const { origin } = request.body;

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
              message: `Cannot update origin of deleted attachment '${attachmentId}'. Restore it first.`,
            },
          });
        }

        let success: boolean;
        try {
          success = await stateManager.updateOrigin(
            attachmentId,
            origin,
            ATTACHMENT_REF_ACTOR.user
          );
        } catch (e) {
          return response.badRequest({
            body: { message: e.message },
          });
        }

        if (!success) {
          return response.customError({
            body: { message: `Failed to update origin for attachment '${attachmentId}'` },
            statusCode: 500,
          });
        }

        const updated = stateManager.getAttachmentRecord(attachmentId)!;

        // Save the updated conversation
        await client.update({
          id: conversationId,
          attachments: stateManager.getAll(),
        });

        return response.ok<UpdateOriginResponse>({
          body: {
            success: true,
            attachment: updated,
          },
        });
      })
    );
}
