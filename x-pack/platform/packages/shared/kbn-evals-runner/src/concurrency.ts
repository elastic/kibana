/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Thrown by {@link mapWithConcurrency} when the provided `AbortSignal` fires. */
export class ConcurrencyAbortError extends Error {
  constructor(message = 'Operation aborted', options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'AbortError';
  }
}

export interface MapWithConcurrencyOptions {
  concurrency: number;
  signal?: AbortSignal;
}

/**
 * Runs `fn` over `items` with a bounded worker pool, preserving input order.
 * Dependency-free and server-safe so the package stays `shared-common` (p-map's
 * `signal` support needs v5; `@kbn/std` exposes no `signal`).
 *
 * `fn` must handle its own errors — it is treated as non-throwing. On abort,
 * scheduling stops, in-flight calls are awaited (not abandoned), then the
 * promise rejects with {@link ConcurrencyAbortError} (with `signal.reason` as
 * its `cause`). Throws `RangeError` if `concurrency` is not a finite number >= 1.
 */
export const mapWithConcurrency = async <TItem, TResult>(
  items: readonly TItem[],
  fn: (item: TItem, index: number) => Promise<TResult>,
  { concurrency, signal }: MapWithConcurrencyOptions
): Promise<TResult[]> => {
  if (!Number.isFinite(concurrency) || concurrency < 1) {
    throw new RangeError(`concurrency must be a finite number >= 1, received ${concurrency}`);
  }
  const limit = Math.floor(concurrency);
  const results = new Array<TResult>(items.length);
  let nextIndex = 0;

  const worker = async (): Promise<void> => {
    // Stop pulling new work once aborted; any in-flight `fn` still resolves so
    // `Promise.allSettled` below can drain it before we reject.
    while (!signal?.aborted) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= items.length) {
        return;
      }
      results[current] = await fn(items[current], current);
    }
  };

  const workerCount = Math.min(limit, items.length);
  const settled = await Promise.allSettled(Array.from({ length: workerCount }, () => worker()));

  if (signal?.aborted) {
    throw new ConcurrencyAbortError(undefined, { cause: signal.reason });
  }
  // `fn` is contractually non-throwing. Surface a stray rejection instead of
  // returning a partially-filled array.
  for (const outcome of settled) {
    if (outcome.status === 'rejected') {
      throw outcome.reason;
    }
  }

  return results;
};
