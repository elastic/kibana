/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventEmitter } from 'node:events';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { Worker } from 'node:worker_threads';
import { EventLoopWatchdog } from './watchdog';
import { CURRENT_TASK_ACCESSOR, type EventLoopBlockReport } from './types';

jest.mock('node:worker_threads', () => ({ Worker: jest.fn() }));

class FakeWorker extends EventEmitter {
  public unref = jest.fn();
  public terminate = jest.fn().mockResolvedValue(0);
}

const config = {
  enabled: true,
  flag_threshold_ms: 5000,
  min_cpu_ratio: 0.5,
  live_report_interval_ms: 3000,
};
const accessorInstalled = () => CURRENT_TASK_ACCESSOR in globalThis;

const report = (
  flag: EventLoopBlockReport['flag'],
  reportable = true,
  bounds = { startedAtUs: 0, endedAtUs: 6_000_000 }
): EventLoopBlockReport => ({
  blockedMs: 6000,
  ...bounds,
  startedAt: 's',
  endedAt: 'e',
  attribution: {
    blockedMs: 6000,
    unsampledMs: 500,
    unsampledPrefixMs: 500,
    unsampledTailMs: 0,
    opaqueMs: 0,
    inferredMs: 0,
    noContextMs: 0,
    samples: 20,
    missingAccessor: false,
    perTask: [],
  },
  cpuRatio: 1,
  flag,
  reportable,
  suppressedBlocks: 0,
});
const flagged: EventLoopBlockReport['flag'] = {
  flagged: true,
  taskId: 'abc',
  taskType: 'sampleTask',
  executionUuid: 'uuid',
  evidence: {
    blockedMs: 6000,
    observedMs: 5400,
    opaqueMs: 0,
    unsampledMs: 500,
    inferredMs: 0,
    samples: 20,
    cpuRatio: 1,
    startedAt: 's',
    endedAt: 'e',
  },
};

