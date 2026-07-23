/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { from, of } from 'rxjs';
import { catchError, map, startWith, timeout } from 'rxjs';
import type { Logger } from '@kbn/core/server';

export interface GetPluginsStartedOpts {
  /**
   * Core's plugin-agnostic "all plugins started" signal (`core.plugins.onStarted`). Resolves once
   * every plugin has completed its `start` lifecycle.
   */
  onStarted: () => Promise<void>;
  logger: Logger;
  /** Fail-safe deadline after which the poller starts regardless. */
  timeoutMs?: number;
}

/**
 * Fail-safe deadline for the "all plugins started" signal.
 *
 * If Kibana finished starting, `onStarted` resolves in well under this window (Core caps each
 * async plugin `start` at 10s and aborts the whole server start otherwise). This timeout only
 * exists so that an unexpected failure to receive the signal can never permanently wedge the task
 * poller — matching the existing fail-open behaviour of the Elasticsearch cluster-health gate.
 */
export const WAIT_FOR_ALL_PLUGINS_STARTED_TIMEOUT = 2 * 60 * 1000;

/**
 * Emits `false` immediately, then `true` once all plugins have completed their `start` lifecycle.
 *
 * This is used to gate the task poller so tasks aren't claimed/run before their owning plugins are
 * ready. It fails open: if the signal doesn't arrive within {@link WAIT_FOR_ALL_PLUGINS_STARTED_TIMEOUT}
 * (or rejects), it emits `true` and logs, so the poller is never permanently blocked.
 */
export function getPluginsStarted$({
  onStarted,
  logger,
  timeoutMs = WAIT_FOR_ALL_PLUGINS_STARTED_TIMEOUT,
}: GetPluginsStartedOpts): Observable<boolean> {
  return from(onStarted()).pipe(
    timeout({
      first: timeoutMs,
      with: () => {
        logger.warn(
          `Task Manager did not receive the "all plugins started" signal within ${timeoutMs}ms. Starting the task poller regardless.`
        );
        return of(undefined);
      },
    }),
    map(() => true),
    catchError((e) => {
      // `onStarted` is not expected to reject, but never let a rejection permanently block polling.
      logger.error(
        `Error waiting for plugins to start. Starting the task poller regardless. Error: ${e.message}`
      );
      return of(true);
    }),
    startWith(false)
  );
}
