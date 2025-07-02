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
import {
  AgentMode,
  oneChatDefaultAgentId,
  isRoundCompleteEvent,
  isConversationUpdatedEvent,
  isConversationCreatedEvent,
  ConversationUpdatedEvent,
  ConversationCreatedEvent,
} from '@kbn/onechat-common';
import type { ChatResponse } from '../../common/http_api/chat';
import { apiPrivileges } from '../../common/features';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';

export function registerChatRoutes({ router, getInternalServices, logger }: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  router.post(
    {
      path: '/internal/onechat/chat',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      validate: {
        query: schema.object({
          stream: schema.boolean({ defaultValue: false }),
        }),
        body: schema.object({
          agentId: schema.string({ defaultValue: oneChatDefaultAgentId }),
          mode: schema.oneOf(
            [
              schema.literal(AgentMode.normal),
              schema.literal(AgentMode.reason),
              schema.literal(AgentMode.plan),
              schema.literal(AgentMode.research),
            ],
            { defaultValue: AgentMode.normal }
          ),
          connectorId: schema.maybe(schema.string()),
          conversationId: schema.maybe(schema.string()),
          nextMessage: schema.string(),
        }),
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { chat: chatService } = getInternalServices();
      const { agentId, mode, connectorId, conversationId, nextMessage } = request.body;
      const { stream } = request.query;

      const abortController = new AbortController();
      request.events.aborted$.subscribe(() => {
        abortController.abort();
      });

      const chatEvents$ = chatService.converse({
        agentId,
        mode,
        connectorId,
        conversationId,
        nextInput: { message: nextMessage },
        request,
      });

      if (stream) {
        return response.ok({
          body: observableIntoEventSourceStream(
            chatEvents$ as unknown as Observable<ServerSentEvent>,
            {
              signal: abortController.signal,
              logger,
            }
          ),
        });
      } else {
        const events = await firstValueFrom(chatEvents$.pipe(toArray()));
        const {
          data: { round },
        } = events.find(isRoundCompleteEvent)!;
        const {
          data: { conversationId: convId },
        } = events.find(
          (e): e is ConversationUpdatedEvent | ConversationCreatedEvent =>
            isConversationUpdatedEvent(e) || isConversationCreatedEvent(e)
        )!;
        return response.ok<ChatResponse>({
          body: {
            conversationId: convId,
            steps: round.steps,
            response: round.assistantResponse,
          },
        });
      }
    })
  );
}
