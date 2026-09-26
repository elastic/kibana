/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withCatalogTimeout } from './with_timeout';

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
});
