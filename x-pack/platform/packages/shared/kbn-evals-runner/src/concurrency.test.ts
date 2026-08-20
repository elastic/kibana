/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapWithConcurrency, ConcurrencyAbortError } from './concurrency';

describe('mapWithConcurrency', () => {
  it('preserves input order in the results', async () => {
    const items = [10, 20, 30, 40, 50];
    const results = await mapWithConcurrency(
      items,
      async (item) => {
        await new Promise((resolve) => setTimeout(resolve, item % 30));
        return item * 2;
      },
      { concurrency: 2 }
    );
    expect(results).toEqual([20, 40, 60, 80, 100]);
  });

  it('never exceeds the configured concurrency', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    await mapWithConcurrency(
      Array.from({ length: 20 }, (_, i) => i),
      async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 1));
        inFlight -= 1;
      },
      { concurrency: 3 }
    );
    expect(maxInFlight).toBeLessThanOrEqual(3);
  });

  it.each([0, -1, 0.5, NaN, Infinity])(
    'throws a RangeError for invalid concurrency %p',
    async (concurrency) => {
      await expect(
        mapWithConcurrency([1, 2, 3], async (item) => item, { concurrency })
      ).rejects.toBeInstanceOf(RangeError);
    }
  );

  it('returns an empty array for empty input', async () => {
    const results = await mapWithConcurrency([], async () => 1, { concurrency: 4 });
    expect(results).toEqual([]);
  });

  it('rejects with an AbortError when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      mapWithConcurrency([1, 2, 3], async (item) => item, {
        concurrency: 2,
        signal: controller.signal,
      })
    ).rejects.toBeInstanceOf(ConcurrencyAbortError);
  });

  it('awaits in-flight work before rejecting on abort', async () => {
    const controller = new AbortController();
    let started = 0;
    let settledInFlight = 0;
    const promise = mapWithConcurrency(
      [1, 2, 3, 4],
      async (item) => {
        started += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        settledInFlight += 1;
        return item;
      },
      { concurrency: 2, signal: controller.signal }
    );

    // Both workers pick up their first item synchronously; abort once they are in flight.
    await new Promise((resolve) => setTimeout(resolve, 1));
    controller.abort();

    await expect(promise).rejects.toBeInstanceOf(ConcurrencyAbortError);
    // The two in-flight calls must finish (not be abandoned) before the rejection;
    // the remaining items are never started.
    expect(started).toBe(2);
    expect(settledInFlight).toBe(2);
  });

  it('propagates signal.reason as the error cause', async () => {
    const controller = new AbortController();
    const reason = new Error('cancelled by user');
    controller.abort(reason);
    await expect(
      mapWithConcurrency([1, 2, 3], async (item) => item, {
        concurrency: 2,
        signal: controller.signal,
      })
    ).rejects.toMatchObject({ cause: reason });
  });
});
