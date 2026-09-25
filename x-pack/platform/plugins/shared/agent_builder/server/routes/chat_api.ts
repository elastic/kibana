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
import type { ChatRequestBodyPayload, ChatConverseResponse } from '../../common/http_api/chat';
import { ChatTriggerMode } from '../../common/http_api/chat';
import { chatApiPath } from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { AGENT_SOCKET_TIMEOUT_MS, getSSEResponseHeaders } from './utils';
import { getConverseHelpers, filterEventsNativeApiEvents } from './converse_helpers';
import { findConversationEvent } from '../services/execution/utils/chat_response';
import { conversePayloadSchema } from './chat';

export const chatPayloadSchema = conversePayloadSchema.extends({
  trigger_mode: schema.oneOf(
    [schema.literal(ChatTriggerMode.Always), schema.literal(ChatTriggerMode.Never)],
    {
      defaultValue: ChatTriggerMode.Always,
      meta: {
        description:
          'Use never to append a user message without executing the agent. The message is added to the conversation named by conversation_id, or to a conversation created for it when conversation_id is omitted. Only conversation_id, input and attachments are read; the execution options are ignored.',
      },
    }
  ),
});

/** Events-native chat API */
export function registerChatApiRoutes({
  router,
  getInternalServices,
  coreSetup,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  const { validateConfigurationOverrides, maybeExecuteAgent } = getConverseHelpers({
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
        'Send a message to an agent and receive the full conversation, including its event timeline. This synchronous endpoint waits for the agent to finish before returning. With trigger_mode: never, appends a user message without execution and returns the conversation it was added to, creating one when conversation_id is omitted; the execution options are ignored.',
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
          request: { body: chatPayloadSchema },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const payload = request.body as ChatRequestBodyPayload;

        const { conversations: conversationsService, execution: executionService } =
          getInternalServices();

        await validateConfigurationOverrides({ payload, request });

        const { events$: chatEvents$ } = await maybeExecuteAgent({
          payload,
          request,
          executionService,
        });

        const events = await firstValueFrom(chatEvents$.pipe(toArray()));
        const conversationId = findConversationEvent(events).data.conversation_id;

        const client = await conversationsService.getScopedClient({ request });
        const conversation = await client.get(conversationId);

        return response.ok<ChatConverseResponse>({ body: conversation });
      })
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
        'Send a message to an agent and stream the response as server-sent events as the agent works. With trigger_mode: never, the message is appended without execution and the stream carries the conversation events alone.',
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
          request: { body: chatPayloadSchema },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const [, { cloud }] = await coreSetup.getStartServices();
        const { execution: executionService } = getInternalServices();
        const payload = request.body as ChatRequestBodyPayload;

        await validateConfigurationOverrides({ payload, request });

        const abortController = new AbortController();
        request.events.aborted$.subscribe(() => {
          abortController.abort();
        });

        const { events$: chatEvents$ } = await maybeExecuteAgent({
          payload,
          request,
          executionService,
        });

        const nativeEvents$ = chatEvents$.pipe(filterEventsNativeApiEvents());

        return response.ok({
          headers: getSSEResponseHeaders(),
          body: observableIntoEventSourceStream(
            nativeEvents$ as unknown as Observable<ServerSentEvent>,
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
