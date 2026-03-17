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
  type OpenAiMessage,
  openAiMessagesToInference,
  openAiToolsToInference,
  inferenceChunkToOpenAi,
  createFinalChunk,
  inferenceResponseToOpenAi,
} from '../lib/openai_format';
import { recordConversation } from '../lib/conversation_recorder';

const SOCKET_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export const registerChatCompletionsRoute = ({
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
      path: '/api/llm_gateway/v1/chat/completions',
      security: {
        authz: { enabled: false, reason: 'This route delegates to the inference plugin' },
      },
      options: {
        timeout: {
          idleSocket: SOCKET_TIMEOUT_MS,
        },
      },
      validate: {
        body: schema.object({
          model: schema.string({ defaultValue: 'default' }),
          messages: schema.arrayOf(
            schema.object({
              role: schema.string(),
              content: schema.nullable(
                schema.oneOf([
                  schema.string(),
                  schema.arrayOf(schema.recordOf(schema.string(), schema.any())),
                ])
              ),
              tool_calls: schema.maybe(
                schema.arrayOf(
                  schema.object({
                    id: schema.string(),
                    type: schema.string(),
                    function: schema.object({
                      name: schema.string(),
                      arguments: schema.string(),
                    }),
                  })
                )
              ),
              tool_call_id: schema.maybe(schema.string()),
              name: schema.maybe(schema.string()),
            }),
            { minSize: 1 }
          ),
          stream: schema.boolean({ defaultValue: false }),
          temperature: schema.maybe(schema.number()),
          max_tokens: schema.maybe(schema.number()),
          tools: schema.maybe(
            schema.arrayOf(
              schema.object({
                type: schema.string(),
                function: schema.object({
                  name: schema.string(),
                  description: schema.maybe(schema.string()),
                  parameters: schema.maybe(schema.recordOf(schema.string(), schema.any())),
                }),
              })
            )
          ),
          tool_choice: schema.maybe(
            schema.oneOf([
              schema.string(),
              schema.object({
                type: schema.string(),
                function: schema.maybe(
                  schema.object({
                    name: schema.string(),
                  })
                ),
              }),
            ])
          ),
        }),
      },
    },
    async (ctx, request, response) => {
      try {
        const [, { inference, agentBuilder }] = await coreSetup.getStartServices();
        const client = inference.getClient({ request });

        const {
          model,
          messages,
          stream,
          temperature,
          tools,
          tool_choice: toolChoice,
        } = request.body;

        // Resolve connector: use x-connector-id header, or try model as connector ID, or use default
        const connectorIdHeader = request.headers['x-connector-id'];
        const connectorId =
          typeof connectorIdHeader === 'string' ? connectorIdHeader : model || 'default';

        // Resolve the actual connector to use
        const resolvedConnectorId = await resolveConnector(inference, request, connectorId);

        // Convert OpenAI messages to inference format
        const { system, messages: inferenceMessages } = openAiMessagesToInference(
          messages as OpenAiMessage[]
        );

        // Convert OpenAI tools to inference format
        const inferenceTools = openAiToolsToInference(tools as any);

        // Convert tool_choice
        const inferenceToolChoice = convertToolChoice(toolChoice);

        if (stream) {
          return handleStreamingRequest({
            client,
            connectorId: resolvedConnectorId,
            system,
            messages: inferenceMessages,
            temperature,
            tools: inferenceTools,
            toolChoice: inferenceToolChoice,
            model,
            request,
            response,
            logger,
            agentBuilder,
            originalMessages: messages as OpenAiMessage[],
          });
        }

        return handleNonStreamingRequest({
          client,
          connectorId: resolvedConnectorId,
          system,
          messages: inferenceMessages,
          temperature,
          tools: inferenceTools,
          toolChoice: inferenceToolChoice,
          model,
          request,
          response,
          logger,
          agentBuilder,
          originalMessages: messages as OpenAiMessage[],
        });
      } catch (error) {
        logger.error(`Chat completions error: ${error.message}`);
        return response.customError({
          statusCode: error.statusCode || 500,
          body: {
            message: error.message,
            attributes: {
              error: {
                message: error.message,
                type: 'api_error',
                code: error.statusCode?.toString() || '500',
              },
            },
          },
        });
      }
    }
  );
};

