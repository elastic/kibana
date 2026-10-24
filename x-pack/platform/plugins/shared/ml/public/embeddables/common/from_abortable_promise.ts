/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';

/**
 * Wraps an `AbortSignal`-aware async task in an Observable. Unsubscribing (e.g. when `switchMap`
 * moves on to a newer fetch, or the embeddable is destroyed) aborts the signal passed to the task
 * so in-flight HTTP requests are cancelled.
 *
 * When `parentSignal` (e.g. the embeddable's `RequestCancellationManager` signal) is already
 * aborted the task is never started; if it aborts mid-flight the request is cancelled. In both
 * cases the observable completes without emitting.
 */
export function fromAbortablePromise<T>(
  task: (signal: AbortSignal) => Promise<T>,
  parentSignal?: AbortSignal
): Observable<T> {
  return new Observable<T>((subscriber) => {
    if (parentSignal?.aborted) {
      subscriber.complete();
      return;
    }

    const controller = new AbortController();
    const onParentAbort = () => {
      controller.abort(parentSignal?.reason);
      subscriber.complete();
    };
    parentSignal?.addEventListener('abort', onParentAbort, { once: true });

    task(controller.signal)
      .then((result) => {
        subscriber.next(result);
        subscriber.complete();
      })
      .catch((error) => {
        // An aborted request means the subscriber is already gone, nothing to report.
        if (!controller.signal.aborted) {
          subscriber.error(error);
        }
      });

    return () => {
      parentSignal?.removeEventListener('abort', onParentAbort);
      controller.abort();
    };
  });
}
