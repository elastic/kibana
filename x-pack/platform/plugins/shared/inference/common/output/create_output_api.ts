/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ChatCompleteAPI,
  ChatCompleteCompositeResponse,
  ChatCompleteOptions,
  ChatCompletionEvent,
  OutputAPI,
  OutputCompositeResponse,
  OutputOptions,
  ToolSchema,
} from '@kbn/inference-common';
import {
  ChatCompletionEventType,
  MessageRole,
  OutputEventType,
  createForcedToolChoiceUnsupportedError,
  hasForcedToolChoice,
  isToolValidationError,
  isUnsupportedToolChoiceError,
  recordToolChoiceRejection,
  shouldForceToolChoice,
  toAutoToolChoiceRequest,
  withoutTokenCountEvents,
} from '@kbn/inference-common';
import type { Observable } from 'rxjs';
import { catchError, defer, isObservable, map, throwError } from 'rxjs';
import { ensureMultiTurn } from '../utils/ensure_multi_turn';

type DefaultOutputOptions = OutputOptions<string, ToolSchema | undefined, boolean>;

interface ToolChoiceFallbackLogger {
  warn: (message: string) => void;
}

/**
 * Calls `chatComplete`, falling back to `tool_choice: auto` when the model rejects the forced
 * `tool_choice` used for structured output. Mirrors `InferenceChatModel` (same shared helpers),
 * so both entry points share one decision (`shouldForceToolChoice`) and one rejection memo.
 */
const callWithToolChoiceFallback = (
  chatCompleteApi: ChatCompleteAPI,
  request: ChatCompleteOptions,
  logger?: ToolChoiceFallbackLogger
): ChatCompleteCompositeResponse<ChatCompleteOptions> => {
  const call = chatCompleteApi as (options: ChatCompleteOptions) => any;
  const target = { connectorId: request.connectorId, model: request.modelName };

  if (!hasForcedToolChoice(request)) {
    return call(request);
  }
  if (!shouldForceToolChoice(target)) {
    return call(toAutoToolChoiceRequest(request));
  }

  const modelLabel = request.modelName ?? request.connectorId;
  const onRejected = (error: unknown) => {
    recordToolChoiceRejection(target);
    logger?.warn(
      `Model "${modelLabel}" (connector ${
        request.connectorId
      }) rejected forced tool_choice ${JSON.stringify(
        request.toolChoice
      )}, retrying with tool_choice "auto": ${error instanceof Error ? error.message : error}`
    );
  };
  const toFinalError = (error: unknown) =>
    isUnsupportedToolChoiceError(error)
      ? createForcedToolChoiceUnsupportedError(modelLabel, error)
      : error;

  if (request.stream) {
    return defer((): Observable<ChatCompletionEvent> => {
      let hasEmitted = false;
      return call(request).pipe(
        map((event) => {
          hasEmitted = true;
          return event;
        }),
        catchError((error: unknown) => {
          // never restart a stream that already produced output
          if (hasEmitted || !isUnsupportedToolChoiceError(error)) {
            return throwError(() => error);
          }
          onRejected(error);
          return call(toAutoToolChoiceRequest(request)).pipe(
            catchError((retryError: unknown) => throwError(() => toFinalError(retryError)))
          );
        })
      );
    });
  }

  return call(request).catch((error: unknown) => {
    if (!isUnsupportedToolChoiceError(error)) {
      throw error;
    }
    onRejected(error);
    return call(toAutoToolChoiceRequest(request)).catch((retryError: unknown) => {
      throw toFinalError(retryError);
    });
  });
};

export function createOutputApi(
  chatCompleteApi: ChatCompleteAPI,
  logger?: ToolChoiceFallbackLogger
): OutputAPI;

export function createOutputApi(
  chatCompleteApi: ChatCompleteAPI,
  logger?: ToolChoiceFallbackLogger
) {
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
    maxRetries,
    retryConfiguration,
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

    const response = callWithToolChoiceFallback(
      chatCompleteApi,
      {
        connectorId,
        stream,
        modelName,
        functionCalling,
        abortSignal,
        maxRetries,
        retryConfiguration,
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
      },
      logger
    );

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
              event?.toolCalls?.length && 'arguments' in event?.toolCalls[0]?.function
                ? event.toolCalls[0]?.function?.arguments
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
              chatResponse?.toolCalls?.length && 'arguments' in chatResponse?.toolCalls[0]?.function
                ? chatResponse?.toolCalls[0]?.function?.arguments
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
                  toolCalls: error.meta.toolCalls?.map((toolCall) => {
                    return {
                      ...toolCall,
                      function: {
                        ...toolCall.function,
                        arguments: JSON.parse(toolCall.function.arguments),
                      },
                    };
                  }),
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
