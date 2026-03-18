/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { schema } from '@kbn/config-schema';
import { PassThrough } from 'stream';
import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import {
  ChatCompletionEventType,
  type ChatCompletionChunkEvent,
  type ChatCompletionTokenCount,
} from '@kbn/inference-common';
import type { LlmGatewayPluginStart, LlmGatewayStartDependencies } from '../types';
import {
  type AnthropicMessage,
  anthropicMessagesToInference,
  anthropicToolsToInference,
  inferenceChunkToAnthropicEvents,
  createMessageStartEvent,
  createContentBlockStartEvent,
  createContentBlockStopEvent,
  createMessageDeltaEvent,
  createMessageStopEvent,
  inferenceResponseToAnthropic,
  getLastUserMessageFromAnthropic,
} from '../lib/anthropic_format';
import { recordConversation } from '../lib/conversation_recorder';
import { resolveConnector } from '../lib/resolve_connector';

const SOCKET_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export const registerAnthropicMessagesRoute = ({
  router,
  coreSetup,
  logger,
}: {
  router: IRouter;
  coreSetup: CoreSetup<LlmGatewayStartDependencies, LlmGatewayPluginStart>;
  logger: Logger;
}) => {
  router.post(
    {
      path: '/api/llm_gateway/anthropic/v1/messages',
      security: {
        authz: { enabled: false, reason: 'This route delegates to the inference plugin' },
      },
      options: {
        access: 'public',
        timeout: {
          idleSocket: SOCKET_TIMEOUT_MS,
        },
      },
      validate: {
        body: schema.object({
          model: schema.string({ defaultValue: 'default' }),
          max_tokens: schema.number(),
          messages: schema.arrayOf(
            schema.object({
              role: schema.string(),
              content: schema.oneOf([
                schema.string(),
                schema.arrayOf(schema.recordOf(schema.string(), schema.any())),
              ]),
            }),
            { minSize: 1 }
          ),
          system: schema.maybe(
            schema.oneOf([
              schema.string(),
              schema.arrayOf(
                schema.object({
                  type: schema.string(),
                  text: schema.string(),
                  cache_control: schema.maybe(schema.recordOf(schema.string(), schema.any())),
                })
              ),
            ])
          ),
          stream: schema.boolean({ defaultValue: false }),
          temperature: schema.maybe(schema.number()),
          top_p: schema.maybe(schema.number()),
          top_k: schema.maybe(schema.number()),
          tools: schema.maybe(
            schema.arrayOf(
              schema.object({
                name: schema.string(),
                description: schema.maybe(schema.string()),
                input_schema: schema.maybe(schema.recordOf(schema.string(), schema.any())),
              })
            )
          ),
          tool_choice: schema.maybe(
            schema.oneOf([
              schema.object({
                type: schema.string(),
                name: schema.maybe(schema.string()),
              }),
            ])
          ),
          metadata: schema.maybe(
            schema.object({
              user_id: schema.maybe(schema.nullable(schema.string())),
            })
          ),
          stop_sequences: schema.maybe(schema.arrayOf(schema.string())),
          thinking: schema.maybe(schema.recordOf(schema.string(), schema.any())),
        }, { unknowns: 'allow' }),
      },
    },
    async (ctx, request, response) => {
      try {
        const [, { inference, agentBuilder }] = await coreSetup.getStartServices();
        const client = inference.getClient({ request });

        const { model, messages, system, stream, temperature, tools, tool_choice: toolChoice } =
          request.body;

        // Resolve connector
        const connectorIdHeader = request.headers['x-connector-id'];
        const connectorId =
          typeof connectorIdHeader === 'string' ? connectorIdHeader : model || 'default';
        const resolvedConnectorId = await resolveConnector(inference, request, connectorId);

        // Convert Anthropic messages to inference format
        const { system: inferenceSystem, messages: inferenceMessages } =
          anthropicMessagesToInference(messages as AnthropicMessage[], system as any);

        // Convert tools
        const inferenceTools = anthropicToolsToInference(tools as any);

        // Convert tool_choice
        const inferenceToolChoice = convertAnthropicToolChoice(toolChoice);

        if (stream) {
          return handleStreamingRequest({
            client,
            connectorId: resolvedConnectorId,
            system: inferenceSystem,
            messages: inferenceMessages,
            temperature,
            tools: inferenceTools,
            toolChoice: inferenceToolChoice,
            model,
            request,
            response,
            logger,
            agentBuilder,
            originalMessages: messages as AnthropicMessage[],
          });
        }

        return handleNonStreamingRequest({
          client,
          connectorId: resolvedConnectorId,
          system: inferenceSystem,
          messages: inferenceMessages,
          temperature,
          tools: inferenceTools,
          toolChoice: inferenceToolChoice,
          model,
          request,
          response,
          logger,
          agentBuilder,
          originalMessages: messages as AnthropicMessage[],
        });
      } catch (error) {
        logger.error(`Anthropic messages error: ${error.message}`);
        return response.customError({
          statusCode: error.statusCode || 500,
          body: {
            message: error.message,
            attributes: {
              type: 'error',
              error: {
                type: 'api_error',
                message: error.message,
              },
            },
          },
        });
      }
    }
  );
};

