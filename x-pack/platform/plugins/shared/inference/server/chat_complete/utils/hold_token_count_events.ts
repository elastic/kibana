/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MonoTypeOperatorFunction } from 'rxjs';
import { Observable } from 'rxjs';
import type { ChatCompletionEvent, ChatCompletionTokenCountEvent } from '@kbn/inference-common';
import {
  isChatCompletionMessageEvent,
  isChatCompletionTokenCountEvent,
} from '@kbn/inference-common';
import { retryWithExponentialBackoff } from '../../../common/utils/retry_with_exponential_backoff';

/**
 * Retries the source with exponential backoff while guaranteeing that token-count
 * events always describe the attempt the downstream consumer ends up seeing:
 * token counts from an attempt whose error gets retried are discarded, while a
 * terminal failure flushes its held token counts before the error so usage the
 * provider already reported is not lost. Composing the hold and the retry here
 * keeps the hold structurally upstream of the retry and both driven by the same
 * retry predicate.
 *
 * `errorFilter` is invoked twice per error (once to predict the retry, once by
 * the retry itself) and must be side-effect free.
 *
 * Known trade-off: an abort/unsubscribe between the provider's usage report and
 * the message event drops the held token counts, since nothing can be emitted
 * once the downstream has unsubscribed.
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
  return (source$) => {
    let errorCount = 0;
    const willBeRetried = (error: Error) => {
      errorCount += 1;
      return errorCount <= maxRetry && errorFilter(error);
    };

    return source$.pipe(
      holdTokenCountEventsUntilMessage({ discardHeldOnError: willBeRetried }),
      retryWithExponentialBackoff({ maxRetry, initialDelay, backoffMultiplier, errorFilter })
    );
  };
}

/**
 * Withholds token-count events until the message event is emitted; on error,
 * `discardHeldOnError` decides whether held events are dropped (the error will
 * be retried) or flushed ahead of the error (the failure is terminal). Events
 * held when the source completes without a message event are flushed. The hold
 * is per subscription, so a retrying re-subscription starts with an empty
 * buffer and held events always belong to the current attempt.
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