const resolveConnector = async (
  inference: LlmGatewayStartDependencies['inference'],
  request: any,
  connectorId: string
): Promise<string> => {
  if (connectorId && connectorId !== 'default') {
    // Try to use the model field as a connector ID
    try {
      await inference.getConnectorById(connectorId, request);
      return connectorId;
    } catch {
      // Not a valid connector ID, fall through to default
    }
  }

  // Try to get default connector
  try {
    const defaultConnector = await inference.getDefaultConnector(request);
    return defaultConnector.connectorId;
  } catch {
    // No default connector
  }

  // Fall back to first available connector
  const connectors = await inference.getConnectorList(request);
  if (connectors.length > 0) {
    return connectors[0].connectorId;
  }

  throw new Error('No AI connectors configured. Please configure at least one AI connector.');
};

const convertToolChoice = (
  toolChoice: string | { type: string; function?: { name: string } } | undefined
): any => {
  if (!toolChoice) {
    return undefined;
  }
  if (typeof toolChoice === 'string') {
    if (toolChoice === 'none' || toolChoice === 'auto' || toolChoice === 'required') {
      return toolChoice;
    }
    return undefined;
  }
  if (toolChoice.type === 'function' && toolChoice.function?.name) {
    return { function: toolChoice.function.name };
  }
  return toolChoice.type;
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
  originalMessages: OpenAiMessage[];
}) => {
  const completionId = `chatcmpl-${uuidv4()}`;
  const stream = new PassThrough();
  let hasToolCalls = false;
  let tokenCount: ChatCompletionTokenCount | undefined;
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

  // Subscribe to events and convert to OpenAI SSE format
  events$.subscribe({
    next: (event: any) => {
      if (event.type === ChatCompletionEventType.ChatCompletionChunk) {
        const chunk = event as ChatCompletionChunkEvent;
        if (chunk.content) {
          contentParts.push(chunk.content);
        }
        if (chunk.tool_calls && chunk.tool_calls.length > 0) {
          hasToolCalls = true;
          for (const tc of chunk.tool_calls) {
            if (!collectedToolCalls[tc.index]) {
              collectedToolCalls[tc.index] = {
                id: tc.toolCallId || '',
                type: 'function',
                function: { name: '', arguments: '' },
              };
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
        const openAiChunk = inferenceChunkToOpenAi(chunk, model, completionId);
        stream.write(`data: ${JSON.stringify(openAiChunk)}\n\n`);
      } else if (event.type === ChatCompletionEventType.ChatCompletionTokenCount) {
        tokenCount = event.tokens;
      }
      // ChatCompletionMessage events are ignored for streaming - we use chunks instead
    },
    error: (error: Error) => {
      routeLogger.error(`Streaming error: ${error.message}`);
      const errorChunk = {
        error: {
          message: error.message,
          type: 'api_error',
        },
      };
      stream.write(`data: ${JSON.stringify(errorChunk)}\n\n`);
      stream.write('data: [DONE]\n\n');
      stream.end();
    },
    complete: () => {
      // Send final chunk with finish_reason
      const finalChunk = createFinalChunk(model, completionId, hasToolCalls, tokenCount);
      stream.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
      stream.write('data: [DONE]\n\n');
      stream.end();

      // Fire-and-forget: record conversation
      recordConversation({
        request,
        agentBuilder,
        logger: routeLogger,
        messages: originalMessages,
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
  originalMessages: OpenAiMessage[];
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

  const openAiResponse = inferenceResponseToOpenAi(result, model);

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
  const conversationIdPromise = recordConversation({
    request,
    agentBuilder,
    logger: routeLogger,
    messages: originalMessages,
    assistantMessage,
    toolCalls: resultToolCalls,
    model,
    connectorId,
  }).catch((err) => {
    routeLogger.error(`Failed to record conversation: ${err.message}`);
    return undefined;
  });

  const conversationId = await conversationIdPromise;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (conversationId) {
    headers['x-conversation-id'] = conversationId;
  }

  return response.ok({
    headers,
    body: openAiResponse,
  });
};
