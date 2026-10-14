/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import type { Logger } from '@kbn/core/server';

const CLAIM_NUDGE_THROTTLE_INTERVAL_MS = 500;

interface Options {
  claimNudge$: Observable<void>;
  claimCycleStart$: Observable<void>;
  backpressure$: Observable<boolean>;
  logger: Logger;
}

/** Throttles nudges with leading and trailing delivery; a starting claim cycle cancels the trailing one. */
export const createThrottledClaimNudge = ({
  claimNudge$,
  claimCycleStart$,
  backpressure$,
  logger,
}: Options): Observable<void> =>
  new Observable((subscriber) => {
    let throttleTimer: NodeJS.Timeout | undefined;
    let trailingNudgePending = false;
    let backpressureActive = false;

    const emitNudge = () => {
      // Set before `next` so nudges arriving re-entrantly are throttled.
      throttleTimer = setTimeout(() => {
        throttleTimer = undefined;
        if (trailingNudgePending) {
          trailingNudgePending = false;
          emitNudge();
        }
      }, CLAIM_NUDGE_THROTTLE_INTERVAL_MS);
      subscriber.next();
    };

    subscriber.add(() => clearTimeout(throttleTimer));
    subscriber.add(
      claimCycleStart$.subscribe(() => {
        // The cycle covers pending signals; the throttle window stays open.
        trailingNudgePending = false;
      })
    );
    subscriber.add(
      backpressure$.subscribe({
        next: (active) => {
          backpressureActive = active;
          if (active) {
            trailingNudgePending = false;
          }
        },
        error: (error) => subscriber.error(error),
      })
    );
    subscriber.add(
      claimNudge$.subscribe({
        next: () => {
          if (backpressureActive) {
            logger.debug(
              'Ignoring claim nudge because task manager is backing off after Elasticsearch errors; the next regular poll cycle will claim the task'
            );
            return;
          }
          if (throttleTimer !== undefined) {
            trailingNudgePending = true;
            return;
          }
          emitNudge();
        },
        error: (error) => subscriber.error(error),
        complete: () => subscriber.complete(),
      })
    );
  });