const convertAnthropicToolChoice = (
  toolChoice: { type: string; name?: string } | undefined
): any => {
  if (!toolChoice) {
    return undefined;
  }
  if (toolChoice.type === 'auto') {
    return 'auto';
  }
  if (toolChoice.type === 'any') {
    return 'required';
  }
  if (toolChoice.type === 'none') {
    return 'none';
  }
  if (toolChoice.type === 'tool' && toolChoice.name) {
    return { function: toolChoice.name };
  }
  return undefined;
};

const handleStreamingRequest = async ({
  client,
  connectorId,
  system,
  messages,
  temperature,
  tools,
  toolChoice,
  model,
  request,
  response,
  logger: routeLogger,
  agentBuilder,
  originalMessages,
}: {
  client: any;
  connectorId: string;
  system?: string;
  messages: any[];
  temperature?: number;
  tools?: any;
  toolChoice?: any;
  model: string;
  request: any;
  response: any;
  logger: Logger;
  agentBuilder: LlmGatewayStartDependencies['agentBuilder'];
  originalMessages: AnthropicMessage[];
}) => {
  const messageId = `msg_${uuidv4()}`;
  const stream = new PassThrough();
  let hasToolCalls = false;
  let tokenCount: ChatCompletionTokenCount | undefined;
  let contentBlockStarted = false;
  let currentBlockIndex = 0;
  const contentParts: string[] = [];
  const collectedToolCalls: Array<{
    id: string;
    type: string;
    function: { name: string; arguments: string };
  }> = [];

  const abortController = new AbortController();
  request.events.aborted$.subscribe(() => {
    abortController.abort();
  });

  // Send message_start
  stream.write(createMessageStartEvent(messageId, model, 0));

  const events$ = client.chatComplete({
    connectorId,
    system,
    messages,
    temperature,
    tools,
    toolChoice,
    stream: true,
    abortSignal: abortController.signal,
  });

  events$.subscribe({
    next: (event: any) => {
      if (event.type === ChatCompletionEventType.ChatCompletionChunk) {
        const chunk = event as ChatCompletionChunkEvent;

        // Start text content block on first text chunk
        if (chunk.content && !contentBlockStarted) {
          stream.write(
            createContentBlockStartEvent(currentBlockIndex, { type: 'text', text: '' })
          );
          contentBlockStarted = true;
        }

        if (chunk.content) {
          contentParts.push(chunk.content);
        }

        // Handle tool call starts
        if (chunk.tool_calls) {
          for (const tc of chunk.tool_calls) {
            hasToolCalls = true;
            if (!collectedToolCalls[tc.index]) {
              // Close text block if open
              if (contentBlockStarted) {
                stream.write(createContentBlockStopEvent(currentBlockIndex));
                currentBlockIndex++;
                contentBlockStarted = false;
              }
              collectedToolCalls[tc.index] = {
                id: tc.toolCallId || `toolu_${uuidv4()}`,
                type: 'function',
                function: { name: '', arguments: '' },
              };
              if (tc.function?.name) {
                collectedToolCalls[tc.index].function.name = tc.function.name;
              }
              // Start tool_use content block
              stream.write(
                createContentBlockStartEvent(currentBlockIndex + tc.index, {
                  type: 'tool_use',
                  id: collectedToolCalls[tc.index].id,
                  name: tc.function?.name || '',
                  input: {},
                })
              );
            }
            const existing = collectedToolCalls[tc.index];
            if (tc.toolCallId) {
              existing.id = tc.toolCallId;
            }
            if (tc.function?.name) {
              existing.function.name += tc.function.name;
            }
            if (tc.function?.arguments) {
              existing.function.arguments += tc.function.arguments;
            }
          }
        }

        // Write chunk events
        const chunkEvents = inferenceChunkToAnthropicEvents(chunk, contentBlockStarted ? 0 : currentBlockIndex);
        for (const evt of chunkEvents) {
          stream.write(evt);
        }
      } else if (event.type === ChatCompletionEventType.ChatCompletionTokenCount) {
        tokenCount = event.tokens;
      }
    },
    error: (error: Error) => {
      routeLogger.error(`Anthropic streaming error: ${error.message}`);
      stream.write(
        `event: error\ndata: ${JSON.stringify({
          type: 'error',
          error: { type: 'api_error', message: error.message },
        })}\n\n`
      );
      stream.end();
    },
    complete: () => {
      // Close any open content blocks
      if (contentBlockStarted) {
        stream.write(createContentBlockStopEvent(currentBlockIndex));
        currentBlockIndex++;
      }
      for (let i = 0; i < collectedToolCalls.length; i++) {
        if (collectedToolCalls[i]) {
          stream.write(createContentBlockStopEvent(currentBlockIndex + i));
        }
      }

      const stopReason = hasToolCalls ? 'tool_use' : 'end_turn';
      stream.write(createMessageDeltaEvent(stopReason, tokenCount?.completion ?? 0));
      stream.write(createMessageStopEvent());
      stream.end();

      // Fire-and-forget: record conversation
      const userMessage = getLastUserMessageFromAnthropic(originalMessages);
      recordConversation({
        request,
        agentBuilder,
        logger: routeLogger,
        messages: originalMessages.map((m) => ({
          role: m.role,
          content:
            typeof m.content === 'string'
              ? m.content
              : m.content
                  .filter((b: any) => b.type === 'text')
                  .map((b: any) => b.text)
                  .join(''),
        })),
        assistantMessage: contentParts.join(''),
        toolCalls: collectedToolCalls.filter(Boolean),
        tokenUsage: tokenCount
          ? { prompt_tokens: tokenCount.prompt, completion_tokens: tokenCount.completion }
          : undefined,
        model,
        connectorId,
      }).catch((err) => {
        routeLogger.error(`Failed to record streaming conversation: ${err.message}`);
      });
    },
  });

  return response.ok({
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Transfer-Encoding': 'chunked',
      'X-Accel-Buffering': 'no',
    },
    body: stream,
  });
};

