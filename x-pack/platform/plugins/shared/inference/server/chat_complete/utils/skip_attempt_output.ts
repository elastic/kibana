/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, type MonoTypeOperatorFunction } from 'rxjs';
import type {
  ChatCompletionChunkEvent,
  ChatCompletionTokenCountEvent,
} from '@kbn/inference-common';
import { isChatCompletionChunkEvent, isChatCompletionTokenCountEvent } from '@kbn/inference-common';

/**
 * Gives streaming consumers an attempt boundary when retrying.
 *
 * `retryWithExponentialBackoff` re-subscribes the source after a retryable
 * error, so without a guard a stalled attempt that already streamed chunks and
 * its retry appear as one uninterrupted response. Tool-call chunks keep their
 * original indexes, so the retry's arguments could be merged into the stalled
 * attempt's unfinished JSON.
 *
 * Chunk events are buffered per attempt and only published once the attempt
 * has proven successful (first message event, or stream completion). On error
 * the buffered chunks are dropped — partial output of a failed attempt is
 * never a valid prefix of the response — and the error itself is forwarded
 * unchanged so downstream retry logic keeps working.
 *
 * Token-count events pass through unbuffered; `retryHoldingTokenCountEvents`
 * further downstream already holds/discards them per retry outcome.
 */
export function skipStreamedOutputFromRetryableAttempts(): MonoTypeOperatorFunction<
  ChatCompletionChunkEvent | ChatCompletionTokenCountEvent
> {
  return (source$) =>
    new Observable<ChatCompletionChunkEvent | ChatCompletionTokenCountEvent>((subscriber) => {
      let published = false;
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
            chunks.push(event);
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
          // partial output of a failed attempt is never exposed, but the error
          // itself must reach downstream retry logic untouched
          chunks.length = 0;
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
