/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { Observable, firstValueFrom, toArray } from 'rxjs';
import { ServerSentEvent } from '@kbn/sse-utils';
import { observableIntoEventSourceStream } from '@kbn/sse-utils-server';
import { KibanaRequest } from '@kbn/core-http-server';
import {
  AgentMode,
  oneChatDefaultAgentId,
  isRoundCompleteEvent,
  isConversationUpdatedEvent,
  isConversationCreatedEvent,
  ConversationUpdatedEvent,
  ConversationCreatedEvent,
} from '@kbn/onechat-common';
import { ChatRequestBodyPayload, ChatResponse } from '../../common/http_api/chat';
import { apiPrivileges } from '../../common/features';
import type { ChatService } from '../services/chat';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { getTechnicalPreviewWarning } from './utils';

const TECHNICAL_PREVIEW_WARNING = getTechnicalPreviewWarning('Elastic Chat API');

export function registerChatRoutes({ router, getInternalServices, logger }: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  const conversePayloadSchema = schema.object({
    agent_id: schema.string({ defaultValue: oneChatDefaultAgentId }),
    mode: schema.oneOf(
      [
        schema.literal(AgentMode.normal),
        schema.literal(AgentMode.reason),
        schema.literal(AgentMode.plan),
        schema.literal(AgentMode.research),
      ],
      { defaultValue: AgentMode.normal }
    ),
    connector_id: schema.maybe(schema.string()),
    conversation_id: schema.maybe(schema.string()),
    input: schema.string(),
  });

  const callConverse = ({
    payload,
    request,
    chatService,
  }: {
    chatService: ChatService;
    payload: ChatRequestBodyPayload;
    request: KibanaRequest;
  }) => {
    const {
      agent_id: agentId,
      mode,
      connector_id: connectorId,
      conversation_id: conversationId,
      input,
    } = payload;

    return chatService.converse({
      agentId,
      mode,
      connectorId,
      conversationId,
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

        const chatEvents$ = callConverse({ chatService, payload, request });

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
        const { chat: chatService } = getInternalServices();
        const payload: ChatRequestBodyPayload = request.body;

        const abortController = new AbortController();
        request.events.aborted$.subscribe(() => {
          abortController.abort();
        });

        const chatEvents$ = callConverse({ chatService, payload, request });

        return response.ok({
          body: observableIntoEventSourceStream(
            chatEvents$ as unknown as Observable<ServerSentEvent>,
            {
              signal: abortController.signal,
              logger,
            }
          ),
        });
      })
    );
}
