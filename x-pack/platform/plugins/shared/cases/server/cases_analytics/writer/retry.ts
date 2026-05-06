/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Bounded jittered exponential backoff. Designed for the writer's "post-SO-success
 * fire-and-forget" path — failures here MUST NOT propagate to the API response, but
 * we want a small in-memory retry to absorb transient ES blips before falling through
 * to the reconciliation tail job.
 */
export const withRetry = async <T>({
  op,
  maxRetries,
  initialDelayMs,
}: {
  op: () => Promise<T>;
  maxRetries: number;
  initialDelayMs: number;
}): Promise<T> => {
  let attempt = 0;
  // Loop exits via return or throw — the bound `attempt > maxRetries` rethrows the
  // last seen error to the caller (which itself already swallows for fire-and-forget).

  while (true) {
    try {
      return await op();
    } catch (err) {
      attempt += 1;
      if (attempt > maxRetries) {
        throw err;
      }
      const delay = jitter(initialDelayMs * Math.pow(2, attempt - 1));
      await sleep(delay);
    }
  }
};

const jitter = (ms: number): number => ms / 2 + Math.random() * (ms / 2);
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
