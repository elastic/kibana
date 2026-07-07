/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Thrown by {@link mapWithConcurrency} when the provided `AbortSignal` fires. */
export class ConcurrencyAbortError extends Error {
  constructor(message = 'Operation aborted') {
    super(message);
    this.name = 'AbortError';
  }
}

export interface MapWithConcurrencyOptions {
  /** Maximum number of `fn` invocations running at any one time. */
  concurrency: number;
  /** Optional signal to stop scheduling new work and reject in-flight waits. */
  signal?: AbortSignal;
}

/**
 * Runs `fn` over `items` with a bounded worker pool, preserving input order in
 * the returned results. This is a dependency-free, server-safe alternative to
 * `p-limit` so the package stays `shared-common` (no node-only imports).
 *
 * If `signal` aborts, scheduling stops and the returned promise rejects with a
 * {@link ConcurrencyAbortError}; work already in flight is allowed to settle.
 */
export const mapWithConcurrency = async <TItem, TResult>(
  items: readonly TItem[],
  fn: (item: TItem, index: number) => Promise<TResult>,
  { concurrency, signal }: MapWithConcurrencyOptions
): Promise<TResult[]> => {
  const limit = Math.max(1, Math.floor(concurrency));
  const results = new Array<TResult>(items.length);
  let nextIndex = 0;

  const worker = async (): Promise<void> => {
    while (true) {
      if (signal?.aborted) {
        throw new ConcurrencyAbortError();
      }
      const current = nextIndex;
      nextIndex += 1;
      if (current >= items.length) {
        return;
      }
      results[current] = await fn(items[current], current);
    }
  };

  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
};
