/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import path from 'node:path';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import type {
  ListConversationsResponse,
  DeleteConversationResponse,
  CreateConversationResponse,
  UpdateConversationResponse,
  HandoverConversationResponse,
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
        'List all conversations for a user. Use the optional agent ID to filter conversations by a specific agent.',
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
              handover_requested: schema.maybe(
                schema.boolean({
                  meta: {
                    description:
                      'Filter conversations by handover status. When true, returns only conversations waiting for external agent pickup.',
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
        const { agent_id: agentId, handover_requested: handoverRequested } = request.query;

        const client = await conversationsService.getScopedClient({ request });
        const conversations = await client.list({ agentId, handoverRequested });

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
        'Get a specific conversation by ID. Use this endpoint to retrieve the complete conversation history including all messages and metadata.',
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

        return response.ok({
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
      description: 'Delete a conversation by ID. This action cannot be undone.',
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
        authz: { requiredPrivileges: [apiPrivileges.writeAgentBuilder] },
      },
      access: 'public',
      summary: 'Create a conversation',
      description:
        'Create a new conversation with pre-populated rounds. Use this to push sessions from external agents into Agent Builder.',
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
            body: schema.object({
              agent_id: schema.string({
                meta: { description: 'The ID of the agent this conversation belongs to.' },
              }),
              title: schema.string({
                meta: { description: 'Title of the conversation.' },
              }),
              rounds: schema.arrayOf(schema.any(), {
                meta: {
                  description: 'Conversation rounds including user inputs and assistant responses.',
                },
              }),
              attachments: schema.maybe(
                schema.arrayOf(schema.any(), {
                  meta: { description: 'Optional conversation-level attachments.' },
                })
              ),
              handover_requested: schema.maybe(
                schema.boolean({
                  meta: {
                    description:
                      'Whether this conversation is flagged for handover to an external agent.',
                  },
                })
              ),
            }),
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { conversations: conversationsService } = getInternalServices();
        const { agent_id, title, rounds, attachments, handover_requested } = request.body;

        const client = await conversationsService.getScopedClient({ request });
        const conversation = await client.create({
          agent_id,
          title,
          rounds,
          attachments,
          handover_requested,
        });

        return response.ok<CreateConversationResponse>({
          body: {
            conversation,
          },
        });
      })
    );

  // Update conversation
  router.versioned
    .put({
      path: `${publicApiPath}/conversations/{conversation_id}`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.writeAgentBuilder] },
      },
      access: 'public',
      summary: 'Update a conversation',
      description:
        'Update an existing conversation. Only provided fields are updated. When rounds is provided it replaces the entire rounds array.',
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
                meta: { description: 'The unique identifier of the conversation to update.' },
              }),
            }),
            body: schema.object({
              title: schema.maybe(
                schema.string({
                  meta: { description: 'Updated title of the conversation.' },
                })
              ),
              rounds: schema.maybe(
                schema.arrayOf(schema.any(), {
                  meta: {
                    description:
                      'Replacement rounds array. When provided, replaces all existing rounds.',
                  },
                })
              ),
            }),
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { conversations: conversationsService } = getInternalServices();
        const { conversation_id: conversationId } = request.params;
        const { title, rounds } = request.body;

        const client = await conversationsService.getScopedClient({ request });
        const conversation = await client.update({
          id: conversationId,
          ...(title !== undefined && { title }),
          ...(rounds !== undefined && { rounds }),
        });

        return response.ok<UpdateConversationResponse>({
          body: {
            conversation,
          },
        });
      })
    );

  // Toggle handover status
  router.versioned
    .post({
      path: `${publicApiPath}/conversations/{conversation_id}/_handover`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.writeAgentBuilder] },
      },
      access: 'public',
      summary: 'Toggle conversation handover status',
      description:
        'Set or clear the handover flag on a conversation. When handover is requested, external agents can discover and pick up this conversation.',
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
                meta: { description: 'The unique identifier of the conversation.' },
              }),
            }),
            body: schema.object({
              requested: schema.boolean({
                meta: {
                  description:
                    'Whether handover is requested. Set to true to flag for external agent pickup, false to clear.',
                },
              }),
            }),
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { conversations: conversationsService } = getInternalServices();
        const { conversation_id: conversationId } = request.params;
        const { requested } = request.body;

        const client = await conversationsService.getScopedClient({ request });
        const conversation = await client.update({
          id: conversationId,
          handover_requested: requested,
        });

        return response.ok<HandoverConversationResponse>({
          body: {
            conversation: {
              id: conversation.id,
              agent_id: conversation.agent_id,
              user: conversation.user,
              title: conversation.title,
              created_at: conversation.created_at,
              updated_at: conversation.updated_at,
              handover_requested: conversation.handover_requested,
              attachments: conversation.attachments,
              state: conversation.state,
            },
          },
        });
      })
    );
}
