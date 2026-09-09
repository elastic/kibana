/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { firstValueFrom, toArray, of } from 'rxjs';
import type { ServerSentEvent } from '@kbn/sse-utils';
import { observableIntoEventSourceStream, cloudProxyBufferSize } from '@kbn/sse-utils-server';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import type { EventChatRequestBodyPayload, ChatConverseResponse } from '../../common/http_api/chat';
import { chatApiPath } from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { AGENT_SOCKET_TIMEOUT_MS, getSSEResponseHeaders } from './utils';
import { getConverseHelpers } from './converse_helpers';
import { findConversationEvent } from '../services/execution/utils/chat_response';
import { getMessageOnlyHandler } from './message_only';
import { eventConversePayloadSchema } from './chat';

/** Events-native chat API */
export function registerChatApiRoutes({
  router,
  getInternalServices,
  coreSetup,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });
  const persistMessage = getMessageOnlyHandler({ getInternalServices });

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
        'Send a message to an agent and receive the full conversation, including its event timeline. This synchronous endpoint waits for the agent to finish before returning. With trigger_mode: never, persists text or attachments without execution and returns { conversation_id, message_id }; execution-only options are rejected.',
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
          request: { body: eventConversePayloadSchema },
        },
      },
      wrapHandler(
        async (ctx, request, response) => {
          const { execution: executionService, conversations: conversationsService } =
            getInternalServices();
          const payload = request.body as EventChatRequestBodyPayload;

          if (payload.trigger_mode === 'never') {
            const body = await persistMessage({
              payload,
              request,
              spaceId: (await ctx.agentBuilder).spaces.getSpaceId(),
            });
            return response.ok({ body });
          }

          await validateConfigurationOverrides({ payload, request });
          validateAction(payload);

          const { events$: chatEvents$ } = await executeAgent({
            payload,
            request,
            executionService,
          });

          const events = await firstValueFrom(chatEvents$.pipe(toArray()));
          const conversationId = findConversationEvent(events).data.conversation_id;

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
        'Send a message to an agent and stream the response as server-sent events as the agent works. With trigger_mode: never, emits one message_persisted event containing { conversation_id, message_id } after persistence and closes. Public message-only requests do not deduplicate retries.',
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
          request: { body: eventConversePayloadSchema },
        },
      },
      wrapHandler(
        async (ctx, request, response) => {
          const { execution: executionService } = getInternalServices();
          const payload = request.body as EventChatRequestBodyPayload;

          if (payload.trigger_mode === 'never') {
            const data = await persistMessage({
              payload,
              request,
              spaceId: (await ctx.agentBuilder).spaces.getSpaceId(),
            });
            return response.ok({
              headers: getSSEResponseHeaders(),
              body: observableIntoEventSourceStream(of({ type: 'message_persisted', data }), {
                logger,
                signal: new AbortController().signal,
              }),
            });
          }

          await validateConfigurationOverrides({ payload, request });
          validateAction(payload);

          const [, { cloud }] = await coreSetup.getStartServices();
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
