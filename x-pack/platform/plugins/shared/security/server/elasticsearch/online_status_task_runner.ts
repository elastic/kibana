/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';

import type { OnlineStatusRetryScheduler } from './elasticsearch_service';

/**
 * Wraps a task for `switchMap` over `watchOnlineStatus$`, so a newer run replaces an older one and the two never overlap.
 */
export const createOnlineStatusTaskRunner = (
  task: (signal: AbortSignal) => Promise<void>
): ((retryScheduler: OnlineStatusRetryScheduler) => Observable<never>) => {
  let previousRun: Promise<void> = Promise.resolve();

  return ({ scheduleRetry }) =>
    new Observable<never>((subscriber) => {
      const abortController = new AbortController();
      const { signal } = abortController;

      // `switchMap` aborts this run when a newer status arrives, and the task stops at its next
      // checkpoint. We still wait for the previous run to settle before starting, because
      // Elasticsearch finishes a request that's already in flight even if we stop waiting on it.
      const run = previousRun.then(async () => {
        if (signal.aborted) {
          return;
        }

        try {
          await task(signal);
        } catch {
          // Only a run that's still current retries. A cancelled run was replaced or stopped.
          if (!signal.aborted) {
            scheduleRetry();
          }
        }
      });

      previousRun = run;
      // `run` never rejects, since the task's errors are caught above.
      void run.then(() => subscriber.complete());

      return () => abortController.abort();
    });
};
