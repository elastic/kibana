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
  opts?: RetryOnConflictOptions
): Promise<T> =>
  pRetry(
    () =>
      fn().catch((error) => {
        if (isConflictError(error)) throw error;
        throw new pRetry.AbortError(error as Error);
      }),
    opts
  );
