/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import path from 'node:path';
import type { Observable } from 'rxjs';
import { firstValueFrom, toArray } from 'rxjs';
import type { ServerSentEvent } from '@kbn/sse-utils';
import { observableIntoEventSourceStream, cloudProxyBufferSize } from '@kbn/sse-utils-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ConversationUpdatedEvent, ConversationCreatedEvent } from '@kbn/onechat-common';
import {
  oneChatDefaultAgentId,
  isRoundCompleteEvent,
  isConversationUpdatedEvent,
  isConversationCreatedEvent,
} from '@kbn/onechat-common';
import type { ChatRequestBodyPayload, ChatResponse } from '../../common/http_api/chat';
import { publicApiPath } from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import type { ChatService } from '../services/chat';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';

export function registerChatRoutes({
  router,
  getInternalServices,
  coreSetup,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  const conversePayloadSchema = schema.object({
    agent_id: schema.string({
      defaultValue: oneChatDefaultAgentId,
      meta: {
        description: 'The ID of the agent to chat with. Defaults to the default Elastic AI agent.',
      },
    }),
    connector_id: schema.maybe(
      schema.string({
        meta: {
          description: 'Optional connector ID for the agent to use for external integrations.',
        },
      })
    ),
    conversation_id: schema.maybe(
      schema.string({
        meta: {
          description: 'Optional existing conversation ID to continue a previous conversation.',
        },
      })
    ),
    input: schema.string({
      meta: { description: 'The user input message to send to the agent.' },
    }),
    capabilities: schema.maybe(
      schema.object(
        {
          visualizations: schema.maybe(
            schema.boolean({
              meta: {
                description:
                  'When true, allows the agent to render tabular data from tool results as interactive visualizations using custom XML elements in responses.',
              },
            })
          ),
        },
        {
          meta: {
            description:
              'Controls agent capabilities during conversation. Currently supports visualization rendering for tabular tool results.',
          },
        }
      )
    ),
  });

  const callConverse = ({
    payload,
    request,
    chatService,
    abortSignal,
  }: {
    chatService: ChatService;
    payload: ChatRequestBodyPayload;
    request: KibanaRequest;
    abortSignal: AbortSignal;
  }) => {
    const {
      agent_id: agentId,
      connector_id: connectorId,
      conversation_id: conversationId,
      input,
      capabilities,
    } = payload;

    return chatService.converse({
      agentId,
      connectorId,
      conversationId,
      capabilities,
      abortSignal,
      nextInput: { message: input },
      request,
    });
  };

  router.versioned
    .post({
      path: `${publicApiPath}/converse`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      access: 'public',
      summary: 'Send chat message',
      description:
        'Send a message to an agent and receive a complete response. This synchronous endpoint waits for the agent to fully process your request before returning the final result. Use this for simple chat interactions where you need the complete response.',
      options: {
        tags: ['oas-tag:agent builder'],
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
          request: { body: conversePayloadSchema },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/chat_converse.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { chat: chatService } = getInternalServices();
        const payload: ChatRequestBodyPayload = request.body;

        const abortController = new AbortController();
        request.events.aborted$.subscribe(() => {
          abortController.abort();
        });

        const chatEvents$ = callConverse({
          chatService,
          payload,
          request,
          abortSignal: abortController.signal,
        });

        const events = await firstValueFrom(chatEvents$.pipe(toArray()));
        const {
          data: { round },
        } = events.find(isRoundCompleteEvent)!;
        const {
          data: { conversation_id: convId },
        } = events.find(
          (e): e is ConversationUpdatedEvent | ConversationCreatedEvent =>
            isConversationUpdatedEvent(e) || isConversationCreatedEvent(e)
        )!;
        return response.ok<ChatResponse>({
          body: {
            conversation_id: convId,
            trace_id: round.trace_id,
            steps: round.steps,
            response: round.response,
          },
        });
      })
    );

  router.versioned
    .post({
      path: `${publicApiPath}/converse/async`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      access: 'public',
      summary: 'Send chat message (streaming)',
      description:
        "Send a message to an agent and receive real-time streaming events. This asynchronous endpoint provides live updates as the agent processes your request, allowing you to see intermediate steps and progress. Use this for interactive experiences where you want to monitor the agent's thinking process.",
      options: {
        tags: ['oas-tag:agent builder'],
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
          request: { body: conversePayloadSchema },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/chat_converse_async.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const [, { cloud }] = await coreSetup.getStartServices();
        const { chat: chatService } = getInternalServices();
        const payload: ChatRequestBodyPayload = request.body;

        const abortController = new AbortController();
        request.events.aborted$.subscribe(() => {
          abortController.abort();
        });

        const chatEvents$ = callConverse({
          chatService,
          payload,
          request,
          abortSignal: abortController.signal,
        });

        return response.ok({
          headers: {
            // cloud compress text/* types, loosing chunking capabilities which we need for SSE
            'Content-Type': cloud?.isCloudEnabled
              ? 'application/octet-stream'
              : 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'Transfer-Encoding': 'chunked',
            'X-Content-Type-Options': 'nosniff',
            // This disables response buffering on proxy servers
            'X-Accel-Buffering': 'no',
          },
          body: observableIntoEventSourceStream(
            chatEvents$ as unknown as Observable<ServerSentEvent>,
            {
              signal: abortController.signal,
              flushThrottleMs: 100,
              flushMinBytes: cloud?.isCloudEnabled ? cloudProxyBufferSize : undefined,
              logger,
            }
          ),
        });
      })
    );
}
