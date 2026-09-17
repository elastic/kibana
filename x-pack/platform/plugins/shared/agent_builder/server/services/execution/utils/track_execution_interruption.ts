/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MonoTypeOperatorFunction } from 'rxjs';
import { Observable } from 'rxjs';
import type {
  ChatEvent,
  RoundCompleteEventData,
  RoundInterruptedEventData,
  TimelineEvent,
} from '@kbn/agent-builder-common';
import {
  isExecutionTerminatedEvent,
  isRequestAbortedError,
  isRoundCompleteEvent,
  isRoundInterruptedEvent,
} from '@kbn/agent-builder-common';

export type PersistInterruptionFn = (args: {
  error: unknown;
  interrupted?: RoundInterruptedEventData;
  completed?: RoundCompleteEventData;
}) => Promise<TimelineEvent[]>;

/**
 * Sits after `handleCancellation` on the conversation pipeline. Remembers what the stream said
 * about the run and, when it errors, decides whether an interruption terminal must be persisted,
 * emits the written terminal event(s) to the subscriber, then re-throws the original error.
 *
 * Terminal ownership:
 * - `round_complete` not seen → persist the interruption (with the handler's `round_interrupted`
 *   payload when it arrived; a minimal projection otherwise).
 * - the persisted `execution_terminated` was seen → the success write landed and owns the
 *   terminal; nothing to do.
 * - `round_complete` seen and the error is an abort → the run completed; the in-flight success
 *   write owns the terminal; nothing to do.
 * - `round_complete` seen and any other error → the success write failed; persist
 *   `execution_failed` from the `round_complete` payload.
 */
export const trackExecutionInterruption = ({
  persist,
}: {
  persist: PersistInterruptionFn;
}): MonoTypeOperatorFunction<ChatEvent> => {
  return (source$) =>
    new Observable<ChatEvent>((subscriber) => {
      let interrupted: RoundInterruptedEventData | undefined;
      let completed: RoundCompleteEventData | undefined;
      let terminatedPersisted = false;

      const decide = (error: unknown): Promise<TimelineEvent[]> => {
        if (!completed) {
          return persist({ error, interrupted });
        }
        if (terminatedPersisted || isRequestAbortedError(error)) {
          return Promise.resolve([]);
        }
        return persist({ error, completed });
      };

      const subscription = source$.subscribe({
        next: (event) => {
          if (isRoundInterruptedEvent(event)) {
            interrupted = event.data;
          } else if (isRoundCompleteEvent(event)) {
            completed = event.data;
          } else if (isExecutionTerminatedEvent(event)) {
            terminatedPersisted = true;
          }
          subscriber.next(event);
        },
        error: (error) => {
          decide(error).then(
            (terminals) => {
              for (const terminal of terminals) {
                subscriber.next(terminal as ChatEvent);
              }
              subscriber.error(error);
            },
            () => {
              subscriber.error(error);
            }
          );
        },
        complete: () => {
          subscriber.complete();
        },
      });

      return () => {
        subscription.unsubscribe();
      };
    });
};
