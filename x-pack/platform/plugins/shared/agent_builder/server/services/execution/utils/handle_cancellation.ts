/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OperatorFunction } from 'rxjs';
import { Observable } from 'rxjs';
import { createRequestAbortedError, isExecutionAbortReason } from '@kbn/agent-builder-common';
import { CANCELLATION_DEADLINE_MS } from '../constants';

/**
 * Graceful cancellation with abort normalisation.
 *
 * Before the signal fires, the source is mirrored and its errors flow through unchanged. Once it
 * fires the source keeps being forwarded so the agent can wind down (and emit `round_interrupted`);
 * the stream then errors with `RequestAbortedError` when the source terminates — any source error
 * or completion after an abort is normalised to it — or when `deadlineMs` elapses, whichever comes
 * first. This is the single point where "an abort was observed" becomes the canonical error;
 * nothing downstream needs to look at the signal.
 */
export function handleCancellation<T>(
  abortSignal?: AbortSignal,
  { deadlineMs = CANCELLATION_DEADLINE_MS }: { deadlineMs?: number } = {}
): OperatorFunction<T, T> {
  return (source$) => {
    if (!abortSignal) {
      return source$;
    }

    return new Observable<T>((subscriber) => {
      let deadline: ReturnType<typeof setTimeout> | undefined;
      // `signal.reason` carries the recorded abort reason (see AbortMonitor); it rides on the
      // error meta so every reader of the error — stream, execution document, follower, callback,
      // conversation — sees where the abort came from.
      const abortedError = () =>
        createRequestAbortedError(
          'Converse request was aborted',
          isExecutionAbortReason(abortSignal.reason)
            ? { abort_reason: abortSignal.reason }
            : undefined
        );
      const clearDeadline = () => {
        if (deadline !== undefined) {
          clearTimeout(deadline);
          deadline = undefined;
        }
      };

      const subscription = source$.subscribe({
        next: (value) => {
          subscriber.next(value);
        },
        error: (err) => {
          clearDeadline();
          subscriber.error(abortSignal.aborted ? abortedError() : err);
        },
        complete: () => {
          clearDeadline();
          if (abortSignal.aborted) {
            subscriber.error(abortedError());
          } else {
            subscriber.complete();
          }
        },
      });

      const onAbort = () => {
        if (subscription.closed) {
          return;
        }
        deadline = setTimeout(() => {
          subscription.unsubscribe();
          subscriber.error(abortedError());
        }, deadlineMs);
      };

      if (abortSignal.aborted) {
        onAbort();
      } else {
        abortSignal.addEventListener('abort', onAbort, { once: true });
      }

      return () => {
        clearDeadline();
        abortSignal.removeEventListener('abort', onAbort);
        subscription.unsubscribe();
      };
    });
  };
}
