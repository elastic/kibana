/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
import { validate as uuidValidate } from 'uuid';
import { schema } from '@kbn/config-schema';
import type { Observable } from 'rxjs';
import { firstValueFrom, toArray } from 'rxjs';
import type { ServerSentEvent } from '@kbn/sse-utils';
import { observableIntoEventSourceStream, cloudProxyBufferSize } from '@kbn/sse-utils-server';
import {
  agentBuilderDefaultAgentId,
  agentIdMaxLength,
  CONVERSATION_ID_MAX_LENGTH,
  createNonInteractiveConfig,
} from '@kbn/agent-builder-common';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import type {
  ChatRequestBodyPayload,
  ChatConverseResponse,
  ChatMessageRequestBodyPayload,
  ChatMessageResponse,
} from '../../common/http_api/chat';
import { ChatTriggerMode } from '../../common/http_api/chat';
import { chatApiPath } from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { AGENT_SOCKET_TIMEOUT_MS, getSSEResponseHeaders } from './utils';
import { getConverseHelpers, filterEventsNativeApiEvents } from './converse_helpers';
import { findConversationEvent } from '../services/execution/utils/chat_response';
import { buildChatMessageResponseFromEvents } from '../services/execution/utils/chat_message_response';
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

/** Upper bound of a `POST /api/chat/message` message, so a pasted CLI input cannot be unbounded. */
export const CHAT_MESSAGE_MAX_LENGTH = 100_000;

/**
 * Body of `POST /api/chat/message`. Deliberately minimal: `schema.object` rejects unknown keys, so
 * the converse options (`connector_id`, `attachments`, `prompts`, `_execution_mode`, ...) are 400s
 * rather than silently ignored.
 */
export const chatMessagePayloadSchema = schema.object({
  message: schema.string({
    minLength: 1,
    maxLength: CHAT_MESSAGE_MAX_LENGTH,
    meta: { description: 'The user message to send to the agent.' },
  }),
  agent_id: schema.string({
    defaultValue: agentBuilderDefaultAgentId,
    minLength: 1,
    maxLength: agentIdMaxLength,
    meta: {
      description:
        'The ID of the agent to send the message to. Defaults to the default Elastic AI agent.',
    },
  }),
  conversation_id: schema.maybe(
    schema.string({
      maxLength: CONVERSATION_ID_MAX_LENGTH,
      validate: (v) => (uuidValidate(v) ? undefined : 'conversation_id must be a valid UUID'),
      meta: {
        description:
          'The ID of an existing conversation to continue. Omit it to start a new conversation; the response carries the ID to reuse on the next call.',
      },
    })
  ),
});

/** Success body of `POST /api/chat/message`; lazy because core builds response schemas on demand. */
export const chatMessageResponseSchema = () =>
  schema.object({
    conversation_id: schema.string({
      meta: {
        description:
          'The conversation the message was added to: the one requested, or the one created for it.',
      },
    }),
    answer: schema.string({
      meta: {
        description:
          "The agent's final text answer. Empty when the agent finished without a message.",
      },
    }),
    declined_prompts: schema.arrayOf(
      schema.object({
        tool_id: schema.string({ meta: { description: 'The tool whose call was declined.' } }),
        message: schema.string({
          meta: { description: 'The explanation the agent received in place of the prompt.' },
        }),
      }),
      {
        meta: {
          description:
            'Prompts the agent raised that would have paused an interactive conversation (tool confirmations, questions to the user, destructive API approvals). This endpoint has no user to answer them, so each was declined and the agent told why; the list is empty when the agent asked for none.',
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

  const { validateConfigurationOverrides, maybeExecuteAgent, executeAgent } = getConverseHelpers({
    getInternalServices,
  });

  router.versioned
    .post({
      path: `${chatApiPath}/message`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'public',
      summary: 'Send a message and get the answer',
      description:
        'Send one message to an agent and wait for its text answer. This synchronous endpoint is meant for scripts and command-line tools: it returns the answer and the conversation ID alone, never a stream or an event timeline. Pass the returned `conversation_id` on the next call to continue the conversation. The agent runs without a user to answer it, so any prompt it raises (tool confirmation, question, destructive API approval) is declined on its behalf and reported in `declined_prompts`; attachments are not supported. Requires the `agentBuilder:experimentalFeatures` advanced setting to be enabled; the endpoint answers 404 otherwise.',
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
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/chat_message.yaml'),
        },
        validate: {
          request: { body: chatMessagePayloadSchema },
          response: {
            200: {
              body: chatMessageResponseSchema,
              description:
                'The agent answered; the conversation ID identifies where the exchange was stored.',
            },
          },
        },
      },
      wrapHandler(
        async (ctx, request, response) => {
          const {
            message,
            agent_id: agentId,
            conversation_id: conversationId,
          } = request.body as ChatMessageRequestBodyPayload;
          const { execution: executionService } = getInternalServices();
          const { events$ } = await executeAgent({
            payload: { agent_id: agentId, conversation_id: conversationId, input: message },
            request,
            executionService,
            interactive: createNonInteractiveConfig(),
            autoCreateConversationWithId: false,
          });

          const events = await firstValueFrom(events$.pipe(toArray()));

          return response.ok<ChatMessageResponse>({
            body: buildChatMessageResponseFromEvents(events),
          });
        },
        { featureFlag: AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID }
      )
    );

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
