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
  HARMONY_TOOL_CALL_HOLD,
  MAX_HARMONY_TOOL_CALL_LENGTH,
} from './parse_harmony_tool_call';

type ChatCompletionEvent = ChatCompletionChunkEvent | ChatCompletionTokenCountEvent;

/**
 * Turn harmony tool calls that the serving layer returned as plain content back
 * into `tool_calls`, so the call is executed instead of being rendered as the
 * assistant's answer.
 *
 * Content is buffered up to `HARMONY_TOOL_CALL_HOLD` characters so a marker split
 * across chunks is still recognized; everything before the holdback streams
 * through unchanged. Reasoning is never held back and never parsed: the harmony
 * `analysis` channel is the model's own text, not a call.
 */
export const recoverHarmonyToolCalls = ({
  logger,
}: {
  logger: Logger;
}): OperatorFunction<ChatCompletionEvent, ChatCompletionEvent> => {
  return (source: Observable<ChatCompletionEvent>) =>
    new Observable<ChatCompletionEvent>((subscriber) => {
      let buffer = '';

      const emitContent = (content: string) => {
        if (!content) {
          return;
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

          if (event.reasoning) {
            subscriber.next({ ...event, content: '', tool_calls: [] });
          }

          buffer += event.content ?? '';

          let scan = findHarmonyToolCall(buffer);
          while (scan.type === 'call') {
            const { call } = scan;
            logger.debug(() => `Recovered harmony tool call "${call.name}" returned as text`);
            emitContent(buffer.slice(0, call.start));
            subscriber.next({
              type: ChatCompletionEventType.ChatCompletionChunk,
              content: '',
              tool_calls: [
                {
                  index: 0,
                  toolCallId: call.name,
                  function: { name: call.name, arguments: call.arguments },
                },
              ],
            });
            buffer = buffer.slice(call.end);
            scan = findHarmonyToolCall(buffer);
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
