/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OperatorFunction } from 'rxjs';
import { Observable } from 'rxjs';
import type { ChatCompletionEvent } from '@kbn/inference-common';
import {
  isChatCompletionMessageEvent,
  isChatCompletionTokenCountEvent,
} from '@kbn/inference-common';

/**
 * Withholds token-count events until the message event is emitted, so that when
 * applied upstream of a retry, an attempt failing after usage was reported (e.g.
 * on tool validation) discards its token counts instead of leaking them to the
 * next attempt's output. Events held when the source completes without a message
 * event are flushed.
 */
export function holdTokenCountEventsUntilMessage<T extends ChatCompletionEvent>(): OperatorFunction<
  T,
  T
> {
  return (source$) =>
    new Observable<T>((subscriber) => {
      let held: T[] = [];

      return source$.subscribe({
        next: (event) => {
          if (isChatCompletionTokenCountEvent(event)) {
            held.push(event);
            return;
          }
          if (isChatCompletionMessageEvent(event)) {
            held.forEach((tokenEvent) => subscriber.next(tokenEvent));
            held = [];
          }
          subscriber.next(event);
        },
        error: (error) => {
          subscriber.error(error);
        },
        complete: () => {
          held.forEach((tokenEvent) => subscriber.next(tokenEvent));
          subscriber.complete();
        },
      });
    });
}