const handleNonStreamingRequest = async ({
  client,
  connectorId,
  system,
  messages,
  temperature,
  tools,
  toolChoice,
  model,
  request,
  response,
  logger: routeLogger,
  agentBuilder,
  originalMessages,
}: {
  client: any;
  connectorId: string;
  system?: string;
  messages: any[];
  temperature?: number;
  tools?: any;
  toolChoice?: any;
  model: string;
  request: any;
  response: any;
  logger: Logger;
  agentBuilder: LlmGatewayStartDependencies['agentBuilder'];
  originalMessages: AnthropicMessage[];
}) => {
  const result = await client.chatComplete({
    connectorId,
    system,
    messages,
    temperature,
    tools,
    toolChoice,
    stream: false,
  });

  const anthropicResponse = inferenceResponseToAnthropic(result, model);

  const assistantMessage = result.content || '';
  const resultToolCalls = result.toolCalls?.map((tc: any) => ({
    id: tc.toolCallId,
    type: 'function' as const,
    function: {
      name: tc.function.name,
      arguments: JSON.stringify(tc.function.arguments),
    },
  }));

  // Fire-and-forget: record conversation
  recordConversation({
    request,
    agentBuilder,
    logger: routeLogger,
    messages: originalMessages.map((m) => ({
      role: m.role,
      content:
        typeof m.content === 'string'
          ? m.content
          : m.content
              .filter((b: any) => b.type === 'text')
              .map((b: any) => b.text)
              .join(''),
    })),
    assistantMessage,
    toolCalls: resultToolCalls,
    model,
    connectorId,
  }).catch((err) => {
    routeLogger.error(`Failed to record conversation: ${err.message}`);
  });

  return response.ok({
    headers: {
      'Content-Type': 'application/json',
    },
    body: anthropicResponse,
  });
};
