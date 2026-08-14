/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import path from 'node:path';
import { validate as uuidValidate } from 'uuid';
import {
  agentBuilderDefaultAgentId,
  ConversationAccessControlMode,
  isAgentNotFoundError,
  isAgentUnavailableError,
} from '@kbn/agent-builder-common';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import type {
  GetConversationResponse,
  ListConversationsResponse,
  DeleteConversationResponse,
  CreateConversationResponse,
} from '../../common/http_api/conversations';
import { apiPrivileges } from '../../common/features';
import { publicApiPath } from '../../common/constants';

export function registerConversationRoutes({
  router,
  getInternalServices,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // List conversations
  router.versioned
    .get({
      path: `${publicApiPath}/conversations`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'public',
      summary: 'List conversations',
      description:
        'List all conversations for a user. Use the optional agent ID to filter conversations by a specific agent. To learn more about agent conversations, refer to the [agent chat documentation](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/chat).',
      options: {
        tags: ['conversation', 'oas-tag:agent builder'],
        availability: {
          since: '9.2.0',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            query: schema.object({
              agent_id: schema.maybe(
                schema.string({
                  meta: {
                    description: 'Optional agent ID to filter conversations by a specific agent.',
                  },
                })
              ),
            }),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/conversations_list.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { conversations: conversationsService } = getInternalServices();
        const { agent_id: agentId } = request.query;

        const client = await conversationsService.getScopedClient({ request });
        const conversations = await client.list({ agentId });

        return response.ok<ListConversationsResponse>({
          body: {
            results: conversations,
          },
        });
      })
    );

  // Get conversation by ID
  router.versioned
    .get({
      path: `${publicApiPath}/conversations/{conversation_id}`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'public',
      summary: 'Get conversation by ID',
      description:
        'Get a specific conversation by ID. Use this endpoint to retrieve the complete conversation history including all messages and metadata. To learn more about agent conversations, refer to the [agent chat documentation](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/chat).',
      options: {
        tags: ['conversation', 'oas-tag:agent builder'],
        availability: {
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
                meta: { description: 'The unique identifier of the conversation to retrieve.' },
              }),
            }),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/conversations_get_by_id.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { conversations: conversationsService } = getInternalServices();
        const { conversation_id: conversationId } = request.params;

        const client = await conversationsService.getScopedClient({ request });
        const conversation = await client.get(conversationId);

        return response.ok<GetConversationResponse>({
          body: conversation,
        });
      })
    );

  // delete conversation by ID
  router.versioned
    .delete({
      path: `${publicApiPath}/conversations/{conversation_id}`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'public',
      summary: 'Delete conversation by ID',
      description:
        'Delete a conversation by ID. This action cannot be undone. To learn more about agent conversations, refer to the [agent chat documentation](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/chat).',
      options: {
        tags: ['conversation', 'oas-tag:agent builder'],
        availability: {
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
                meta: { description: 'The unique identifier of the conversation to delete.' },
              }),
            }),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/conversations_delete.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { conversations: conversationsService } = getInternalServices();
        const { conversation_id: conversationId } = request.params;

        const client = await conversationsService.getScopedClient({ request });
        const status = await client.delete(conversationId);

        return response.ok<DeleteConversationResponse>({
          body: {
            success: status,
          },
        });
      })
    );

  // Create conversation
  router.versioned
    .post({
      path: `${publicApiPath}/conversations`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'public',
      summary: 'Create conversation',
      description:
        'Create an empty conversation without sending a message. Returns the created conversation immediately. Use this to obtain a conversation ID before starting a chat session. To learn more about agent conversations, refer to the agent chat documentation.',
      options: {
        tags: ['conversation', 'oas-tag:agent builder'],
        availability: {
          since: '9.6.0',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: schema.object({
              agent_id: schema.maybe(
                schema.string({
                  meta: {
                    description:
                      'The ID of the agent to associate with the conversation. Defaults to the default Elastic AI agent.',
                  },
                })
              ),
              conversation_id: schema.maybe(
                schema.string({
                  validate: (v) =>
                    uuidValidate(v) ? undefined : 'conversation_id must be a valid UUID',
                  meta: {
                    description:
                      'Optional client-supplied UUID for the conversation. Server-generated if omitted.',
                  },
                })
              ),
              title: schema.maybe(
                schema.string({
                  maxLength: 500,
                  meta: {
                    description: 'Title for the conversation. Defaults to "New conversation".',
                  },
                })
              ),
              access_control: schema.maybe(
                schema.object(
                  {
                    access_mode: schema.oneOf(
                      [
                        schema.literal(ConversationAccessControlMode.Private),
                        schema.literal(ConversationAccessControlMode.Public),
                      ],
                      {
                        meta: {
                          description: 'Access mode for the conversation. Defaults to private.',
                        },
                      }
                    ),
                  },
                  {
                    meta: {
                      description: 'Optional access control settings. Defaults to private.',
                    },
                  }
                )
              ),
            }),
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { conversations: conversationsService, agents: agentsService } = getInternalServices();
        const {
          agent_id: agentId,
          conversation_id: conversationId,
          title,
          access_control: accessControl,
        } = request.body;

        const effectiveAgentId = agentId ?? agentBuilderDefaultAgentId;

        // Validate agent is accessible before writing — avoids creating an orphaned
        // document when the internal create() would persist first and fail on get()
        const agentRegistry = await agentsService.getRegistry({ request });
        try {
          await agentRegistry.get(effectiveAgentId, { access: 'use' });
        } catch (e) {
          if (isAgentNotFoundError(e) || isAgentUnavailableError(e, effectiveAgentId)) {
            return response.notFound({
              body: { message: `Agent ${effectiveAgentId} not found or inaccessible` },
            });
          }
          throw e;
        }

        const client = await conversationsService.getScopedClient({ request });

        // Guard duplicate IDs — internal create() maps ES version-conflict to 404,
        // which cannot be distinguished from a genuine post-creation failure
        if (conversationId && (await client.exists(conversationId))) {
          return response.conflict({
            body: { message: `Conversation ${conversationId} already exists` },
          });
        }

        const created = await client.create({
          agent_id: effectiveAgentId,
          id: conversationId,
          title: title ?? 'New conversation',
          access_control: accessControl,
          rounds: [],
        });

        // client.create() returns Conversation (no permissions). Fetch via get()
        // to return ConversationWithPermissions — consistent with GET /conversations/{id}.
        const conversation = await client.get(created.id);

        return response.ok<CreateConversationResponse>({ body: conversation });
      })
    );
}
