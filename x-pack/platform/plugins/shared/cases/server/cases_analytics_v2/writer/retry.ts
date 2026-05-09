/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface WithRetryOptions {
  /** The operation to attempt. Resolves on success, rejects to trigger retry. */
  op: () => Promise<void>;
  /** Maximum number of retries after the first attempt. Defaults imply 4 total tries. */
  maxRetries: number;
  /** Base delay before the second attempt. Doubled per attempt; jittered. */
  initialDelayMs: number;
}

/**
 * Bounded jittered exponential backoff. Used by the analytics writer for
 * transient ES failures (cluster blip, version conflict on bulk concurrent
 * write, etc.).
 *
 * The first attempt fires immediately. On failure, attempt N waits for
 *   `Math.random() * initialDelayMs * 2 ** (N - 1)` ms
 * before retrying. After `maxRetries` failures the final error is thrown.
 *
 * "Full jitter" (random factor in `[0, delay)`) is a deliberate choice — it
 * spreads concurrent retries from multiple Kibana nodes across the backoff
 * window rather than clustering at the deterministic delay, which avoids the
 * thundering-herd pattern when an ES blip recovers.
 */
export async function withRetry({
  op,
  maxRetries,
  initialDelayMs,
}: WithRetryOptions): Promise<void> {
  let attempt = 0;
  // The loop exits via either `return` (success) or `throw` (final failure).
  while (true) {
    try {
      await op();
      return;
    } catch (err) {
      attempt++;
      if (attempt > maxRetries) {
        throw err;
      }
      const cappedDelay = initialDelayMs * 2 ** (attempt - 1);
      const jittered = Math.random() * cappedDelay;
      await new Promise((resolve) => setTimeout(resolve, jittered));
    }
  }
}
