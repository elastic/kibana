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
import { AGENT_SOCKET_TIMEOUT_MS } from './utils';

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
    browser_api_tools: schema.maybe(
      schema.arrayOf(
        schema.object({
          id: schema.string({
            meta: { description: 'Unique identifier for the browser API tool.' },
          }),
          description: schema.string({
            meta: { description: 'Description of what the browser API tool does.' },
          }),
          schema: schema.any({
            meta: { description: 'JSON Schema defining the tool parameters (JsonSchema7Type).' },
          }),
        }),
        {
          meta: {
            description:
              'Optional browser API tools to be registered as LLM tools with browser.* namespace. These tools execute on the client side.',
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
      browser_api_tools: browserApiTools,
    } = payload;

    return chatService.converse({
      agentId,
      connectorId,
      conversationId,
      capabilities,
      browserApiTools,
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
        timeout: {
          idleSocket: AGENT_SOCKET_TIMEOUT_MS,
        },
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
        const payload: ChatRequestBodyPayload = request.body as ChatRequestBodyPayload;

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
        '`conversation_id_set`\n\n' +
        'Sets the conversation ID.\n\n' +
        'Schema:\n' +
        '```json\n' +
        '{\n' +
        '  "conversation_id": "uuid"\n' +
        '}\n' +
        '```\n\n' +
        '---\n\n' +
        '`conversation_created`\n\n' +
        'Fires when a new conversation is persisted and assigned an ID.\n\n' +
        'Schema:\n' +
        '```json\n' +
        '{\n' +
        '  "conversation_id": "uuid",\n' +
        '  "title": "conversation title"\n' +
        '}\n' +
        '```\n\n' +
        '---\n\n' +
        '`conversation_updated`\n\n' +
        'Fires when a conversation is updated.\n\n' +
        'Schema:\n' +
        '```json\n' +
        '{\n' +
        '  "conversation_id": "uuid",\n' +
        '  "title": "updated conversation title"\n' +
        '}\n' +
        '```\n\n' +
        '---\n\n' +
        '`reasoning`\n\n' +
        'Handles reasoning-related data.\n\n' +
        'Schema:\n' +
        '```json\n' +
        '{\n' +
        '  "reasoning": "plain text reasoning content",\n' +
        '  "transient": false\n' +
        '}\n' +
        '```\n\n' +
        '---\n\n' +
        '`tool_call`\n\n' +
        'Triggers when a tool is invoked.\n\n' +
        'Schema:\n' +
        '```json\n' +
        '{\n' +
        '  "tool_call_id": "uuid",\n' +
        '  "tool_id": "tool_name",\n' +
        '  "params": {}\n' +
        '}\n' +
        '```\n\n' +
        '---\n\n' +
        '`tool_progress`\n\n' +
        'Reports progress of a running tool.\n\n' +
        'Schema:\n' +
        '```json\n' +
        '{\n' +
        '  "tool_call_id": "uuid",\n' +
        '  "message": "progress message"\n' +
        '}\n' +
        '```\n\n' +
        '---\n\n' +
        '`tool_result`\n\n' +
        'Returns results from a completed tool call.\n\n' +
        'Schema:\n' +
        '```json\n' +
        '{\n' +
        '  "tool_call_id": "uuid",\n' +
        '  "tool_id": "tool_name",\n' +
        '  "results": []\n' +
        '}\n' +
        '```\n\n' +
        '**Note:** `results` is an array of `ToolResult` objects.\n\n' +
        '---\n\n' +
        '`message_chunk`\n\n' +
        'Streams partial text chunks.\n\n' +
        'Schema:\n' +
        '```json\n' +
        '{\n' +
        '  "message_id": "uuid",\n' +
        '  "text_chunk": "partial text"\n' +
        '}\n' +
        '```\n\n' +
        '---\n\n' +
        '`message_complete`\n\n' +
        'Indicates message stream is finished.\n\n' +
        'Schema:\n' +
        '```json\n' +
        '{\n' +
        '  "message_id": "uuid",\n' +
        '  "message_content": "full text content of the message"\n' +
        '}\n' +
        '```\n\n' +
        '---\n\n' +
        '`thinking_complete`\n\n' +
        'Marks the end of the thinking/reasoning phase.\n\n' +
        'Schema:\n' +
        '```json\n' +
        '{\n' +
        '  "time_to_first_token": 0\n' +
        '}\n' +
        '```\n\n' +
        '**Note:** `time_to_first_token` is in milliseconds.\n\n' +
        '---\n\n' +
        '`round_complete`\n\n' +
        'Marks end of one conversation round.\n\n' +
        'Schema:\n' +
        '```json\n' +
        '{\n' +
        '  "round": {}\n' +
        '}\n' +
        '```\n\n' +
        '**Note:** `round` contains the full round json object.\n\n' +
        '---\n\n' +
        '## Event flow\n\n' +
        'A typical conversation round emits events in this sequence:\n\n' +
        '1. `reasoning` (potentially multiple, some transient)\n' +
        '2. `tool_call` (if tools are used)\n' +
        '3. `tool_progress` (zero or more progress updates)\n' +
        '4. `tool_result` (when tool completes)\n' +
        '5. `thinking_complete`\n' +
        '6. `message_chunk` (multiple, as text streams)\n' +
        '7. `message_complete`\n' +
        '8. `round_complete`',
      options: {
        timeout: {
          idleSocket: AGENT_SOCKET_TIMEOUT_MS,
        },
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
        const payload: ChatRequestBodyPayload = request.body as ChatRequestBodyPayload;

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
