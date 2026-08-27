/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { isLockAcquisitionError } from '@kbn/lock-manager';
import type { Observable, Subscription } from 'rxjs';
import { InstallShutdownError } from './install_with_timeout';

/**
 * Minimal contract needed from `@kbn/lock-manager`'s `LockManagerService`, kept
 * local so the alerts service (and its tests) don't depend on the concrete class.
 */
export interface ResourceInstallLockManager {
  withLock(
    lockId: string,
    callback: () => Promise<void>,
    options?: { metadata?: Record<string, unknown> }
  ): Promise<void>;
}

export interface InstallResourcesWithLockOpts {
  /** When omitted, the install runs directly without any coordination. */
  lockManager?: ResourceInstallLockManager;
  lockId: string;
  logger: Logger;
  installFn: () => Promise<void>;
  /** Stops lock acquisition and retry delays when the plugin shuts down. */
  pluginStop$?: Observable<void>;
  /** Number of lock acquisition attempts before reporting initialization as failed. */
  maxAttempts?: number;
  /** Delay between acquisition attempts, in milliseconds. */
  retryDelayMs?: number;
}

const DEFAULT_MAX_ATTEMPTS = 10;
const DEFAULT_RETRY_DELAY_MS = 5000;

const throwIfStopped = (stopped: boolean) => {
  if (stopped) {
    throw new InstallShutdownError();
  }
};

const delay = async (ms: number, stopPromise: Promise<void>): Promise<void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      new Promise<void>((resolve) => {
        timeoutId = setTimeout(resolve, ms);
      }),
      stopPromise,
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

/**
 * Runs alerts-as-data resource installation under a cluster-wide lock so that,
 * across multiple Kibana nodes, only one node installs a given resource set at a
 * time — reducing the burst of concurrent requests to Elasticsearch on startup.
 *
 * A node that loses the race retries acquisition and eventually runs the
 * idempotent installation under the lock. Contention never causes an unlocked
 * install; exhausting the retry budget reports initialization as failed and lets
 * the alerts service's existing retry flow try again later.
 */
export const installResourcesWithLock = async ({
  lockManager,
  lockId,
  logger,
  installFn,
  pluginStop$,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
}: InstallResourcesWithLockOpts): Promise<void> => {
  let stopped = false;
  let stopSubscription: Subscription | undefined;
  const stopPromise = new Promise<void>((resolve) => {
    stopSubscription = pluginStop$?.subscribe(() => {
      stopped = true;
      resolve();
    });
  });

  try {
    if (!lockManager) {
      throwIfStopped(stopped);
      await installFn();
      return;
    }

    for (let attempt = 1; ; attempt++) {
      throwIfStopped(stopped);

      try {
        await lockManager.withLock(lockId, async () => {
          throwIfStopped(stopped);
          await installFn();
        });
        return;
      } catch (err) {
        // A non-acquisition error means the install itself failed (or the lock
        // manager errored); surface it to the caller's existing error handling.
        if (!isLockAcquisitionError(err)) {
          throw err;
        }

        if (attempt >= maxAttempts) {
          throw new Error(`Could not acquire install lock "${lockId}" after ${attempt} attempts`);
        }

        logger.debug(
          `Install lock "${lockId}" is held by another node; retrying (attempt ${attempt} of ${maxAttempts})`
        );
        await delay(retryDelayMs, stopPromise);
        throwIfStopped(stopped);
      }
    }
  } finally {
    stopSubscription?.unsubscribe();
  }
};
