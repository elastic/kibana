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
  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves before the timeout', async () => {
    await expect(withCatalogTimeout(Promise.resolve('ok'), 5_000, () => 'timed-out')).resolves.toBe(
      'ok'
    );
  });

  it('returns onTimeout after the deadline', async () => {
    jest.useFakeTimers();
    const result = withCatalogTimeout(
      new Promise<string>(() => undefined),
      1_000,
      () => 'timed-out'
    );
    await jest.advanceTimersByTimeAsync(1_000);
    await expect(result).resolves.toBe('timed-out');
  });

  it('returns onError when the promise rejects', async () => {
    await expect(
      withCatalogTimeout(
        Promise.reject(new Error('boom')),
        5_000,
        () => 'timed-out',
        (error) => `failed:${error instanceof Error ? error.message : String(error)}`
      )
    ).resolves.toBe('failed:boom');
  });

  it('does not surface a rejection that arrives after the timeout', async () => {
    jest.useFakeTimers();
    let rejectLate: (error: Error) => void = () => undefined;
    const late = new Promise<string>((_resolve, reject) => {
      rejectLate = reject;
    });
    const result = withCatalogTimeout(late, 1_000, () => 'timed-out');
    await jest.advanceTimersByTimeAsync(1_000);
    await expect(result).resolves.toBe('timed-out');
    rejectLate(new Error('late'));
    await Promise.resolve();
  });

  it('keeps boot budgets under the core start cap', () => {
    expect(CATALOG_LOAD_TIMEOUT_MS).toBe(5_000);
    expect(CATALOG_BOOT_FETCH_TIMEOUT_MS).toBe(8_000);
    expect(CATALOG_BOOT_HARD_STOP_MS).toBe(9_000);
    expect(CATALOG_BOOT_HARD_STOP_MS).toBeLessThan(10_000);
  });
});
