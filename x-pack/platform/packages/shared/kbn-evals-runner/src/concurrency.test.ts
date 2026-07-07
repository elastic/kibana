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

  it('treats concurrency below 1 as 1', async () => {
    let maxInFlight = 0;
    let inFlight = 0;
    await mapWithConcurrency(
      [1, 2, 3],
      async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 1));
        inFlight -= 1;
      },
      { concurrency: 0 }
    );
    expect(maxInFlight).toBe(1);
  });

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
});
