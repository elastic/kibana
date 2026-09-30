/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Message, ChatCompletionEvent, AnonymizationOutput } from '@kbn/inference-common';
import type { Logger } from '@kbn/logging';
import { MessageRole } from '@kbn/inference-common';
import type { ChatCompletionChunkEvent } from '@kbn/inference-common/src/chat_complete/events';
import { ChatCompletionEventType } from '@kbn/inference-common/src/chat_complete/events';
import type { OperatorFunction } from 'rxjs';
import { mergeMap, of, identity, map, EMPTY } from 'rxjs';
import { deanonymize } from './deanonymize';
import { DeanonymizeStreamBuffer } from './deanonymize_stream_buffer';

export function deanonymizeMessage<T extends ChatCompletionEvent>(
  anonymization: AnonymizationOutput,
  logger?: Pick<Logger, 'warn'>
): OperatorFunction<T, T>;

export function deanonymizeMessage(
  anonymization: AnonymizationOutput,
  logger?: Pick<Logger, 'warn'>
): OperatorFunction<ChatCompletionEvent, ChatCompletionEvent> {
  if (!anonymization.anonymizations.length) {
    if (!anonymization.replacementsId) {
      return identity;
    }

    return (source$) =>
      source$.pipe(
        map((event) => {
          if (
            event.type !== ChatCompletionEventType.ChatCompletionChunk &&
            event.type !== ChatCompletionEventType.ChatCompletionMessage
          ) {
            return event;
          }

          return {
            ...event,
            metadata: {
              ...event.metadata,
              anonymization: {
                ...event.metadata?.anonymization,
                replacementsId: anonymization.replacementsId,
              },
            },
          };
        })
      );
  }

  const metadata = anonymization.replacementsId
    ? {
        anonymization: {
          replacementsId: anonymization.replacementsId,
        },
      }
    : undefined;

  return (source$) => {
    // Holds back only the trailing text that could still be part of an incomplete
    // mask, so restored PII can be streamed to the client chunk-by-chunk instead
    // of only once the full message is known. See deanonymize_stream_buffer.ts.
    const buffer = new DeanonymizeStreamBuffer(anonymization.anonymizations);

    return source$.pipe(
      mergeMap((event) => {
        if (event.type === ChatCompletionEventType.ChatCompletionChunk) {
          const delta = buffer.push(event.content ?? '');

          if (!delta) {
            // Nothing safe to emit yet; the content is held pending more chunks.
            return EMPTY;
          }

          // Only `content` is streamed. Tool calls and refusals cannot be deanonymized
          // incrementally (arguments are JSON and a mask can sit mid-string), and consumers
          // concatenate `tool_calls` across chunks, so forwarding the model's raw (masked)
          // fragments would be appended to the complete, deanonymized tool calls carried by
          // the catch-up chunk below. Drop them here and emit them once, deanonymized.
          return of({
            type: ChatCompletionEventType.ChatCompletionChunk,
            content: delta,
            tool_calls: [],
            metadata,
          } satisfies ChatCompletionChunkEvent);
        }

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

          // Catch up on whatever hasn't been streamed as incremental chunks yet (the held
          // tail). This assumes the streamed text is a prefix of the authoritative full-text
          // result; if the two passes ever disagree, the final message event below is still
          // correct, but chunk-concatenating clients would see the mismatch, so surface it.
          const { content: catchUpContent, diverged } = buffer.catchUp(deanonymizedContent ?? '');
          if (diverged) {
            logger?.warn(
              'Streamed deanonymized content diverged from the final deanonymized message; chunk consumers may see inconsistent text'
            );
          }

          // Create a new chunk with the remaining deanonymized content. Downstream
          // consumers (e.g. observability_ai_assistant's emitWithConcatenatedMessage)
          // read deanonymized_input/deanonymized_output off this last chunk event,
          // so it must always be emitted even when there is no text left to catch up on.
          const completeChunk: ChatCompletionChunkEvent = {
            type: ChatCompletionEventType.ChatCompletionChunk,
            content: catchUpContent,
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
            metadata,
          };

          // Create deanonymized message event
          const deanonymizedMsg = {
            ...event,
            content: deanonymizedContent,
            toolCalls: deanonymizedToolCalls,
            deanonymized_input: deanonymizedInput,
            deanonymized_output: deanonymizedOutput,
            metadata,
          };

          // Emit the catch-up chunk first, then the message
          return of(completeChunk, deanonymizedMsg);
        }

        // Pass through other events unchanged
        return of(event);
      })
    );
  };
}
