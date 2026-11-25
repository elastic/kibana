/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, type MonoTypeOperatorFunction } from 'rxjs';
import type { ChatCompletionChunkEvent, ChatCompletionEvent } from '@kbn/inference-common';
import { isChatCompletionChunkEvent, isChatCompletionTokenCountEvent } from '@kbn/inference-common';

/**
 * Keeps a retried attempt's partial tool calls away from streaming consumers.
 *
 * `retryWithExponentialBackoff` re-subscribes the source after a retryable
 * error, so without a guard a stalled attempt that already streamed tool-call
 * chunks and its retry appear as one uninterrupted response. Tool-call chunks
 * keep their original indexes, so the retry's arguments could be merged into
 * the stalled attempt's unfinished JSON.
 *
 * Chunks that carry no tool calls (text, reasoning, refusal) stream through
 * immediately, so incremental streaming keeps working for every caller.
 * Buffering starts at the first chunk of an attempt that carries a tool call;
 * from then on every chunk of that attempt is held, preserving event order,
 * until the attempt has proven successful (first message event, or stream
 * completion). On error, the held chunks are dropped when
 * `discardHeldChunksOnError` says the error will be retried and flushed before
 * the error when it is terminal, exactly like `holdTokenCountEventsUntilMessage`
 * treats token counts. The error itself is always forwarded unchanged so
 * downstream retry logic keeps working.
 *
 * `discardHeldChunksOnError` is called once per error and typically closes
 * over an attempt counter (see `retryHoldingTokenCountEvents`); keep it free of
 * other side effects.
 *
 * Token-count events pass through unbuffered; `retryHoldingTokenCountEvents`
 * further downstream already holds/discards them per retry outcome.
 */
export function skipStreamedOutputFromRetryableAttempts({
  discardHeldChunksOnError,
}: {
  discardHeldChunksOnError: (error: Error) => boolean;
}): MonoTypeOperatorFunction<ChatCompletionEvent> {
  return (source$) =>
    new Observable<ChatCompletionEvent>((subscriber) => {
      let published = false;
      let holding = false;
      const chunks: ChatCompletionChunkEvent[] = [];

      const publish = () => {
        if (published) {
          return;
        }
        published = true;
        chunks.forEach((chunk) => subscriber.next(chunk));
        chunks.length = 0;
      };

      return source$.subscribe({
        next: (event) => {
          if (published) {
            subscriber.next(event);
            return;
          }
          if (isChatCompletionChunkEvent(event)) {
            holding = holding || event.tool_calls.length > 0;
            if (holding) {
              chunks.push(event);
            } else {
              subscriber.next(event);
            }
            return;
          }
          if (isChatCompletionTokenCountEvent(event)) {
            subscriber.next(event);
            return;
          }
          // terminal message event: this attempt's output is valid, publish it
          publish();
          subscriber.next(event);
        },
        error: (error) => {
          // held tool-call output of an attempt that will be retried is never
          // exposed; a terminal error flushes it so callers that relied on
          // partial output before the error keep getting it. The error itself
          // must reach downstream retry logic untouched either way.
          if (!discardHeldChunksOnError(error)) {
            publish();
          }
          published = true;
          subscriber.error(error);
        },
        complete: () => {
          // a stream that completes without a message event carries no
          // discard-worthy partial output; flush and complete
          publish();
          subscriber.complete();
        },
      });
    });
}
