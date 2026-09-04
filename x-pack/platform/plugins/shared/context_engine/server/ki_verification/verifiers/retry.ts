/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isResponseError, isRequestAbortedError } from '@kbn/es-errors';

// Abort is user cancellation — never retry.
// 429 and 5xx are transient; other non-response errors (transport, connection) are retryable.
// 400 is a query/content error and 403 is authorization — neither will resolve on retry.
export const isRetryableError = (error: unknown): boolean => {
  if (isRequestAbortedError(error) || (error instanceof Error && error.name === 'AbortError')) {
    return false;
  }
  if (isResponseError(error)) {
    const { statusCode } = error;
    return statusCode === 429 || (statusCode !== undefined && statusCode >= 500);
  }
  return true;
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface RetryOptions {
  maxAttempts: number;
  /** Base delay in ms; doubles on each retry. Pass 0 in tests. */
  delayMs: number;
  signal?: AbortSignal;
}

/** Retries an async operation on transient errors, using exponential backoff. */
export const withRetry = async <T>(fn: () => Promise<T>, opts: RetryOptions): Promise<T> => {
  const { maxAttempts, delayMs, signal } = opts;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await sleep(delayMs * 2 ** (attempt - 1));
      signal?.throwIfAborted();
    }
    try {
      return await fn();
    } catch (error) {
      if (!isRetryableError(error)) throw error;
      lastError = error;
    }
  }

  throw lastError;
};
