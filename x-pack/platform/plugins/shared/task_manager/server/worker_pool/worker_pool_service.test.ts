/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventEmitter } from 'events';
import moment from 'moment';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { WorkerPoolService } from './worker_pool_service';
import { WorkerPoolAtCapacityError, WorkerMemoryBudgetExceededError } from './errors';
import type { WorkerProcessesConfig } from '../config';

class FakeChildProcess extends EventEmitter {
  public pid = 4242;
  public killed = false;
  public sentMessages: unknown[] = [];
  public killSignal?: string;

  send(message: unknown) {
    this.sentMessages.push(message);
    return true;
  }

  kill(signal?: string) {
    this.killed = true;
    this.killSignal = signal;
    // Mimics a real child process: kill() requests termination, the 'exit' event follows
    // asynchronously once the OS has actually reaped the process.
    setImmediate(() => this.emit('exit', null, signal ?? 'SIGKILL'));
    return true;
  }
}

let lastChild: FakeChildProcess;
const mockFork = jest.fn((..._args: unknown[]) => {
  lastChild = new FakeChildProcess();
  return lastChild;
});

jest.mock('child_process', () => ({
  ...jest.requireActual('child_process'),
  fork: (...args: [string, string[], unknown]) => mockFork(...args),
}));

const mockCgroupState: {
  capability: { supported: true } | { supported: false; reason: string };
} = {
  capability: { supported: false, reason: 'cgroups disabled in test' },
};
const mockCreateChildCgroup = jest.fn();
const mockCgroupSetup = jest.fn();

jest.mock('./cgroup_enforcer', () => ({
  CgroupEnforcer: jest.fn().mockImplementation(() => ({
    setup: mockCgroupSetup,
    get capability() {
      return mockCgroupState.capability;
    },
    createChildCgroup: mockCreateChildCgroup,
  })),
}));

const logger = loggingSystemMock.createLogger();

const baseConfig: WorkerProcessesConfig = {
  enabled: true,
  max_processes: 2,
  max_total_memory_mb: 100,
  baseline_memory_mb: 10,
  enforcement: 'best_effort',
  max_cpu_percent: undefined,
  idle_timeout: moment.duration(30, 'seconds'),
};

/** Advances the fake child through `ready` and returns once it has sent `go`. */
function driveToGo(child: FakeChildProcess) {
  child.emit('message', { type: 'ready' });
}

