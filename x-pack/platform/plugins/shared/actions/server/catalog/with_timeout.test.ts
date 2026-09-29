/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CATALOG_BOOT_FETCH_TIMEOUT_MS,
  CATALOG_BOOT_HARD_STOP_MS,
  CATALOG_LOAD_TIMEOUT_MS,
  withCatalogTimeout,
} from './with_timeout';

describe('withCatalogTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the promise value when it resolves before the timeout', async () => {
    const result = withCatalogTimeout(Promise.resolve('ok'), 5_000, () => 'timed-out');
    await expect(result).resolves.toBe('ok');
  });

  it('returns onTimeout when the promise does not settle in time', async () => {
    const result = withCatalogTimeout(new Promise<string>(() => {}), 5_000, () => 'timed-out');
    jest.advanceTimersByTime(5_000);
    await expect(result).resolves.toBe('timed-out');
  });

  it('does not invoke onTimeout after the promise has already resolved', async () => {
    const onTimeout = jest.fn(() => 'timed-out');
    const result = withCatalogTimeout(Promise.resolve('ok'), 5_000, onTimeout);
    await expect(result).resolves.toBe('ok');
    jest.advanceTimersByTime(5_000);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('returns onError when the promise rejects before the timeout', async () => {
    const result = withCatalogTimeout(
      Promise.reject(new Error('cluster_block_exception')),
      5_000,
      () => 'timed-out',
      (error) => `failed:${error instanceof Error ? error.message : String(error)}`
    );
    await expect(result).resolves.toBe('failed:cluster_block_exception');
  });

  it('keeps the boot budgets ordered under the core start cap', () => {
    expect(CATALOG_LOAD_TIMEOUT_MS).toBeLessThan(CATALOG_BOOT_FETCH_TIMEOUT_MS);
    expect(CATALOG_BOOT_FETCH_TIMEOUT_MS).toBeLessThan(CATALOG_BOOT_HARD_STOP_MS);
    expect(CATALOG_BOOT_HARD_STOP_MS).toBeLessThan(10_000);
  });
});
