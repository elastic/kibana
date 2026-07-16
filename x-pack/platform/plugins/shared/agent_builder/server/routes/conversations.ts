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

        return response.ok({
          body: conversation,
        });
      })
    );

  // ---------------------------------------------------------------------------
  // POC WORKAROUND (Daybreak Watch → Investigation) — NOT a platform API contract.
  //
  // Missing capability (#15192): public PATCH /conversations/{id}/metadata (or equivalent)
  // to write queryable investigation fields (severity, proposal_status, provenance, …).
  //
  // Correct approach when shipped: workflow materialize step calls the metadata endpoint;
  // inbox queue reads typed metadata fields server-side (no state bag, no experimental PUT).
  //
  // POC workaround: experimental PUT merges title/status/state so watch_floor can write
  // state.daybreak_proposal via kibana.request. Limitations:
  //   - Not in kibana-main; must not be mistaken for a real gap or long-term API.
  //   - Writes non-queryable state (severity still not ES-filterable — separate #15192 gap).
  //   - proposal lifecycle status lives in state, not Conversation.status (round lifecycle).
  // Remove this route when #15192 metadata PATCH is available; do not extend it.
  // ---------------------------------------------------------------------------
  // Update conversation by ID
  router.versioned
    .put({
      path: `${publicApiPath}/conversations/{conversation_id}`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'public',
      summary: 'Update conversation by ID',
      description:
        'Update conversation metadata such as title, status, state, attachments, or read flag.',
      options: {
        tags: ['conversation', 'oas-tag:agent builder'],
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
                meta: { description: 'The unique identifier of the conversation to update.' },
              }),
            }),
            body: schema.object({
              title: schema.maybe(schema.string()),
              state: schema.maybe(schema.object({}, { unknowns: 'allow' })),
              status: schema.maybe(schema.string()),
              read: schema.maybe(schema.boolean()),
              workspace_id: schema.maybe(schema.string()),
            }),
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { conversations: conversationsService } = getInternalServices();
        const { conversation_id: conversationId } = request.params;
        const { title, state, status, read, workspace_id: workspaceId } = request.body;

        const client = await conversationsService.getScopedClient({ request });
        const existing = await client.get(conversationId);

        const updatedConversation = await client.update({
          id: conversationId,
          ...(title !== undefined ? { title } : {}),
          ...(status !== undefined ? { status: status as typeof existing.status } : {}),
          ...(read !== undefined ? { read } : {}),
          ...(workspaceId !== undefined ? { workspace_id: workspaceId } : {}),
          ...(state !== undefined
            ? {
                state: {
                  ...existing.state,
                  ...state,
                },
              }
            : {}),
        });

        return response.ok({
          body: updatedConversation,
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
}
