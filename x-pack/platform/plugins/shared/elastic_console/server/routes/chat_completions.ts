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
import type { ElasticConsolePluginStart, ElasticConsoleStartDependencies } from '../types';
import {
  type OpenAiMessage,
  openAiMessagesToInference,
  openAiToolsToInference,
  inferenceChunkToOpenAi,
  createFinalChunk,
  inferenceResponseToOpenAi,
  createErrorResponse,
} from '../lib/openai_format';
import { resolveConnector } from '../lib/resolve_connector';
import { isElasticConsoleEnabled } from './is_enabled';

const SOCKET_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export const registerChatCompletionsRoute = ({
  router,
  coreSetup,
  logger,
}: {
  router: IRouter;
  coreSetup: CoreSetup<ElasticConsoleStartDependencies, ElasticConsolePluginStart>;
  logger: Logger;
}) => {
  router.post(
    {
      path: '/internal/elastic_console/v1/chat/completions',
      security: {
        authz: { enabled: false, reason: 'This route delegates to the inference plugin' },
      },
      options: {
        access: 'internal',
        timeout: {
          idleSocket: SOCKET_TIMEOUT_MS,
        },
      },
      validate: {
        body: schema.object(
          {
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
            stream_options: schema.maybe(
              schema.object({
                include_usage: schema.maybe(schema.boolean()),
              })
            ),
          },
          { unknowns: 'allow' }
        ),
      },
    },
    async (ctx, request, response) => {
      try {
        const [coreStart, { inference }] = await coreSetup.getStartServices();

        if (!(await isElasticConsoleEnabled(coreStart, request))) {
          return response.notFound();
        }

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

        const resolvedConnectorId = await resolveConnector(inference, request, connectorId);

        // Convert OpenAI messages to inference format
        const { system, messages: inferenceMessages } = openAiMessagesToInference(
          messages as OpenAiMessage[]
        );

        const inferenceTools = openAiToolsToInference(tools as any);
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
        });
      } catch (error) {
        logger.error(`Chat completions error: ${error.message}`);
        // Return an OpenAI-compatible error response so AI SDKs can parse it
        const errorBody = createErrorResponse(error.message, request.body.model || 'default');
        return response.ok({
          headers: { 'Content-Type': 'application/json' },
          body: errorBody,
        });
      }
    }
  );
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
}) => {
  const completionId = `chatcmpl-${uuidv4()}`;
  const passThrough = new PassThrough();
  let hasToolCalls = false;
  let tokenCount: ChatCompletionTokenCount | undefined;

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

  events$.subscribe({
    next: (event: any) => {
      if (event.type === ChatCompletionEventType.ChatCompletionChunk) {
        const chunk = event as ChatCompletionChunkEvent;
        if (chunk.tool_calls && chunk.tool_calls.length > 0) {
          hasToolCalls = true;
        }
        const openAiChunk = inferenceChunkToOpenAi(chunk, model, completionId);
        passThrough.write(`data: ${JSON.stringify(openAiChunk)}\n\n`);
      } else if (event.type === ChatCompletionEventType.ChatCompletionTokenCount) {
        tokenCount = event.tokens;
      }
    },
    error: (error: Error) => {
      routeLogger.error(`Streaming error: ${error.message}`);
      // Emit a valid OpenAI delta chunk with error content so AI SDKs can parse it
      const errorContentChunk = {
        id: completionId,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [
          {
            index: 0,
            delta: { content: `Error: ${error.message}` },
            finish_reason: null,
          },
        ],
      };
      passThrough.write(`data: ${JSON.stringify(errorContentChunk)}\n\n`);
      const finalChunk = createFinalChunk(model, completionId, false, undefined);
      passThrough.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
      passThrough.write('data: [DONE]\n\n');
      passThrough.end();
    },
    complete: () => {
      const finalChunk = createFinalChunk(model, completionId, hasToolCalls, tokenCount);
      passThrough.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
      passThrough.write('data: [DONE]\n\n');
      passThrough.end();
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
    body: passThrough,
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
}) => {
  try {
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

    return response.ok({
      headers: {
        'Content-Type': 'application/json',
      },
      body: openAiResponse,
    });
  } catch (error) {
    routeLogger.error(`Non-streaming completion error: ${error.message}`);
    return response.ok({
      headers: { 'Content-Type': 'application/json' },
      body: createErrorResponse(error.message, model),
    });
  }
};