describe('WorkerPoolService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCgroupState.capability = { supported: false, reason: 'cgroups disabled in test' };
  });

  describe('disabled', () => {
    it('is not enabled and never has capacity when the feature flag is off', () => {
      const service = new WorkerPoolService({ ...baseConfig, enabled: false }, logger);
      service.start();

      expect(service.enabled).toBe(false);
      expect(service.hasCapacityFor(1)).toBe(false);
    });

    it('rejects run() when disabled', async () => {
      const service = new WorkerPoolService({ ...baseConfig, enabled: false }, logger);
      service.start();

      await expect(service.run('mod', {}, { memoryMb: 1 })).rejects.toThrow(
        'Task manager worker pool is not enabled'
      );
    });
  });

  describe('strict enforcement without cgroups', () => {
    it('disables the pool and excludes it from capacity checks', () => {
      const service = new WorkerPoolService({ ...baseConfig, enforcement: 'strict' }, logger);
      service.start();

      expect(service.enabled).toBe(false);
      expect(service.hasCapacityFor(1)).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('enforcement is "strict"'));
    });
  });

  describe('enabled, fallback mode (no cgroups)', () => {
    it('runs a task in a forked child and releases its memory reservation (declared + baseline)', async () => {
      const service = new WorkerPoolService(baseConfig, logger);
      service.start();

      expect(service.hasCapacityFor(90)).toBe(true); // 90 + baseline(10) === 100
      expect(service.hasCapacityFor(91)).toBe(false);

      const runPromise = service.run('/mod.js', { a: 1 }, { memoryMb: 40 });

      // 40 + baseline(10) reserved while in flight
      expect(service.availableMemoryMb).toBe(50);

      driveToGo(lastChild);
      expect(lastChild.sentMessages).toEqual([
        { type: 'go', moduleId: '/mod.js', input: { a: 1 } },
      ]);

      lastChild.emit('message', { type: 'result', result: { state: {} } });

      await expect(runPromise).resolves.toEqual({ state: {} });
      expect(service.availableMemoryMb).toBe(100);
    });

    it('sizes the child heap cap to declared memoryMb + baseline_memory_mb', async () => {
      const service = new WorkerPoolService(baseConfig, logger);
      service.start();

      const runPromise = service.run('/mod.js', {}, { memoryMb: 50 });
      driveToGo(lastChild);
      lastChild.emit('message', { type: 'result', result: {} });
      await runPromise;

      expect(mockFork).toHaveBeenCalledWith(
        expect.stringContaining('task_process_wrapper.js'),
        [],
        expect.objectContaining({ execArgv: ['--max-old-space-size=60'] })
      );
    });

    it('rejects with WorkerPoolAtCapacityError without forking when the budget does not fit', async () => {
      const service = new WorkerPoolService(baseConfig, logger);
      service.start();

      await expect(service.run('/mod.js', {}, { memoryMb: 95 })).rejects.toThrow(
        WorkerPoolAtCapacityError
      );
      expect(mockFork).not.toHaveBeenCalled();
    });

    it('releases the memory reservation even when the run rejects', async () => {
      const service = new WorkerPoolService(baseConfig, logger);
      service.start();

      const runPromise = service.run('/mod.js', {}, { memoryMb: 60 });
      driveToGo(lastChild);
      lastChild.emit('message', { type: 'error', error: { message: 'boom' } });

      await expect(runPromise).rejects.toThrow('boom');
      expect(service.availableMemoryMb).toBe(100);
    });

    it('aborts a run via the passed-in signal and kills the child', async () => {
      const service = new WorkerPoolService(baseConfig, logger);
      service.start();

      const controller = new AbortController();
      const runPromise = service.run('/mod.js', {}, { memoryMb: 10, signal: controller.signal });
      driveToGo(lastChild);
      controller.abort();

      await expect(runPromise).rejects.toMatchObject({ name: 'AbortError' });
      expect(lastChild.killed).toBe(true);
      expect(lastChild.killSignal).toBe('SIGKILL');
      // the reservation is released even on abort
      expect(service.availableMemoryMb).toBe(100);
    });

    it('rejects when the child exits without a result (e.g. a V8 heap-cap OOM)', async () => {
      const service = new WorkerPoolService(baseConfig, logger);
      service.start();

      const runPromise = service.run('/mod.js', {}, { memoryMb: 10 });
      driveToGo(lastChild);
      lastChild.emit('exit', null, 'SIGKILL');

      await expect(runPromise).rejects.toThrow(/killed/);
    });

    it('does not kill the child on observed RSS overrun, only logs a warning', async () => {
      const service = new WorkerPoolService(baseConfig, logger);
      service.start();

      const runPromise = service.run('/mod.js', {}, { memoryMb: 10 });
      driveToGo(lastChild);
      lastChild.emit('message', {
        type: 'memoryUsage',
        rss: 1024 * 1024 * 1024, // wildly over budget
        heapUsed: 1024 * 1024,
        external: 0,
      });

      expect(lastChild.killed).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('exceeded its declared memory budget')
      );

      lastChild.emit('message', { type: 'result', result: {} });
      await runPromise;
    });

    it('stop() kills all active children', async () => {
      const service = new WorkerPoolService(baseConfig, logger);
      service.start();

      const runPromise = service.run('/mod.js', {}, { memoryMb: 10 }).catch(() => {});
      driveToGo(lastChild);

      await service.stop();

      expect(lastChild.killed).toBe(true);
      await runPromise;
    });
  });

  describe('enabled, cgroups available', () => {
    beforeEach(() => {
      mockCgroupState.capability = { supported: true };
    });

    it('places the child into a dedicated cgroup sized to declared + baseline before sending go', async () => {
      const placeSpy = jest.fn();
      const cleanupSpy = jest.fn();
      mockCreateChildCgroup.mockReturnValue({
        id: 'child-1',
        dirPath: '/sys/fs/cgroup/.../child-1',
        place: placeSpy,
        readOomKillCount: () => 0,
        cleanup: cleanupSpy,
      });

      const service = new WorkerPoolService(baseConfig, logger);
      service.start();

      const runPromise = service.run('/mod.js', {}, { memoryMb: 40 });
      driveToGo(lastChild);

      expect(mockCreateChildCgroup).toHaveBeenCalledWith(50, undefined);
      expect(placeSpy).toHaveBeenCalledWith(lastChild.pid);
      expect(lastChild.sentMessages).toEqual([{ type: 'go', moduleId: '/mod.js', input: {} }]);

      lastChild.emit('message', { type: 'result', result: {} });
      await runPromise;

      expect(cleanupSpy).toHaveBeenCalled();
    });

    it('surfaces a WorkerMemoryBudgetExceededError when the cgroup reports a kernel OOM kill', async () => {
      mockCreateChildCgroup.mockReturnValue({
        id: 'child-1',
        dirPath: '/sys/fs/cgroup/.../child-1',
        place: jest.fn(),
        readOomKillCount: () => 1,
        cleanup: jest.fn(),
      });

      const service = new WorkerPoolService(baseConfig, logger);
      service.start();

      const runPromise = service.run('/mod.js', {}, { memoryMb: 10 });
      driveToGo(lastChild);
      lastChild.emit('exit', null, 'SIGKILL');

      await expect(runPromise).rejects.toThrow(WorkerMemoryBudgetExceededError);
    });

    it('passes max_cpu_percent through to the cgroup', async () => {
      mockCreateChildCgroup.mockReturnValue({
        id: 'child-1',
        dirPath: '/x',
        place: jest.fn(),
        readOomKillCount: () => 0,
        cleanup: jest.fn(),
      });

      const service = new WorkerPoolService({ ...baseConfig, max_cpu_percent: 150 }, logger);
      service.start();

      const runPromise = service.run('/mod.js', {}, { memoryMb: 10 });
      driveToGo(lastChild);
      expect(mockCreateChildCgroup).toHaveBeenCalledWith(20, 150);

      lastChild.emit('message', { type: 'result', result: {} });
      await runPromise;
    });
  });
});
