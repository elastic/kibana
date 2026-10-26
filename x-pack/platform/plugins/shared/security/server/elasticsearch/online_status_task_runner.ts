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
  task: () => Promise<void>
): ((retryScheduler: OnlineStatusRetryScheduler) => Observable<never>) => {
  let previousRun: Promise<void> = Promise.resolve();

  return ({ scheduleRetry }) =>
    new Observable<never>((subscriber) => {
      let isReplaced = false;

      // A newer run waits for the previous one to finish instead of cancelling it. The status can
      // flap while Elasticsearch is under load, and cancelling on every flap could keep a run from
      // ever reaching its last step. Every task call is an Elasticsearch request bounded by
      // `elasticsearch.requestTimeout`, so the wait is bounded too.
      const run = previousRun.then(async () => {
        // Skip runs that a newer status replaced while they were waiting.
        if (isReplaced) {
          return;
        }

        try {
          await task();
        } catch {
          // A replaced or stopped run doesn't retry, the newer run (if any) does the work instead.
          if (!isReplaced) {
            scheduleRetry();
          }
        }
      });

      previousRun = run;
      // `run` never rejects, since the task's errors are caught above.
      void run.then(() => subscriber.complete());

      return () => {
        isReplaced = true;
      };
    });
};
