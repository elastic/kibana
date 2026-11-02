/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isLockAcquisitionError } from '@kbn/lock-manager';

export const PRODUCT_DOC_INSTALL_LOCK_ID = 'product_doc_base:install';
export const INSTALL_LOCK_RETRY_DELAY_MS = 10_000;
const DEFAULT_WAIT_TIMEOUT_MS = 10 * 60 * 1000;

export interface InstallLockManager {
  withLock<T>(
    lockId: string,
    callback: () => Promise<T>,
    options?: { metadata?: Record<string, unknown> }
  ): Promise<T>;
}

/**
 * Runs `run` under the cluster-wide install lock. Resolves to `false` without running when another
 * install currently holds the lock, so callers can defer instead of failing.
 */
export const tryWithInstallLock = async ({
  lockManager,
  run,
  metadata,
}: {
  lockManager: InstallLockManager;
  run: () => Promise<void>;
  metadata?: Record<string, unknown>;
}): Promise<boolean> => {
  try {
    await lockManager.withLock(PRODUCT_DOC_INSTALL_LOCK_ID, run, { metadata });
    return true;
  } catch (e) {
    if (isLockAcquisitionError(e)) {
      return false;
    }
    throw e;
  }
};

/**
 * Runs `run` under the install lock, retrying acquisition until `timeoutMs` elapses. For callers
 * that must complete inline (HTTP requests, startup) rather than defer like a task run.
 */
export const waitForInstallLock = async <T>({
  lockManager,
  run,
  metadata,
  timeoutMs = DEFAULT_WAIT_TIMEOUT_MS,
  retryDelayMs = INSTALL_LOCK_RETRY_DELAY_MS,
}: {
  lockManager: InstallLockManager;
  run: () => Promise<T>;
  metadata?: Record<string, unknown>;
  timeoutMs?: number;
  retryDelayMs?: number;
}): Promise<T> => {
  const deadline = Date.now() + timeoutMs;
  while (true) {
    try {
      return await lockManager.withLock(PRODUCT_DOC_INSTALL_LOCK_ID, run, { metadata });
    } catch (e) {
      if (!isLockAcquisitionError(e)) {
        throw e;
      }
      if (Date.now() + retryDelayMs > deadline) {
        throw new Error(
          `Timed out waiting for the product documentation install lock "${PRODUCT_DOC_INSTALL_LOCK_ID}"`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
};
