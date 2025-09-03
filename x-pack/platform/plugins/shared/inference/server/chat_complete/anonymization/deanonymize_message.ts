/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Message,
  ChatCompletionEvent,
  MessageRole,
  AnonymizationOutput,
} from '@kbn/inference-common';
import {
  ChatCompletionEventType,
  ChatCompletionChunkEvent,
} from '@kbn/inference-common/src/chat_complete/events';
import { OperatorFunction, mergeMap, filter, of, identity } from 'rxjs';
import { deanonymize } from './deanonymize';

export function deanonymizeMessage<T extends ChatCompletionEvent>(
  anonymization: AnonymizationOutput
): OperatorFunction<T, T>;

export function deanonymizeMessage(
  anonymization: AnonymizationOutput
): OperatorFunction<ChatCompletionEvent, ChatCompletionEvent> {
  if (!anonymization.anonymizations.length) {
    return identity;
  }

  return (source$) => {
    return source$.pipe(
      // Filter out original chunk events (we recreate a single deanonymized chunk later)
      filter(
        (event): event is Exclude<ChatCompletionEvent, ChatCompletionChunkEvent> =>
          event.type !== ChatCompletionEventType.ChatCompletionChunk
      ),
      // Process message events and create a new chunk plus the message
      mergeMap((event) => {
        if (event.type === ChatCompletionEventType.ChatCompletionMessage) {
          // Create assistant message structure for deanonymization
          const message = {
            content: event.content,
            toolCalls: event.toolCalls,
            role: MessageRole.Assistant,
          } satisfies Message;

          const {
            message: { content: deanonymizedContent, toolCalls: deanonymizedToolCalls },
            deanonymizations,
          } = deanonymize(message, anonymization.anonymizations);

          // Create deanonymized input messages metadata
          const deanonymizedInput = anonymization.messages.map((msg) => {
            const deanonymization = deanonymize(msg, anonymization.anonymizations);
            return {
              message: deanonymization.message,
              deanonymizations: deanonymization.deanonymizations,
            };
          });

          // Create deanonymized output metadata
          const deanonymizedOutput = {
            message: {
              content: deanonymizedContent,
              toolCalls: deanonymizedToolCalls,
              role: MessageRole.Assistant,
            } as Message,
            deanonymizations,
          };

          // Create a new chunk with the complete deanonymized content
          const completeChunk: ChatCompletionChunkEvent = {
            type: ChatCompletionEventType.ChatCompletionChunk,
            content: deanonymizedContent,
            tool_calls: deanonymizedToolCalls.map((tc, idx) => ({
              index: idx,
              toolCallId: tc.toolCallId,
              function: {
                name: tc.function.name,
                arguments: JSON.stringify(tc.function.arguments) || '',
              },
            })),
            deanonymized_input: deanonymizedInput,
            deanonymized_output: deanonymizedOutput,
          };

          // Create deanonymized message event
          const deanonymizedMsg = {
            ...event,
            content: deanonymizedContent,
            toolCalls: deanonymizedToolCalls,
            deanonymized_input: deanonymizedInput,
            deanonymized_output: deanonymizedOutput,
          };

          // Emit new chunk first, then message
          return of(completeChunk, deanonymizedMsg);
        }

        // Pass through other events unchanged
        return of(event);
      })
    );
  };
}
