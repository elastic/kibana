/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, OperatorFunction, filter, map } from 'rxjs';
import { v4 } from 'uuid';
import {
  ChatCompletionEvent as InferenceChatCompletionEvent,
  ChatCompletionEventType as InferenceChatCompletionEventType,
} from '@kbn/inference-common';
import {
  ChatCompletionChunkEvent,
  ChatCompletionMessageEvent,
  StreamingChatResponseEventType,
} from '../../../../common';

export function convertInferenceEventsToStreamingEvents(): OperatorFunction<
  InferenceChatCompletionEvent,
  ChatCompletionChunkEvent | ChatCompletionMessageEvent
> {
  return (events$: Observable<InferenceChatCompletionEvent>) => {
    return events$.pipe(
      filter((event) => event.type !== InferenceChatCompletionEventType.ChatCompletionTokenCount),
      map((event) => {
        switch (event.type) {
          case InferenceChatCompletionEventType.ChatCompletionChunk:
            // Convert to ChatCompletionChunkEvent
            return {
              type: StreamingChatResponseEventType.ChatCompletionChunk,
              id: v4(),
              message: {
                content: event.content,
                function_call:
                  event.tool_calls.length > 0
                    ? {
                        name: event.tool_calls[0].function.name,
                        arguments: event.tool_calls[0].function.arguments,
                      }
                    : undefined,
              },
              ...(event.deanonymized_input && { deanonymized_input: event.deanonymized_input }),
              ...(event.deanonymized_output && { deanonymized_output: event.deanonymized_output }),
            } as ChatCompletionChunkEvent;
          case InferenceChatCompletionEventType.ChatCompletionMessage:
            // Convert to ChatCompletionMessageEvent
            return {
              type: StreamingChatResponseEventType.ChatCompletionMessage,
              id: v4(),
              message: {
                content: event.content,
                function_call:
                  event.toolCalls.length > 0
                    ? {
                        name: event.toolCalls[0].function.name,
                        arguments: event.toolCalls[0].function.arguments,
                      }
                    : undefined,
              },
              ...(event.deanonymized_input && { deanonymized_input: event.deanonymized_input }),
              ...(event.deanonymized_output && { deanonymized_output: event.deanonymized_output }),
            } as ChatCompletionMessageEvent;

          default:
            throw new Error(`Unknown event type`);
        }
      })
    );
  };
}
