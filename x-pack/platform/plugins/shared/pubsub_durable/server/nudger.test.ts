/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { NUDGE_MIN_INTERVAL_MS, NUDGE_RETRY_DELAY_MS } from './constants';
import { Nudger } from './nudger';

class AlreadyRunning extends Error {}

describe('Nudger', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const create = (runSoon: jest.Mock) =>
    new Nudger({
      runSoon,
      isAlreadyRunningError: (error) => error instanceof AlreadyRunning,
      logger: loggerMock.create(),
    });

  it('sends the first nudge immediately and delays, rather than drops, one inside the window', async () => {
    const runSoon = jest.fn().mockResolvedValue({ id: 't' });
    const nudger = create(runSoon);

    nudger.nudge('t');
    nudger.nudge('t');
    nudger.nudge('t');
    await jest.advanceTimersByTimeAsync(0);
    expect(runSoon).toHaveBeenCalledTimes(1);
    expect(runSoon).toHaveBeenCalledWith('t', { requestImmediateClaim: true });

    await jest.advanceTimersByTimeAsync(NUDGE_MIN_INTERVAL_MS);
    expect(runSoon).toHaveBeenCalledTimes(2);
  });

  it('retries once after a running task or a conflict', async () => {
    const runSoon = jest
      .fn()
      .mockRejectedValueOnce(new AlreadyRunning())
      .mockResolvedValueOnce({ id: 't', conflict: true })
      .mockResolvedValue({ id: 't' });
    const nudger = create(runSoon);

    nudger.nudge('t');
    await jest.advanceTimersByTimeAsync(NUDGE_RETRY_DELAY_MS);
    expect(runSoon).toHaveBeenCalledTimes(2);

    // The retry also conflicted, but a retry is never retried.
    await jest.advanceTimersByTimeAsync(NUDGE_RETRY_DELAY_MS * 2);
    expect(runSoon).toHaveBeenCalledTimes(2);
  });

  it('sends nothing after stop', async () => {
    const runSoon = jest.fn().mockResolvedValue({ id: 't' });
    const nudger = create(runSoon);
    nudger.stop();
    nudger.nudge('t');
    await jest.advanceTimersByTimeAsync(10_000);
    expect(runSoon).not.toHaveBeenCalled();
  });
});
