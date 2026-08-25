/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { firstValueFrom, toArray } from 'rxjs';
import type { ServerSentEvent } from '@kbn/sse-utils';
import { observableIntoEventSourceStream, cloudProxyBufferSize } from '@kbn/sse-utils-server';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import {
  isConversationCreatedEvent,
  isConversationUpdatedEvent,
  type ChatEvent,
  type ConversationCreatedEvent,
  type ConversationUpdatedEvent,
} from '@kbn/agent-builder-common';
import type { ChatRequestBodyPayload, ChatConverseResponse } from '../../common/http_api/chat';
import { chatApiPath } from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { AGENT_SOCKET_TIMEOUT_MS, getSSEResponseHeaders } from './utils';
import { getConverseHelpers } from './converse_helpers';
import { conversePayloadSchema } from './chat';

/** Recovers the conversation id from the chat stream's conversation created/updated event. */
const getConversationId = (events: ChatEvent[]): string => {
  const conversationEvent = events.find(
    (event): event is ConversationCreatedEvent | ConversationUpdatedEvent =>
      isConversationCreatedEvent(event) || isConversationUpdatedEvent(event)
  );
  if (!conversationEvent) {
    throw new Error('No conversation event was emitted');
  }
  return conversationEvent.data.conversation_id;
};

/**
 * Events-native chat API. A thin, experimental `/api/chat` surface over the same execution service
 * as the legacy `/api/agent_builder/converse` routes: it runs the agent and returns the conversation
 * with its `events` timeline. Reads still go through the existing conversation GET (which already
 * carries `events`); this PR adds only converse. Gated by the experimental feature flag.
 */
export function registerChatApiRoutes({
  router,
  getInternalServices,
  coreSetup,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  const { validateAction, validateConfigurationOverrides, executeAgent } = getConverseHelpers({
    getInternalServices,
  });

  router.versioned
    .post({
      path: `${chatApiPath}/converse`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'public',
      summary: 'Send chat message',
      description:
        'Send a message to an agent and receive the full conversation, including its event timeline. This synchronous endpoint waits for the agent to finish before returning.',
      options: {
        timeout: {
          idleSocket: AGENT_SOCKET_TIMEOUT_MS,
        },
        tags: ['oas-tag:agent builder'],
        availability: {
          stability: 'experimental',
          since: '9.6.0',
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
      wrapHandler(
        async (ctx, request, response) => {
          const { execution: executionService, conversations: conversationsService } =
            getInternalServices();
          const payload = request.body as ChatRequestBodyPayload;

          await validateConfigurationOverrides({ payload, request });
          validateAction(payload);

          const { events$: chatEvents$ } = await executeAgent({
            payload,
            request,
            executionService,
          });

          const events = await firstValueFrom(chatEvents$.pipe(toArray()));
          const conversationId = getConversationId(events);

          const client = await conversationsService.getScopedClient({ request });
          const conversation = await client.get(conversationId);

          return response.ok<ChatConverseResponse>({ body: conversation });
        },
        { featureFlag: AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID }
      )
    );

  router.versioned
    .post({
      path: `${chatApiPath}/converse/async`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'public',
      summary: 'Send chat message (streaming)',
      description:
        'Send a message to an agent and stream the response as server-sent events as the agent works.',
      options: {
        timeout: {
          idleSocket: AGENT_SOCKET_TIMEOUT_MS,
        },
        tags: ['oas-tag:agent builder'],
        availability: {
          stability: 'experimental',
          since: '9.6.0',
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
      wrapHandler(
        async (ctx, request, response) => {
          const [, { cloud }] = await coreSetup.getStartServices();
          const { execution: executionService } = getInternalServices();
          const payload = request.body as ChatRequestBodyPayload;

          await validateConfigurationOverrides({ payload, request });
          validateAction(payload);

          const abortController = new AbortController();
          request.events.aborted$.subscribe(() => {
            abortController.abort();
          });

          const { events$: chatEvents$ } = await executeAgent({
            payload,
            request,
            executionService,
          });

          return response.ok({
            headers: getSSEResponseHeaders(),
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
        },
        { featureFlag: AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID }
      )
    );
}
