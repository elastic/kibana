/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Exercises the real worker thread, `SharedArrayBuffer` heartbeat, and inspector CPU
 * profile capture end to end: no part of the watchdog is mocked here. A synchronous
 * busy-loop stands in for a stuck task blocking the main thread's event loop.
 */

import { mockLogger } from '../test_utils';
import type { EventLoopWatchdogConfig } from '../config';
import { EventLoopWatchdog } from '../event_loop_watchdog';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitFor = async (
  predicate: () => boolean,
  { timeoutMs = 10_000, intervalMs = 25 }: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await sleep(intervalMs);
  }
  throw new Error('Timed out waiting for the watchdog to report a block.');
};

/** Synchronously blocks the calling thread's event loop for approximately `ms`. */
const blockEventLoopFor = (ms: number): void => {
  const end = Date.now() + ms;
  // eslint-disable-next-line no-empty
  while (Date.now() < end) {}
};

describe('EventLoopWatchdog (end to end)', () => {
  const config: EventLoopWatchdogConfig = {
    enabled: true,
    threshold_ms: 150,
    heartbeat_interval_ms: 20,
    live_report_interval_ms: 500,
    dedup_window_ms: 60_000,
  };

  let watchdog: EventLoopWatchdog;

  afterEach(() => {
    watchdog?.stop();
  });

  it('detects a real block of the main thread and attributes it to the in-flight task', async () => {
    const logger = mockLogger();
    watchdog = new EventLoopWatchdog({ logger, config, dist: false });
    watchdog.start();

    watchdog.notifyTaskRunStart('blocking-task-id', 'test:blocking-task');

    // Give the worker a moment to spin up and connect its inspector session before the
    // block happens, so the very first heartbeat gap is reliably observed.
    await sleep(200);

    blockEventLoopFor(400);

    // A real task run has several `await`s between its blocking work resolving and the
    // `finally` block that calls `notifyTaskRunEnd` (see `task_runner.ts`), giving the
    // watchdog room to observe the resumed heartbeat and finalize its report first. Mirror
    // that gap here rather than racing the end notification against report finalization.
    await waitFor(() => logger.warn.mock.calls.length > 0);
    watchdog.notifyTaskRunEnd('blocking-task-id');

    const [reportLine] = logger.warn.mock.calls[logger.warn.mock.calls.length - 1] as [string];
    expect(reportLine).toContain('Event loop blocked for');
    expect(reportLine).toContain('test:blocking-task "blocking-task-id"');
  }, 20_000);

  it('does not spawn a worker or report anything when disabled', async () => {
    const logger = mockLogger();
    watchdog = new EventLoopWatchdog({
      logger,
      config: { ...config, enabled: false },
      dist: false,
    });
    watchdog.start();

    expect(watchdog.isEnabled).toBe(false);

    blockEventLoopFor(400);
    await sleep(300);

    expect(logger.warn).not.toHaveBeenCalled();
  }, 20_000);
});
