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
  /** Included in wait/error logs so multi-node raw logs can be attributed. */
  serverUuid?: string;
  /** Stops lock acquisition and retry delays when the plugin shuts down. */
  pluginStop$?: Observable<void>;
  /**
   * Override the delay between acquisition attempts, in milliseconds.
   * Production uses exponential backoff (1s, 2s, 4s, 8s, 16s, 30s). Tests pass
   * `0` to avoid waiting.
   */
  retryDelayMs?: number;
}

export const INSTALL_LOCK_INITIAL_RETRY_DELAY_MS = 1000;
export const INSTALL_LOCK_MAX_RETRY_DELAY_MS = 30000;

/**
 * Delay after a failed acquisition: 1s, 2s, 4s, 8s, 16s, then 30s capped.
 * `failedAttempt` is 1-based (the attempt that just lost the race).
 */
export const getInstallLockRetryDelayMs = (failedAttempt: number): number =>
  Math.min(
    INSTALL_LOCK_INITIAL_RETRY_DELAY_MS * 2 ** (failedAttempt - 1),
    INSTALL_LOCK_MAX_RETRY_DELAY_MS
  );

const throwIfStopped = (stopped: boolean) => {
  if (stopped) {
    throw new InstallShutdownError();
  }
};

const delay = async (ms: number, stopPromise: Promise<void>): Promise<void> => {
  if (ms <= 0) {
    return;
  }
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

const nodeLabel = (serverUuid?: string): string =>
  serverUuid ? `Kibana node ${serverUuid}` : 'Kibana node';

/**
 * Runs alerts-as-data resource installation under a cluster-wide lock so that,
 * across multiple Kibana nodes, only one node installs a given resource set at a
 * time — reducing the burst of concurrent requests to Elasticsearch on startup.
 *
 * A node that loses the race retries acquisition with exponential backoff until
 * it holds the lock, or until plugin shutdown. Contention never causes an
 * unlocked install: there is no attempt cap, so a large fleet is not truncated
 * by a fixed retry budget. A hung holder keeps the lock via TTL extension; other
 * nodes wait (and abort on `pluginStop$`). A crashed holder expires the lease
 * and the next waiter acquires it.
 */
export const installResourcesWithLock = async ({
  lockManager,
  lockId,
  logger,
  installFn,
  serverUuid,
  pluginStop$,
  retryDelayMs,
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
        // A shutdown mid-install isn't contention or a real failure; rethrow so
        // `initializeCommon` logs it at debug rather than error.
        if (err instanceof InstallShutdownError) {
          throw err;
        }
        if (!isLockAcquisitionError(err)) {
          // Install failure or lock-manager error — not "someone else holds it".
          logger.error(
            `Error while installing resources under lock "${lockId}" (${nodeLabel(serverUuid)}): ${
              err.message
            }`
          );
          throw err;
        }

        const waitMs = retryDelayMs ?? getInstallLockRetryDelayMs(attempt);
        const waitSec = waitMs / 1000;
        logger.info(
          `${nodeLabel(
            serverUuid
          )} waiting for install lock "${lockId}" held by another node; retrying in ${waitSec}s (attempt ${attempt})`
        );
        await delay(waitMs, stopPromise);
        throwIfStopped(stopped);
      }
    }
  } finally {
    stopSubscription?.unsubscribe();
  }
};
