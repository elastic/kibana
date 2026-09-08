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
  CONVERSATION_ACCESS_CONTROL_MAX_ENTRIES,
  CONVERSATION_ACCESS_CONTROL_PRINCIPAL_ID_MAX_LENGTH,
  CONVERSATION_ID_MAX_LENGTH,
  CONVERSATION_TITLE_MAX_LENGTH,
  ConversationAccessControlMode,
  ConversationAccessControlRole,
  agentBuilderDefaultAgentId,
  agentIdMaxLength,
  isAgentNotFoundError,
  isAgentUnavailableError,
  isConversationAlreadyExistsError,
} from '@kbn/agent-builder-common';
import { createConversationPublicClient } from '../services/conversation/conversation_public_client';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import type {
  GetConversationResponse,
  ListConversationsResponse,
  DeleteConversationResponse,
  CreateConversationResponse,
  UpdateConversationAccessControlRequestBody,
  UpdateConversationAccessControlResponse,
} from '../../common/http_api/conversations';
import { apiPrivileges } from '../../common/features';
import {
  publicApiPath,
  MAX_CONVERSATIONS_PER_PAGE,
  MAX_RESULT_WINDOW,
} from '../../common/constants';

const ACCESS_CONTROL_MODE_SCHEMA = schema.oneOf(
  [
    schema.literal(ConversationAccessControlMode.Private),
    schema.literal(ConversationAccessControlMode.Public),
  ],
  {
    meta: {
      description:
        "Access-control mode: `private` (only the owner and the listed members can read and continue the conversation), `public` (any user with access to the conversation's agent can read and continue it).",
    },
  }
);

const ACCESS_CONTROL_ENTRIES_SCHEMA = schema.arrayOf(
  schema.object({
    type: schema.literal('user'),
    id: schema.string({
      minLength: 1,
      maxLength: CONVERSATION_ACCESS_CONTROL_PRINCIPAL_ID_MAX_LENGTH,
      meta: {
        description:
          'Stable identifier of the user to share the conversation with: a Kibana user profile uid. Users without a profile cannot be granted access.',
      },
    }),
    role: schema.oneOf([schema.literal(ConversationAccessControlRole.Member)], {
      meta: {
        description:
          'Role granted to the principal. `member` is the only role: it grants read and converse access to the conversation.',
      },
    }),
  }),
  {
    maxSize: CONVERSATION_ACCESS_CONTROL_MAX_ENTRIES,
    meta: {
      description:
        'Members to share the conversation with. The list replaces the stored one; submit an empty list to unshare. Entries naming the owner are ignored. Must be empty when `access_mode` is `public`; repeated ids are rejected.',
    },
  }
);

