/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntervalHistogram } from 'perf_hooks';
import { monitorEventLoopDelay } from 'perf_hooks';

import { startTaskTimer, startEventLoopMonitoring } from './task_events';

jest.mock('perf_hooks', () => ({
  monitorEventLoopDelay: jest.fn(),
}));

const monitorEventLoopDelayMock = monitorEventLoopDelay as jest.MockedFunction<
  typeof monitorEventLoopDelay
>;

const createHistogramMock = (max: number) =>
  ({ enable: jest.fn(), disable: jest.fn(), max } as unknown as IntervalHistogram);

const DelayIterations = 4;
const DelayMillis = 250;
const DelayTotal = DelayIterations * DelayMillis;

async function basicNonBlockingDelay(millis: number) {
  await new Promise((resolve) => setTimeout(resolve, millis));
}

async function nonBlockingDelay(millis: number) {
  // can't just use basicNonBlockingDelay because:
  // https://github.com/nodejs/node/issues/26578
  const end = Date.now() + millis;

  while (Date.now() <= end) {
    await basicNonBlockingDelay(millis);
  }
}

async function nonBlockingTask() {
  for (let i = 0; i < DelayIterations; i++) {
    await nonBlockingDelay(DelayMillis);
  }
}

describe('task_events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('startTaskTimer', async () => {
    const stopTaskTimer = startTaskTimer();
    await nonBlockingTask();
    const result = stopTaskTimer();
    expect(result.stop - result.start).not.toBeLessThan(DelayTotal);
    expect(result.eventLoopBlockMs).toBe(undefined);
  });

  describe('startEventLoopMonitoring', () => {
    test('monitoring', () => {
      const eldHistogram = createHistogramMock(1_500_000);
      monitorEventLoopDelayMock.mockReturnValue(eldHistogram);

      const stopMonitoring = startEventLoopMonitoring({
        monitor: true,
        warn_threshold: 5000,
      });
      expect(eldHistogram.enable).toHaveBeenCalledTimes(1);
      expect(eldHistogram.disable).not.toHaveBeenCalled();

      const eventLoopBlockMs = stopMonitoring();
      expect(eldHistogram.disable).toHaveBeenCalledTimes(1);
      expect(eventLoopBlockMs).toBe(2);
    });

    test('not monitoring', () => {
      const stopMonitoring = startEventLoopMonitoring({
        monitor: false,
        warn_threshold: 5000,
      });
      const eventLoopBlockMs = stopMonitoring();
      expect(monitorEventLoopDelayMock).not.toHaveBeenCalled();
      expect(eventLoopBlockMs).toBe(0);
    });
  });
});
