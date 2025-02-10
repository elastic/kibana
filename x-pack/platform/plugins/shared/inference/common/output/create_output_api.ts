/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ChatCompleteAPI,
  ChatCompletionEventType,
  MessageRole,
  OutputAPI,
  OutputCompositeResponse,
  OutputEventType,
  OutputOptions,
  ToolSchema,
  isToolValidationError,
  withoutTokenCountEvents,
} from '@kbn/inference-common';
import { isObservable, map } from 'rxjs';
import { ensureMultiTurn } from '../utils/ensure_multi_turn';

type DefaultOutputOptions = OutputOptions<string, ToolSchema | undefined, boolean>;

export function createOutputApi(chatCompleteApi: ChatCompleteAPI): OutputAPI;

export function createOutputApi(chatCompleteApi: ChatCompleteAPI) {
  return function callOutputApi({
    id,
    connectorId,
    input,
    schema,
    system,
    previousMessages,
    modelName,
    functionCalling,
    stream,
    abortSignal,
    metadata,
    retry,
  }: DefaultOutputOptions): OutputCompositeResponse<string, ToolSchema | undefined, boolean> {
    if (stream && retry !== undefined) {
      throw new Error(`Retry options are not supported in streaming mode`);
    }

    const messages = ensureMultiTurn([
      ...(previousMessages || []),
      {
        role: MessageRole.User,
        content: input,
      },
    ]);

    const response = chatCompleteApi({
      connectorId,
      stream,
      modelName,
      functionCalling,
      abortSignal,
      metadata,
      system,
      messages,
      ...(schema
        ? {
            tools: {
              structuredOutput: {
                description: `Use the following schema to respond to the user's request in structured data, so it can be parsed and handled.`,
                schema,
              },
            },
            toolChoice: { function: 'structuredOutput' as const },
          }
        : {}),
    });

    if (isObservable(response)) {
      return response.pipe(
        withoutTokenCountEvents(),
        map((event) => {
          if (event.type === ChatCompletionEventType.ChatCompletionChunk) {
            return {
              type: OutputEventType.OutputUpdate,
              id,
              content: event.content,
            };
          }

          return {
            id,
            output:
              event.toolCalls.length && 'arguments' in event.toolCalls[0].function
                ? event.toolCalls[0].function.arguments
                : undefined,
            content: event.content,
            type: OutputEventType.OutputComplete,
          };
        })
      );
    } else {
      return response.then(
        (chatResponse) => {
          return {
            id,
            content: chatResponse.content,
            output:
              chatResponse.toolCalls.length && 'arguments' in chatResponse.toolCalls[0].function
                ? chatResponse.toolCalls[0].function.arguments
                : undefined,
          };
        },
        (error: Error) => {
          if (isToolValidationError(error) && retry?.onValidationError) {
            const retriesLeft =
              typeof retry.onValidationError === 'number' ? retry.onValidationError : 1;

            return callOutputApi({
              id,
              connectorId,
              input,
              schema,
              system,
              abortSignal,
              previousMessages: messages.concat(
                {
                  role: MessageRole.Assistant as const,
                  content: '',
                  toolCalls: error.meta.toolCalls!,
                },
                ...(error.meta.toolCalls?.map((toolCall) => {
                  return {
                    name: toolCall.function.name,
                    role: MessageRole.Tool as const,
                    toolCallId: toolCall.toolCallId,
                    response: {
                      error: error.meta,
                    },
                  };
                }) ?? [])
              ),
              functionCalling,
              modelName,
              stream: false,
              retry: {
                onValidationError: retriesLeft - 1,
              },
            }) as OutputCompositeResponse<string, ToolSchema | undefined, false>;
          }
          throw error;
        }
      );
    }
  };
}
