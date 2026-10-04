/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventEmitter } from 'node:events';
import { Worker } from 'node:worker_threads';
import { mockLogger } from '../test_utils';
import type { EventLoopWatchdogConfig } from '../config';
import type { WorkerToMainMessage } from './types';
import { EventLoopWatchdog } from './watchdog';

jest.mock('node:worker_threads', () => ({ Worker: jest.fn() }));

class FakeWorker extends EventEmitter {
  public terminated = false;
  public unrefed = false;
  public posted: unknown[] = [];

  postMessage(message: unknown) {
    this.posted.push(message);
  }

  unref() {
    this.unrefed = true;
  }

  terminate() {
    this.terminated = true;
    return Promise.resolve(0);
  }

  emitMessage(message: WorkerToMainMessage) {
    this.emit('message', message);
  }
}

let lastCreatedWorker: FakeWorker | undefined;

const WorkerMock = Worker as unknown as jest.Mock;
WorkerMock.mockImplementation(() => {
  lastCreatedWorker = new FakeWorker();
  return lastCreatedWorker;
});

const baseConfig: EventLoopWatchdogConfig = {
  enabled: true,
  threshold_ms: 500,
  heartbeat_interval_ms: 100,
  live_report_interval_ms: 3000,
  dedup_window_ms: 300000,
};

describe('EventLoopWatchdog', () => {
  beforeEach(() => {
    lastCreatedWorker = undefined;
    WorkerMock.mockClear();
  });

  test('does nothing when disabled in config', () => {
    const logger = mockLogger();
    const watchdog = new EventLoopWatchdog({
      logger,
      config: { ...baseConfig, enabled: false },
      dist: false,
    });

    watchdog.start();

    expect(watchdog.isEnabled).toBe(false);
    expect(WorkerMock).not.toHaveBeenCalled();
  });

  test('spawns an unref-ed worker and logs on start', () => {
    const logger = mockLogger();
    const watchdog = new EventLoopWatchdog({ logger, config: baseConfig, dist: false });

    watchdog.start();

    expect(watchdog.isEnabled).toBe(true);
    expect(WorkerMock).toHaveBeenCalledTimes(1);
    expect(lastCreatedWorker!.unrefed).toBe(true);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Enabled'));

    watchdog.stop();
  });

  test('is a no-op to start twice', () => {
    const logger = mockLogger();
    const watchdog = new EventLoopWatchdog({ logger, config: baseConfig, dist: false });

    watchdog.start();
    watchdog.start();

    expect(WorkerMock).toHaveBeenCalledTimes(1);
    watchdog.stop();
  });

  test('forwards run start/end notifications to the worker', () => {
    const logger = mockLogger();
    const watchdog = new EventLoopWatchdog({ logger, config: baseConfig, dist: false });
    watchdog.start();

    watchdog.notifyTaskRunStart('task-a', 'alerting:rule');
    watchdog.notifyTaskRunEnd('task-a');

    expect(lastCreatedWorker!.posted).toEqual([
      {
        type: 'run-start',
        taskId: 'task-a',
        taskType: 'alerting:rule',
        startedAt: expect.any(Number),
      },
      { type: 'run-end', taskId: 'task-a' },
    ]);

    watchdog.stop();
  });

  test('notifications before start (or after stop) are safely ignored', () => {
    const logger = mockLogger();
    const watchdog = new EventLoopWatchdog({ logger, config: baseConfig, dist: false });

    expect(() => watchdog.notifyTaskRunStart('task-a', 'alerting:rule')).not.toThrow();
    expect(() => watchdog.notifyTaskRunEnd('task-a')).not.toThrow();

    watchdog.start();
    watchdog.stop();
    expect(() => watchdog.notifyTaskRunStart('task-a', 'alerting:rule')).not.toThrow();
    expect(lastCreatedWorker!.terminated).toBe(true);
  });

  test('logs a warning when the worker reports a block', () => {
    const logger = mockLogger();
    const watchdog = new EventLoopWatchdog({ logger, config: baseConfig, dist: false });
    watchdog.start();

    lastCreatedWorker!.emitMessage({
      type: 'report',
      report: {
        blockedMs: 750,
        startedAt: 1,
        endedAt: 751,
        suspects: [{ taskId: 'task-a', taskType: 'alerting:rule', inFlightMs: 700 }],
        topFrames: [],
        gcDominant: false,
        likelyUnsampled: false,
        sampledCoverage: 0.9,
        suppressedCount: 0,
      },
    });

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('blocked for 750ms'));

    watchdog.stop();
  });

  test('logs worker errors visibly (warn) and disables on a worker crash', () => {
    const logger = mockLogger();
    const watchdog = new EventLoopWatchdog({ logger, config: baseConfig, dist: false });
    watchdog.start();

    lastCreatedWorker!.emitMessage({ type: 'worker-error', message: 'boom' });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('boom'));

    lastCreatedWorker!.emit('error', new Error('worker died'));
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('worker died'));
    expect(watchdog.isEnabled).toBe(false);
  });
});
