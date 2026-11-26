/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { BackgroundWriteTracker } from './background_write_tracker';

const deferred = () => {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const flushMicrotasks = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('BackgroundWriteTracker', () => {
  it('enforces maxInFlight and frees slots as writes settle', async () => {
    const tracker = new BackgroundWriteTracker({ maxInFlight: 2 });
    const first = deferred();
    const second = deferred();
    const thirdRun = jest.fn(async () => undefined);

    expect(tracker.tryStart(() => first.promise)).toBe(true);
    expect(tracker.tryStart(() => second.promise)).toBe(true);
    expect(tracker.inFlightCount).toBe(2);

    expect(tracker.tryStart(thirdRun)).toBe(false);
    expect(thirdRun).not.toHaveBeenCalled();

    first.resolve();
    await flushMicrotasks();
    expect(tracker.inFlightCount).toBe(1);

    expect(tracker.tryStart(thirdRun)).toBe(true);
    expect(thirdRun).toHaveBeenCalledTimes(1);

    second.resolve();
    await flushMicrotasks();
    expect(tracker.inFlightCount).toBe(0);
  });

  it('releases slots when a task rejects or throws synchronously without unhandled rejections', async () => {
    const tracker = new BackgroundWriteTracker({ maxInFlight: 1 });
    const unhandled = jest.fn();
    process.on('unhandledRejection', unhandled);

    try {
      const failing = deferred();
      expect(tracker.tryStart(() => failing.promise)).toBe(true);
      failing.reject(new Error('boom'));
      await flushMicrotasks();

      expect(tracker.inFlightCount).toBe(0);

      expect(
        tracker.tryStart(() => {
          throw new Error('sync boom');
        })
      ).toBe(true);
      await flushMicrotasks();

      expect(tracker.inFlightCount).toBe(0);
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  });

  it('returns immediately from drain when nothing is in flight and rejects subsequent writes', async () => {
    const logger = loggerMock.create();
    const tracker = new BackgroundWriteTracker({ maxInFlight: 2, logger });

    await tracker.drain();

    expect(logger.warn).not.toHaveBeenCalled();
    const run = jest.fn(async () => undefined);
    expect(tracker.tryStart(run)).toBe(false);
    expect(run).not.toHaveBeenCalled();
  });

  it('drains in-flight writes before resolving and rejects new writes while draining', async () => {
    const logger = loggerMock.create();
    const tracker = new BackgroundWriteTracker({ maxInFlight: 2, drainTimeoutMs: 5_000, logger });
    const pending = deferred();

    expect(tracker.tryStart(() => pending.promise)).toBe(true);

    let drained = false;
    const drainPromise = tracker.drain().then(() => {
      drained = true;
    });

    expect(tracker.tryStart(async () => undefined)).toBe(false);

    await flushMicrotasks();
    expect(drained).toBe(false);

    pending.resolve();
    await drainPromise;

    expect(drained).toBe(true);
    expect(tracker.inFlightCount).toBe(0);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('resolves and logs a warning when in-flight writes outlive drainTimeoutMs', async () => {
    jest.useFakeTimers();
    try {
      const logger = loggerMock.create();
      const tracker = new BackgroundWriteTracker({
        maxInFlight: 2,
        drainTimeoutMs: 1_000,
        logger,
      });
      const hung = deferred();

      expect(tracker.tryStart(() => hung.promise)).toBe(true);

      const drainPromise = tracker.drain();
      jest.advanceTimersByTime(1_000);
      await drainPromise;

      expect(logger.warn).toHaveBeenCalledWith(
        'Timed out after 1000ms waiting for 1 in-flight session memory write(s) to finish'
      );

      hung.resolve();
    } finally {
      jest.useRealTimers();
    }
  });
});
