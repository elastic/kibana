/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { Observable } from 'rxjs';
import path from 'node:path';
import type { ServerSentEvent } from '@kbn/sse-utils';
import { observableIntoEventSourceStream } from '@kbn/sse-utils-server';
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
  coreSetup,
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

  // Follow active execution for a conversation (SSE) — multi-user POC
  router.versioned
    .get({
      path: `${publicApiPath}/conversations/{conversation_id}/follow_execution`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'public',
      summary: 'Follow active execution for a conversation',
      options: {
        tags: ['conversation', 'oas-tag:agent builder'],
        timeout: { idleSocket: 300_000 },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: schema.object({
              conversation_id: schema.string(),
            }),
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const [, { cloud }] = await coreSetup.getStartServices();
        const { conversations: conversationsService, execution: executionService } =
          getInternalServices();
        const { conversation_id: conversationId } = request.params;

        const client = await conversationsService.getScopedClient({ request });
        const conversation = await client.get(conversationId);

        if (!conversation.current_execution_id) {
          return response.ok({ body: { message: 'No active execution' } });
        }

        const events$ = executionService.followExecution(conversation.current_execution_id);

        const abortController = new AbortController();
        request.events.aborted$.subscribe(() => abortController.abort());

        return response.ok({
          headers: {
            'Content-Type': cloud?.isCloudEnabled
              ? 'application/octet-stream'
              : 'text/event-stream',
            'Content-Encoding': 'identity',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'Transfer-Encoding': 'chunked',
            'X-Content-Type-Options': 'nosniff',
            'X-Accel-Buffering': 'no',
          },
          body: observableIntoEventSourceStream(events$ as unknown as Observable<ServerSentEvent>, {
            signal: abortController.signal,
            flushThrottleMs: 100,
            logger,
          }),
        });
      })
    );
}
