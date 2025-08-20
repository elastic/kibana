/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
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
import { apiPrivileges } from '../../common/features';
import type { ChatService } from '../services/chat';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { getTechnicalPreviewWarning } from './utils';

const TECHNICAL_PREVIEW_WARNING = getTechnicalPreviewWarning('Elastic Chat API');

export function registerChatRoutes({
  router,
  getInternalServices,
  coreSetup,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  const conversePayloadSchema = schema.object({
    agent_id: schema.string({ defaultValue: oneChatDefaultAgentId }),
    connector_id: schema.maybe(schema.string()),
    conversation_id: schema.maybe(schema.string()),
    input: schema.string(),
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
    } = payload;

    return chatService.converse({
      agentId,
      connectorId,
      conversationId,
      abortSignal,
      nextInput: { message: input },
      request,
    });
  };

  router.versioned
    .post({
      path: '/api/chat/converse',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      access: 'public',
      summary: 'Converse with an agent',
      description: TECHNICAL_PREVIEW_WARNING,
      options: {
        availability: {
          stability: 'experimental',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: { body: conversePayloadSchema },
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
      path: '/api/chat/converse/async',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },

      access: 'public',
      summary: 'Converse with an agent and stream events',
      description: TECHNICAL_PREVIEW_WARNING,
      options: {
        availability: {
          stability: 'experimental',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: { body: conversePayloadSchema },
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
