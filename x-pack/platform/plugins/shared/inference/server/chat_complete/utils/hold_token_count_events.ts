/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MonoTypeOperatorFunction } from 'rxjs';
import { Observable, defer } from 'rxjs';
import type { ChatCompletionEvent, ChatCompletionTokenCountEvent } from '@kbn/inference-common';
import {
  isChatCompletionMessageEvent,
  isChatCompletionTokenCountEvent,
} from '@kbn/inference-common';
import { retryWithExponentialBackoff } from '../../../common/utils/retry_with_exponential_backoff';

/**
 * Retries with exponential backoff, discarding token-count events from failed
 * attempts and flushing them before a terminal error.
 *
 * `errorFilter` must be side-effect free (called twice per error).
 * Token counts held when the subscriber unsubscribes before the message event are dropped.
 */
export function retryHoldingTokenCountEvents({
  maxRetry = 3,
  initialDelay,
  backoffMultiplier,
  errorFilter = () => true,
}: {
  maxRetry?: number;
  initialDelay?: number;
  backoffMultiplier?: number;
  errorFilter?: (error: Error) => boolean;
} = {}): MonoTypeOperatorFunction<ChatCompletionEvent> {
  return (source$) =>
    // retryWithExponentialBackoff contains its own implicit retry counter that resets on each subscription.
    // defer is used here to also reset our own errorCount on each subscription. This ensures that
    // holdTokenCountEventsUntilMessage and retryWithExponentialBackoff have the same retry count.
    defer(() => {
      let errorCount = 0;
      // Knowing whether an error will be retried is needed to determine whether to hold or flush token counts.
      const willBeRetried = (error: Error) => {
        errorCount += 1;
        return errorCount <= maxRetry && errorFilter(error);
      };

      return source$.pipe(
        holdTokenCountEventsUntilMessage({ discardHeldOnError: willBeRetried }),
        retryWithExponentialBackoff({ maxRetry, initialDelay, backoffMultiplier, errorFilter })
      );
    });
}

/**
 * Holds token-count events until the message event (or completion). On error,
 * drops them if `discardHeldOnError` returns true, otherwise flushes before the error.
 */
export function holdTokenCountEventsUntilMessage({
  discardHeldOnError,
}: {
  discardHeldOnError: (error: Error) => boolean;
}): MonoTypeOperatorFunction<ChatCompletionEvent> {
  return (source$) =>
    new Observable<ChatCompletionEvent>((subscriber) => {
      let held: ChatCompletionTokenCountEvent[] = [];

      const flush = () => {
        held.forEach((tokenEvent) => subscriber.next(tokenEvent));
        held = [];
      };

      return source$.subscribe({
        next: (event) => {
          if (isChatCompletionTokenCountEvent(event)) {
            held.push(event);
            return;
          }
          if (isChatCompletionMessageEvent(event)) {
            flush();
          }
          subscriber.next(event);
        },
        error: (error) => {
          if (!discardHeldOnError(error)) {
            flush();
          }
          subscriber.error(error);
        },
        complete: () => {
          flush();
          subscriber.complete();
        },
      });
    });
}
