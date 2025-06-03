/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { Observable } from 'rxjs';
import { ServerSentEvent } from '@kbn/sse-utils';
import { observableIntoEventSourceStream } from '@kbn/sse-utils-server';
import { OneChatDefaultAgentId } from '@kbn/onechat-common';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';

export function registerChatRoutes({ router, getInternalServices, logger }: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  router.post(
    {
      path: '/internal/onechat/chat',
      security: {
        authz: {
          enabled: false,
          reason: 'Platform feature - RBAC in lower layers',
        },
      },
      validate: {
        body: schema.object({
          agentId: schema.string({ defaultValue: OneChatDefaultAgentId }),
          connectorId: schema.maybe(schema.string()),
          conversationId: schema.maybe(schema.string()),
          nextMessage: schema.string(),
        }),
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { chat: chatService } = getInternalServices();
      const { agentId, connectorId, conversationId, nextMessage } = request.body;

      const abortController = new AbortController();
      request.events.aborted$.subscribe(() => {
        abortController.abort();
      });

      const chatEvents$ = chatService.converse({
        agentId,
        connectorId,
        conversationId,
        nextInput: { message: nextMessage },
        request,
      });

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