describe('EventLoopWatchdog', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let worker: FakeWorker;
  let watchdog: EventLoopWatchdog;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    worker = new FakeWorker();
    (Worker as unknown as jest.Mock).mockReset().mockReturnValue(worker);
  });

  afterEach(() => watchdog?.stop());

  it('does nothing when disabled', () => {
    watchdog = new EventLoopWatchdog({ logger, config: { ...config, enabled: false } });
    watchdog.start();
    expect(watchdog.isEnabled).toBe(false);
    expect(Worker).not.toHaveBeenCalled();
    expect(accessorInstalled()).toBe(false);
  });

  it('starts an unreferenced worker with the shared heartbeat and installs the accessor', () => {
    watchdog = new EventLoopWatchdog({ logger, config });
    watchdog.start();
    expect(watchdog.isEnabled).toBe(true);
    const [file, options] = (Worker as unknown as jest.Mock).mock.calls[0];
    expect(file).toMatch(/worker_entry\.js$/);
    expect(options.workerData).toMatchObject({ flagThresholdMs: 5000, minCpuRatio: 0.5 });
    expect(options.workerData.shared).toBeInstanceOf(SharedArrayBuffer);
    expect(worker.unref).toHaveBeenCalled();
    expect(accessorInstalled()).toBe(true);
  });

  it('limits the worker memory', () => {
    watchdog = new EventLoopWatchdog({ logger, config });
    watchdog.start();
    const [, options] = (Worker as unknown as jest.Mock).mock.calls[0];
    expect(options.resourceLimits).toEqual({
      maxOldGenerationSizeMb: 64,
      maxYoungGenerationSizeMb: 16,
    });
  });

  it('unreferences the worker after attaching its listeners, which would reference it again', () => {
    const on = jest.spyOn(worker, 'on');
    watchdog = new EventLoopWatchdog({ logger, config });
    watchdog.start();
    expect(on).toHaveBeenCalled();
    expect(Math.max(...on.mock.invocationCallOrder)).toBeLessThan(
      worker.unref.mock.invocationCallOrder[0]
    );
  });

  it('disables itself when the worker exits unexpectedly', () => {
    watchdog = new EventLoopWatchdog({ logger, config });
    watchdog.start();
    worker.emit('exit', 1);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('exited with code 1'));
    expect(watchdog.isEnabled).toBe(false);
    expect(accessorInstalled()).toBe(false);
  });

  it('does not report the exit that follows its own stop', () => {
    watchdog = new EventLoopWatchdog({ logger, config });
    watchdog.start();
    watchdog.stop();
    worker.emit('exit', 1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('terminates the worker and removes the accessor when stopped', () => {
    watchdog = new EventLoopWatchdog({ logger, config });
    watchdog.start();
    watchdog.stop();
    expect(worker.terminate).toHaveBeenCalled();
    expect(accessorInstalled()).toBe(false);
    expect(watchdog.isEnabled).toBe(false);
  });

  it('warns naming the task, with evidence, and emits the block when a task is flagged', () => {
    watchdog = new EventLoopWatchdog({ logger, config });
    const received: EventLoopBlockReport[] = [];
    watchdog.blocks$.subscribe((r) => received.push(r));
    watchdog.start();
    worker.emit('message', { type: 'block', report: report(flagged) });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('flagged task sampleTask "abc"'),
      // tags only: structured fields would be indexed on Cloud and can clash with existing mappings
      { tags: ['event-loop-watchdog', 'sampleTask', 'abc'] }
    );
    expect(received).toHaveLength(1);
  });

  it('logs unattributed blocks at info, or debug when rate limited', () => {
    watchdog = new EventLoopWatchdog({ logger, config });
    watchdog.start();
    worker.emit('message', {
      type: 'block',
      report: report({ flagged: false, reason: 'opaque-dominated' }),
    });
    worker.emit('message', {
      type: 'block',
      report: report({ flagged: false, reason: 'opaque-dominated' }, false),
    });
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('not attributed: opaque-dominated')
    );
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('not attributed'));
  });

  it('warns about worker errors', () => {
    watchdog = new EventLoopWatchdog({ logger, config });
    watchdog.start();
    worker.emit('message', { type: 'worker-error', message: 'boom' });
    expect(logger.warn).toHaveBeenCalledWith('Event loop watchdog worker error: boom');
  });

  it('disables itself when the worker fails', () => {
    watchdog = new EventLoopWatchdog({ logger, config });
    watchdog.start();
    worker.emit('error', new Error('crashed'));
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('crashed'));
    expect(watchdog.isEnabled).toBe(false);
    expect(accessorInstalled()).toBe(false);
  });

  describe('beginRun / end', () => {
    const START = 1_000_000;
    let clock: number;
    const create = (ready = true) => {
      watchdog = new EventLoopWatchdog({ logger, config, now: () => clock });
      watchdog.start();
      if (ready) worker.emit('message', { type: 'ready' });
      return watchdog;
    };
    const reportFor = (startedAtUs: number, endedAtUs: number, uuid = 'uuid') =>
      report(
        { ...(flagged as object), executionUuid: uuid } as EventLoopBlockReport['flag'],
        true,
        {
          startedAtUs,
          endedAtUs,
        }
      );

    beforeEach(() => {
      clock = START;
      jest.useFakeTimers();
    });
    afterEach(() => jest.useRealTimers());

    it('observes nothing when disabled', async () => {
      watchdog = new EventLoopWatchdog({ logger, config: { ...config, enabled: false } });
      await expect(watchdog.beginRun('uuid').end()).resolves.toEqual([]);
    });

    it('resolves whenReady once the worker is polling', async () => {
      create(false);
      let ready = false;
      const pending = watchdog.whenReady().then(() => {
        ready = true;
      });
      await Promise.resolve();
      expect(ready).toBe(false);
      worker.emit('message', { type: 'ready' });
      await pending;
      expect(ready).toBe(true);
    });

    it('does not wait for blocks that ended before the worker was polling', async () => {
      const observation = create(false).beginRun('uuid');
      clock += 6_000_000;
      await expect(observation.end()).resolves.toEqual([]);
    });

    it('lets a report that is already queued win over the timeout', async () => {
      const observation = create().beginRun('uuid');
      clock += 6_000_000;
      const pending = observation.end();
      const blockReport = reportFor(START, clock);
      // The timers phase ran first; the worker's message is delivered in the poll phase after it.
      jest.advanceTimersByTime(1000);
      worker.emit('message', { type: 'block', report: blockReport });
      await expect(pending).resolves.toEqual([blockReport]);
    });

    it('resolves immediately when no block overlapped the run', async () => {
      const observation = create().beginRun('uuid');
      clock += 50_000;
      await expect(observation.end()).resolves.toEqual([]);
    });

    it('waits for the report of a block that ended as the run completed', async () => {
      const observation = create().beginRun('uuid');
      clock += 6_000_000;
      const pending = observation.end();
      const blockReport = reportFor(START, clock);
      worker.emit('message', { type: 'block', report: blockReport });
      await expect(pending).resolves.toEqual([blockReport]);
    });

    it('finds a block the heartbeat timer already noticed', async () => {
      const observation = create().beginRun('uuid');
      clock += 6_000_000;
      jest.advanceTimersByTime(50);
      clock += 10_000;
      const pending = observation.end();
      const blockReport = reportFor(START, START + 6_000_000);
      worker.emit('message', { type: 'block', report: blockReport });
      await expect(pending).resolves.toEqual([blockReport]);
    });

    it('does not wait for a report that is already there', async () => {
      const observation = create().beginRun('uuid');
      clock += 6_000_000;
      jest.advanceTimersByTime(50);
      const blockReport = reportFor(START, clock);
      worker.emit('message', { type: 'block', report: blockReport });
      await expect(observation.end()).resolves.toEqual([blockReport]);
    });

    it('does not wait for blocks too short to flag', async () => {
      const observation = create().beginRun('uuid');
      clock += 300_000;
      await expect(observation.end()).resolves.toEqual([]);
    });

    it('ignores blocks that ended before the run started', async () => {
      create();
      clock += 6_000_000;
      const observation = watchdog.beginRun('uuid');
      clock += 10_000;
      await expect(observation.end()).resolves.toEqual([]);
    });

    it('gives up when the report never arrives', async () => {
      const observation = create().beginRun('uuid');
      clock += 6_000_000;
      const pending = observation.end();
      jest.advanceTimersByTime(1000);
      await expect(pending).resolves.toEqual([]);
    });

    it('matches one merged report to every block it contains', async () => {
      const observation = create().beginRun('uuid');
      clock += 6_000_000;
      jest.advanceTimersByTime(50);
      clock += 6_000_000;
      const pending = observation.end();
      const merged = reportFor(START, clock);
      worker.emit('message', { type: 'block', report: merged });
      await expect(pending).resolves.toEqual([merged]);
    });

    it('stops waiting when the watchdog stops', async () => {
      const observation = create().beginRun('uuid');
      clock += 6_000_000;
      const pending = observation.end();
      watchdog.stop();
      await expect(pending).resolves.toEqual([]);
    });
  });
});
