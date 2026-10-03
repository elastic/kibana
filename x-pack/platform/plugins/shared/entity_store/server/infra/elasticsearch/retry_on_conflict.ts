/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry from 'p-retry';
import { errors as esErrors } from '@elastic/elasticsearch';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

export type RetryOnConflictOptions = pRetry.Options;

// `p-retry`'s own defaults (10 retries, 1s minTimeout, unbounded maxTimeout) sleep ~17 minutes.
const DEFAULT_RETRY_OPTIONS: RetryOnConflictOptions = {
  retries: 5,
  factor: 2,
  minTimeout: 100,
  maxTimeout: 2000,
};

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
 *
 * Retries are bounded (~3s in total by default, overridable via `opts`), so a persistently
 * contended write rejects with a 409 rather than holding its caller open.
 */
export const retryOnConflict = <T>(
  fn: () => Promise<T>,
  opts?: RetryOnConflictOptions
): Promise<T> =>
  pRetry(
    () =>
      fn().catch((error) => {
        if (isConflictError(error)) throw error;
        throw new pRetry.AbortError(error as Error);
      }),
    { ...DEFAULT_RETRY_OPTIONS, ...opts }
  );
