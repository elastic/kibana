/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Message, ChatCompletionEvent, AnonymizationOutput } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import type { ChatCompletionChunkEvent } from '@kbn/inference-common/src/chat_complete/events';
import { ChatCompletionEventType } from '@kbn/inference-common/src/chat_complete/events';
import type { OperatorFunction } from 'rxjs';
import { mergeMap, filter, of, identity } from 'rxjs';
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
      filter(
        (event): event is Exclude<ChatCompletionEvent, ChatCompletionChunkEvent> =>
          event.type !== ChatCompletionEventType.ChatCompletionChunk
      ),
      mergeMap((event) => {
        if (event.type === ChatCompletionEventType.ChatCompletionMessage) {
          const message = {
            content: event.content,
            toolCalls: event.toolCalls,
            role: MessageRole.Assistant,
          } satisfies Message;

          const {
            message: { content: deanonymizedContent, toolCalls: deanonymizedToolCalls },
            deanonymizations,
          } = deanonymize(message, anonymization.anonymizations);

          const deanonymizedInput = anonymization.messages.map((msg) => {
            const deanonymization = deanonymize(msg, anonymization.anonymizations);
            return {
              message: deanonymization.message,
              deanonymizations: deanonymization.deanonymizations,
            };
          });

          const deanonymizedOutput = {
            message: {
              content: deanonymizedContent,
              toolCalls: deanonymizedToolCalls,
              role: MessageRole.Assistant,
            } as Message,
            deanonymizations,
          };

          const completeChunk: ChatCompletionChunkEvent = {
            type: ChatCompletionEventType.ChatCompletionChunk,
            content: deanonymizedContent,
            tool_calls: (deanonymizedToolCalls ?? []).map((tc, idx) => {
              let args = '';
              try {
                args = JSON.stringify(tc.function.arguments) || '';
              } catch {
                args = String(tc.function.arguments ?? '');
              }
              return {
                index: idx,
                toolCallId: tc.toolCallId,
                function: {
                  name: tc.function.name,
                  arguments: args,
                },
              };
            }),
            deanonymized_input: deanonymizedInput,
            deanonymized_output: deanonymizedOutput,
          };

          const deanonymizedMsg = {
            ...event,
            content: deanonymizedContent,
            toolCalls: deanonymizedToolCalls,
            deanonymized_input: deanonymizedInput,
            deanonymized_output: deanonymizedOutput,
          };

          return of(completeChunk, deanonymizedMsg);
        }

        return of(event);
      })
    );
  };
}