const validateAccessControlEntries = (val: { access_mode: string; entries?: unknown[] }) => {
  if (
    val.access_mode === ConversationAccessControlMode.Public &&
    val.entries &&
    val.entries.length > 0
  ) {
    return 'ACL entries are not supported when access_mode is "public"';
  }
};

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
            query: schema.object(
              {
                agent_id: schema.maybe(
                  schema.string({
                    maxLength: agentIdMaxLength,
                    meta: {
                      description: 'Optional agent ID to filter conversations by a specific agent.',
                    },
                  })
                ),
                page: schema.number({
                  defaultValue: 1,
                  min: 1,
                  meta: { description: 'Page number, 1-based.' },
                }),
                per_page: schema.number({
                  defaultValue: MAX_CONVERSATIONS_PER_PAGE,
                  min: 1,
                  max: MAX_CONVERSATIONS_PER_PAGE,
                  meta: {
                    description: `Number of results per page. Maximum ${MAX_CONVERSATIONS_PER_PAGE}.`,
                  },
                }),
                sort_order: schema.oneOf([schema.literal('asc'), schema.literal('desc')], {
                  defaultValue: 'desc',
                  meta: { description: 'Sort direction for results, ordered by updated_at.' },
                }),
                pinned: schema.maybe(
                  schema.boolean({
                    meta: {
                      description:
                        'Filter to pinned (true) or unpinned (false) conversations. Omit to return all.',
                    },
                  })
                ),
              },
              {
                validate: ({ page, per_page: perPage }) => {
                  if (page * perPage > MAX_RESULT_WINDOW) {
                    return `page * per_page must not exceed ${MAX_RESULT_WINDOW}; conversations beyond that are not reachable through this API`;
                  }
                },
              }
            ),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/conversations_list.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { conversations: conversationsService } = getInternalServices();
        const {
          agent_id: agentId,
          page,
          per_page: perPage,
          sort_order: sortOrder,
          pinned,
        } = request.query;

        const client = await conversationsService.getScopedClient({ request });
        const { results, total } = await client.list({ agentId, page, perPage, sortOrder, pinned });

        return response.ok<ListConversationsResponse>({
          body: {
            pagination: { total, page, per_page: perPage },
            results,
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
        'Create an empty conversation without sending a message. Returns the created conversation immediately. Use this to obtain a conversation ID before starting a chat session. To learn more about agent conversations, refer to the [agent chat documentation](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/chat).',
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
                  maxLength: agentIdMaxLength,
                  meta: {
                    description:
                      'The ID of the agent to associate with the conversation. Defaults to the default Elastic AI agent.',
                  },
                })
              ),
              conversation_id: schema.maybe(
                schema.string({
                  maxLength: CONVERSATION_ID_MAX_LENGTH,
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
                  maxLength: CONVERSATION_TITLE_MAX_LENGTH,
                  meta: {
                    description: 'Title for the conversation. Defaults to "New conversation".',
                  },
                })
              ),
              access_control: schema.maybe(
                schema.object(
                  {
                    access_mode: ACCESS_CONTROL_MODE_SCHEMA,
                    entries: schema.maybe(ACCESS_CONTROL_ENTRIES_SCHEMA),
                  },
                  {
                    validate: validateAccessControlEntries,
                    meta: {
                      description: 'Optional access control settings. Defaults to private.',
                    },
                  }
                )
              ),
            }),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/conversations_create.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { conversations: conversationsService, agents: agentsService } =
          getInternalServices();
        const {
          agent_id: agentId,
          conversation_id: conversationId,
          title,
          access_control: accessControl,
        } = request.body;

        const [client, agentRegistry] = await Promise.all([
          conversationsService.getScopedClient({ request }),
          agentsService.getRegistry({ request }),
        ]);
        const publicClient = createConversationPublicClient({ client, agentRegistry });

        let conversation: CreateConversationResponse;
        try {
          conversation = await publicClient.create({
            agentId,
            id: conversationId,
            title,
            accessControl,
          });
        } catch (e) {
          if (isAgentNotFoundError(e) || isAgentUnavailableError(e)) {
            return response.notFound({
              body: {
                message: `Agent ${agentId ?? agentBuilderDefaultAgentId} not found or inaccessible`,
              },
            });
          }
          if (isConversationAlreadyExistsError(e)) {
            return response.conflict({
              body: { message: `Conversation ${conversationId} already exists` },
            });
          }
          throw e;
        }

        return response.ok<CreateConversationResponse>({ body: conversation });
      })
    );

  // Update conversation access control
  router.versioned
    .put({
      path: `${publicApiPath}/conversations/{conversation_id}/access_control`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'public',
      summary: "Update a conversation's access control",
      description:
        "Replace a conversation's access mode and member list. Only the conversation owner can call this endpoint; every other caller receives a not-found response. Each call replaces the entire access control — the most recent successful update wins. Members can read and continue the conversation, but still need access to the conversation's agent. To learn more about agent conversations, refer to the [agent chat documentation](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/chat).",
      options: {
        tags: ['conversation', 'oas-tag:agent builder'],
        availability: {
          stability: 'tech_preview',
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
                meta: {
                  description:
                    'The unique identifier of the conversation whose access control to update.',
                },
              }),
            }),
            body: schema.object(
              {
                access_mode: ACCESS_CONTROL_MODE_SCHEMA,
                entries: ACCESS_CONTROL_ENTRIES_SCHEMA,
              },
              { validate: validateAccessControlEntries }
            ),
          },
        },
        options: {
          oasOperationObject: () =>
            path.join(__dirname, 'examples/conversations_access_control_update.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { conversations: conversationsService } = getInternalServices();
        const { conversation_id: conversationId } = request.params;

        const client = await conversationsService.getScopedClient({ request });
        const accessControl = await client.updateAccessControl(
          conversationId,
          request.body as UpdateConversationAccessControlRequestBody
        );

        return response.ok<UpdateConversationAccessControlResponse>({
          body: accessControl,
        });
      })
    );
}
