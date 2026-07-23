/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, lastValueFrom, take, toArray } from 'rxjs';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { getPluginsStarted$, WAIT_FOR_ALL_PLUGINS_STARTED_TIMEOUT } from './get_plugins_started';

describe('getPluginsStarted$', () => {
  const logger = loggingSystemMock.create().get();

  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('emits false initially', async () => {
    const onStarted = () => new Promise<void>(() => {}); // never resolves
    const first = await firstValueFrom(getPluginsStarted$({ onStarted, logger }));
    expect(first).toBe(false);
  });

  it('emits false then true once all plugins have started', async () => {
    const onStarted = () => Promise.resolve();
    const values = await lastValueFrom(
      getPluginsStarted$({ onStarted, logger }).pipe(take(2), toArray())
    );
    expect(values).toEqual([false, true]);
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('fails open (emits true) and warns if the signal never arrives within the timeout', async () => {
    jest.useFakeTimers();
    const onStarted = () => new Promise<void>(() => {}); // never resolves

    const emissions: boolean[] = [];
    const sub = getPluginsStarted$({ onStarted, logger, timeoutMs: 1000 }).subscribe((v) =>
      emissions.push(v)
    );

    // Before the timeout, only the initial `false` has been emitted.
    await Promise.resolve();
    expect(emissions).toEqual([false]);

    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(emissions).toEqual([false, true]);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('did not receive the "all plugins started" signal')
    );
    sub.unsubscribe();
  });

  it('fails open (emits true) and logs an error if the signal rejects', async () => {
    const onStarted = () => Promise.reject(new Error('boom'));
    const values = await lastValueFrom(
      getPluginsStarted$({ onStarted, logger }).pipe(take(2), toArray())
    );
    expect(values).toEqual([false, true]);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });

  it('has a fail-safe timeout that is generously larger than Core plugin start timeouts', () => {
    // Core caps each async plugin start at 10s; the fail-safe should be well above that.
    expect(WAIT_FOR_ALL_PLUGINS_STARTED_TIMEOUT).toBeGreaterThanOrEqual(60 * 1000);
  });
});
