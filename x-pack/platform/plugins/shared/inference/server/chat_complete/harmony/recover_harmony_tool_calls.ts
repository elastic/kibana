/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import type { OperatorFunction } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type {
  ChatCompletionChunkEvent,
  ChatCompletionTokenCountEvent,
} from '@kbn/inference-common';
import { ChatCompletionEventType } from '@kbn/inference-common';
import {
  findHarmonyToolCall,
  findUnrecoveredHarmonyCallNames,
  HARMONY_TOOL_CALL_HOLD,
  MAX_HARMONY_TOOL_CALL_LENGTH,
} from './parse_harmony_tool_call';

type ChatCompletionEvent = ChatCompletionChunkEvent | ChatCompletionTokenCountEvent;

/**
 * Turn harmony tool calls that the serving layer returned as plain content back
 * into `tool_calls`, so the call is executed instead of being rendered as the
 * assistant's answer.
 *
 * Only `content` is rewritten. Everything else a chunk carries — native
 * `tool_calls`, `refusal`, `reasoning` — is forwarded as it arrived, because none
 * of it can be reconstructed from the text; this operator sits on the native
 * tool-calling path, where a dropped `tool_calls` chunk silently loses the call.
 * Content is buffered up to `HARMONY_TOOL_CALL_HOLD` characters so a marker split
 * across chunks is still recognized; everything before the holdback streams
 * through unchanged. Reasoning is never held back and never parsed: the harmony
 * `analysis` channel is the model's own text, not a call.
 */
export const recoverHarmonyToolCalls = ({
  logger,
  declaredToolNames,
}: {
  logger: Logger;
  /** Only these names are recovered; a recipient outside the set stays content. */
  declaredToolNames?: readonly string[];
}): OperatorFunction<ChatCompletionEvent, ChatCompletionEvent> => {
  return (source: Observable<ChatCompletionEvent>) =>
    new Observable<ChatCompletionEvent>((subscriber) => {
      let buffer = '';
      // Recovered calls are appended to whatever the model already streamed, so
      // their index must not collide with a native call's (mergeChunks resolves
      // continuation chunks through the index).
      let nextIndex = 0;

      const emitContent = (content: string) => {
        if (!content) {
          return;
        }
        // Fail loudly: a harmony call left in the content is a call that will not
        // execute. Recovering silently is what made the leak on the weekly
        // gpt-oss-120b evals invisible in the first place, so name the
        // recipients that stayed text.
        const unrecovered = findUnrecoveredHarmonyCallNames(content);
        if (unrecovered.length > 0) {
          logger.warn(
            `Harmony tool call(s) for ${unrecovered.join(
              ', '
            )} left in the assistant content and will not execute`
          );
        }
        subscriber.next({
          type: ChatCompletionEventType.ChatCompletionChunk,
          content,
          tool_calls: [],
        });
      };

      source.subscribe({
        next: (event) => {
          if (event.type === ChatCompletionEventType.ChatCompletionTokenCount) {
            subscriber.next(event);
            return;
          }

          if (event.tool_calls.length > 0) {
            nextIndex = Math.max(nextIndex, ...event.tool_calls.map((call) => call.index + 1));
          }

          // The fields this operator cannot rebuild from `content` are forwarded
          // untouched, once, on an event of their own; only the text below is
          // rewritten.
          if (event.tool_calls.length > 0 || event.refusal || event.reasoning) {
            subscriber.next({ ...event, content: '' });
          }

          buffer += event.content ?? '';

          let scan = findHarmonyToolCall(buffer, 0, { declaredToolNames });
          while (scan.type === 'call') {
            const { call } = scan;
            logger.debug(() => `Recovered harmony tool call "${call.name}" returned as text`);
            emitContent(buffer.slice(0, call.start));
            const index = nextIndex++;
            subscriber.next({
              type: ChatCompletionEventType.ChatCompletionChunk,
              content: '',
              tool_calls: [
                {
                  index,
                  toolCallId: `${call.name}-${index}`,
                  function: { name: call.name, arguments: call.arguments },
                },
              ],
            });
            buffer = buffer.slice(call.end);
            scan = findHarmonyToolCall(buffer, 0, { declaredToolNames });
          }

          if (scan.type === 'pending') {
            // A call that never completes must not hold the stream open forever.
            if (buffer.length > MAX_HARMONY_TOOL_CALL_LENGTH) {
              logger.warn(`Discarding ${buffer.length} characters of incomplete harmony tool call`);
              emitContent(buffer);
              buffer = '';
            }
            return;
          }

          if (buffer.length > HARMONY_TOOL_CALL_HOLD) {
            emitContent(buffer.slice(0, buffer.length - HARMONY_TOOL_CALL_HOLD));
            buffer = buffer.slice(-HARMONY_TOOL_CALL_HOLD);
          }
        },
        complete: () => {
          emitContent(buffer);
          buffer = '';
          subscriber.complete();
        },
        error: (error) => {
          subscriber.error(error);
        },
      });
    });
};
