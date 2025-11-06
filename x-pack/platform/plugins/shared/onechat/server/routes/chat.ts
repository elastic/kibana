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
  createBadRequestError,
} from '@kbn/onechat-common';
import type { AttachmentInput } from '@kbn/onechat-common/attachments';
import type { ChatRequestBodyPayload, ChatResponse } from '../../common/http_api/chat';
import { publicApiPath } from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import type { ChatService } from '../services/chat';
import type { AttachmentServiceStart } from '../services/attachments';
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
    attachments: schema.maybe(
      schema.arrayOf(
        schema.object({
          id: schema.maybe(
            schema.string({
              meta: { description: 'Optional id for the attachment.' },
            })
          ),
          type: schema.string({
            meta: { description: 'Type of the attachment.' },
          }),
          data: schema.recordOf(schema.string(), schema.any(), {
            meta: { description: 'Payload of the attachment.' },
          }),
          hidden: schema.maybe(
            schema.boolean({
              meta: { description: 'When true, the attachment will not be displayed in the UI.' },
            })
          ),
        }),
        { meta: { description: 'Optional attachments to send with the message.' } }
      )
    ),
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

  const validateAttachments = async ({
    attachments,
    attachmentsService,
  }: {
    attachments: AttachmentInput[];
    attachmentsService: AttachmentServiceStart;
  }) => {
    const results: AttachmentInput[] = [];
    for (const attachment of attachments) {
      const validation = await attachmentsService.validate(attachment);
      if (validation.valid) {
        results.push(validation.attachment);
      } else {
        throw createBadRequestError(`Attachment validation failed: ${validation.error}`);
      }
    }
    return results;
  };

  const callConverse = ({
    payload,
    attachments,
    request,
    chatService,
    abortSignal,
  }: {
    payload: Omit<ChatRequestBodyPayload, 'attachments'>;
    attachments: AttachmentInput[];
    request: KibanaRequest;
    chatService: ChatService;
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
      nextInput: {
        message: input,
        attachments,
      },
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
        const { chat: chatService, attachments: attachmentsService } = getInternalServices();
        const payload: ChatRequestBodyPayload = request.body;

        const abortController = new AbortController();
        request.events.aborted$.subscribe(() => {
          abortController.abort();
        });

        const attachments = payload.attachments
          ? await validateAttachments({
              attachments: payload.attachments,
              attachmentsService,
            })
          : [];

        const chatEvents$ = callConverse({
          payload,
          attachments,
          chatService,
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
        "Send a message to an agent and receive real-time streaming events. This asynchronous endpoint provides live updates as the agent processes your request, allowing you to see intermediate steps and progress. Use this for interactive experiences where you want to monitor the agent's thinking process.\n\n" +
        '## Event types\n\n' +
        'The endpoint emits Server-Sent Events (SSE) with the following custom event types:\n\n' +
        '### `conversation_id_set`\n' +
        'Emitted when the conversation ID is set or confirmed.\n' +
        '- `conversation_id` (string): The UUID of the conversation\n\n' +
        '### `conversation_created`\n' +
        'Emitted when a new conversation is created and persisted.\n' +
        '- `conversation_id` (string): The UUID of the newly created conversation\n' +
        '- `title` (string): The title of the conversation\n\n' +
        '### `conversation_updated`\n' +
        "Emitted when an existing conversation's metadata is updated.\n" +
        '- `conversation_id` (string): The UUID of the conversation\n' +
        '- `title` (string): The updated title of the conversation\n\n' +
        '### `reasoning`\n' +
        "Emitted during the agent's reasoning/thinking process.\n" +
        "- `reasoning` (string): Plain text content describing the agent's reasoning\n" +
        '- `transient` (boolean, optional): If true, the reasoning will not be persisted or displayed in the thinking panel, only shown as "current thinking"\n\n' +
        '### `tool_call`\n' +
        'Emitted when the agent invokes a tool.\n' +
        '- `tool_call_id` (string): Unique identifier for this tool invocation\n' +
        '- `tool_id` (string): The name/ID of the tool being called\n' +
        '- `params` (object): Parameters passed to the tool\n\n' +
        '### `tool_progress`\n' +
        'Emitted to report progress updates during tool execution.\n' +
        '- `tool_call_id` (string): The UUID of the tool call this progress update relates to\n' +
        '- `message` (string): Human-readable progress message\n\n' +
        '### `tool_result`\n' +
        'Emitted when a tool call completes and returns results.\n' +
        '- `tool_call_id` (string): The UUID of the completed tool call\n' +
        '- `tool_id` (string): The name/ID of the tool that was called\n' +
        "- `results` (array): Array of ToolResult objects containing the tool's output\n\n" +
        '### `message_chunk`\n' +
        "Emitted for streaming text chunks of the agent's response message.\n" +
        '- `message_id` (string): UUID of the message this chunk belongs to\n' +
        '- `text_chunk` (string): Partial text content (text delta)\n\n' +
        '### `message_complete`\n' +
        "Emitted when the agent's message stream is finished.\n" +
        '- `message_id` (string): UUID of the completed message\n' +
        '- `message_content` (string): Full text content of the complete message\n\n' +
        '### `thinking_complete`\n' +
        "Emitted when the agent's thinking phase is complete and the first token arrives.\n" +
        '- `time_to_first_token` (number): Time elapsed from round start to first token arrival, in milliseconds\n\n' +
        '### `round_complete`\n' +
        'Emitted when a complete conversation round finishes.\n' +
        '- `round` (object): The complete ConversationRound object containing the full round data, including input, steps, response, and metadata',
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
        const { chat: chatService, attachments: attachmentsService } = getInternalServices();
        const payload: ChatRequestBodyPayload = request.body;

        const abortController = new AbortController();
        request.events.aborted$.subscribe(() => {
          abortController.abort();
        });

        const attachments = payload.attachments
          ? await validateAttachments({
              attachments: payload.attachments,
              attachmentsService,
            })
          : [];

        const chatEvents$ = callConverse({
          payload,
          attachments,
          request,
          chatService,
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
