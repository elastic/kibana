/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry from 'p-retry';
import { errors as esErrors } from '@elastic/elasticsearch';
import { SavedObjectsErrorHelpers, type Logger } from '@kbn/core/server';

export interface RetryOnConflictOptions {
  logger?: Logger;
  /** Number of retries after the first attempt. Defaults to 3. */
  retries?: number;
  /** Milliseconds before the first retry attempt. Defaults to 50. */
  minTimeout?: number;
  /** Maximum milliseconds between retries. Defaults to 250. */
  maxTimeout?: number;
}

const isConflictError = (error: unknown): boolean =>
  (error instanceof Error && SavedObjectsErrorHelpers.isConflictError(error)) ||
  (error instanceof esErrors.ResponseError && error.statusCode === 409);

/**
 * Runs `fn`, retrying when it fails with a version conflict (HTTP 409) from either the
 * saved objects client or the Elasticsearch client. Any other error rejects immediately
 * with the original error.
 *
 * `fn` must contain the whole read-modify-write cycle (not just the write), so each
 * retry reads the document fresh and writes against its current version.
 */
export const retryOnConflict = <T>(
  fn: () => Promise<T>,
  { logger, retries = 3, minTimeout = 50, maxTimeout = 250 }: RetryOnConflictOptions = {}
): Promise<T> =>
  pRetry(
    async () => {
      try {
        return await fn();
      } catch (error) {
        if (isConflictError(error)) {
          throw error;
        }
        // p-retry stops and rejects with the original error
        throw new pRetry.AbortError(error as Error);
      }
    },
    {
      retries,
      minTimeout,
      maxTimeout,
      // only invoked for retryable (conflict) errors
      onFailedAttempt: (error) => {
        logger?.debug(
          `Version conflict (attempt ${error.attemptNumber}, ${error.retriesLeft} retries left): ${error.message}`
        );
      },
    }
  );
