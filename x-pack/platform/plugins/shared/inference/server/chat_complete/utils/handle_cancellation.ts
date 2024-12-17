/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OperatorFunction, Observable, Subject, takeUntil } from 'rxjs';
import { createInferenceRequestAbortedError } from '@kbn/inference-common';

export function handleCancellation<T>(abortSignal: AbortSignal): OperatorFunction<T, T> {
  return (source$) => {
    const stop$ = new Subject<void>();
    if (abortSignal.aborted) {
      stop$.next();
    }
    abortSignal.addEventListener('abort', () => {
      stop$.next();
    });

    return new Observable<T>((subscriber) => {
      return source$.pipe(takeUntil(stop$)).subscribe({
        next: (value) => {
          subscriber.next(value);
        },
        error: (err) => {
          subscriber.error(err);
        },
        complete: () => {
          if (abortSignal.aborted) {
            subscriber.error(createInferenceRequestAbortedError());
          } else {
            subscriber.complete();
          }
        },
      });
    });
  };
}
