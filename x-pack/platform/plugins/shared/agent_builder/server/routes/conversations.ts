/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import path from 'node:path';
import type { Observable } from 'rxjs';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { ServerSentEvent } from '@kbn/sse-utils';
import { observableIntoEventSourceStream } from '@kbn/sse-utils-server';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import type {
  ListConversationsResponse,
  DeleteConversationResponse,
} from '../../common/http_api/conversations';
import { apiPrivileges } from '../../common/features';
import { publicApiPath, internalApiPath } from '../../common/constants';
import { createModelProvider } from '../services/runner/model_provider';

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

  // fork conversation by ID — creates a new conversation that is a copy of the parent
  router.post(
    {
      path: `${internalApiPath}/conversations/{conversation_id}/fork`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      validate: {
        params: schema.object({
          conversation_id: schema.string(),
        }),
      },
      options: { access: 'internal' },
    },
    wrapHandler(async (ctx, request, response) => {
      const { conversations: conversationsService } = getInternalServices();
      const { conversation_id: conversationId } = request.params;

      const client = await conversationsService.getScopedClient({ request });
      const parent = await client.get(conversationId);

      const forked = await client.create({
        agent_id: parent.agent_id,
        title: `Fork of ${parent.title}`,
        rounds: parent.rounds,
        attachments: parent.attachments,
        // Omit state (HITL prompts, internal graph state) — the fork starts clean
      });

      return response.ok({
        body: { conversation_id: forked.id },
      });
    })
  );

  // summarize conversation — returns a brief AI-generated summary of the conversation
  router.post(
    {
      path: `${internalApiPath}/conversations/{conversation_id}/summarize`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      validate: {
        params: schema.object({
          conversation_id: schema.string(),
        }),
      },
      options: { access: 'internal' },
    },
    wrapHandler(async (ctx, request, response) => {
      const { conversations: conversationsService } = getInternalServices();
      const { conversation_id: conversationId } = request.params;

      const client = await conversationsService.getScopedClient({ request });
      const conversation = await client.get(conversationId);

      if (!conversation.rounds?.length) {
        return response.ok({ body: { summary: conversation.title || 'No conversation yet.' } });
      }

      // Build a concise transcript to summarize
      const transcript = conversation.rounds
        .map((round, idx) => {
          const userTurn = round.input.message ? `User: ${round.input.message}` : '';
          const assistantTurn = round.response?.message
            ? `Assistant: ${round.response.message}`
            : '';
          return [userTurn, assistantTurn].filter(Boolean).join('\n');
        })
        .filter(Boolean)
        .join('\n\n');

      try {
        const [coreStart, pluginsStart] = await coreSetup.getStartServices();

        const modelProvider = createModelProvider({
          inference: pluginsStart.inference,
          request,
          uiSettings: coreStart.uiSettings,
          savedObjects: coreStart.savedObjects,
        });

        const model = await modelProvider.getDefaultModel();
        const messages = [
          new SystemMessage(
            'Summarize the following conversation in 1–2 sentences. ' +
              'Focus on the main topic, key findings, and current state. ' +
              'Be concise and factual.'
          ),
          new HumanMessage(transcript),
        ];

        const result = await model.chatModel.invoke(messages);
        const summary =
          typeof result.content === 'string' ? result.content : JSON.stringify(result.content);

        return response.ok({ body: { summary } });
      } catch {
        // Fallback: use last assistant message as summary
        const lastAssistant = [...conversation.rounds]
          .reverse()
          .find((r) => r.response?.message)?.response?.message;
        return response.ok({
          body: { summary: lastAssistant?.slice(0, 300) ?? conversation.title ?? '' },
        });
      }
    })
  );

  // Follow an agent execution by ID — returns an SSE stream of events.
  // Used by the frontend to subscribe to an externally-triggered round (e.g. ask_conversation)
  // so the target conversation component can update in real time without a page refresh.
  router.get(
    {
      path: `${internalApiPath}/executions/{execution_id}/follow`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      validate: {
        params: schema.object({
          execution_id: schema.string(),
        }),
      },
      options: { access: 'internal' },
    },
    async (ctx, request, response) => {
      const { execution } = getInternalServices();

      const abortController = new AbortController();
      request.events.aborted$.subscribe(() => abortController.abort());

      const events$ = execution.followExecution(request.params.execution_id);

      return response.ok({
        headers: {
          'Content-Type': 'text/event-stream',
          'Content-Encoding': 'identity',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'Transfer-Encoding': 'chunked',
          'X-Accel-Buffering': 'no',
        },
        body: observableIntoEventSourceStream(events$ as unknown as Observable<ServerSentEvent>, {
          signal: abortController.signal,
          flushThrottleMs: 100,
          logger,
        }),
      });
    }
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
}
