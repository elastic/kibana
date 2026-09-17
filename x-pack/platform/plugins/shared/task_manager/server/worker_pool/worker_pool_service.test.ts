/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { WorkerPoolService } from './worker_pool_service';
import { WorkerPoolAtCapacityError } from './errors';
import type { WorkerThreadsConfig } from '../config';

const mockPiscinaRun = jest.fn();
const mockPiscinaDestroy = jest.fn().mockResolvedValue(undefined);

jest.mock('piscina', () => {
  return jest.fn().mockImplementation(() => ({
    run: mockPiscinaRun,
    destroy: mockPiscinaDestroy,
  }));
});

const logger = loggingSystemMock.createLogger();

const baseConfig: WorkerThreadsConfig = {
  enabled: true,
  max_threads: 2,
  max_total_memory_mb: 100,
  max_task_heap_mb: 50,
  idle_timeout: moment.duration(30, 'seconds'),
};

describe('WorkerPoolService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  describe('enabled', () => {
    it('runs a task through the underlying pool and releases its memory reservation', async () => {
      mockPiscinaRun.mockResolvedValue({ state: {} });
      const service = new WorkerPoolService(baseConfig, logger);
      service.start();

      expect(service.hasCapacityFor(100)).toBe(true);

      const result = await service.run('/mod.js', { a: 1 }, { memoryMb: 40 });

      expect(result).toEqual({ state: {} });
      expect(mockPiscinaRun).toHaveBeenCalledWith(
        { moduleId: '/mod.js', input: { a: 1 } },
        undefined
      );
      // reservation released after the run settles
      expect(service.availableMemoryMb).toBe(100);
    });

    it('passes the abort signal through to piscina when provided', async () => {
      mockPiscinaRun.mockResolvedValue({ state: {} });
      const service = new WorkerPoolService(baseConfig, logger);
      service.start();

      const controller = new AbortController();
      await service.run('/mod.js', {}, { memoryMb: 10, signal: controller.signal });

      expect(mockPiscinaRun).toHaveBeenCalledWith(
        { moduleId: '/mod.js', input: {} },
        { signal: controller.signal }
      );
    });

    it('reserves memory for the duration of an in-flight run', async () => {
      let resolveRun: (value: unknown) => void = () => {};
      mockPiscinaRun.mockReturnValue(
        new Promise((resolve) => {
          resolveRun = resolve;
        })
      );
      const service = new WorkerPoolService(baseConfig, logger);
      service.start();

      const runPromise = service.run('/mod.js', {}, { memoryMb: 70 });

      expect(service.availableMemoryMb).toBe(30);
      expect(service.hasCapacityFor(40)).toBe(false);
      expect(service.hasCapacityFor(30)).toBe(true);

      resolveRun({ state: {} });
      await runPromise;

      expect(service.availableMemoryMb).toBe(100);
    });

    it('rejects with WorkerPoolAtCapacityError without calling the pool when the budget does not fit', async () => {
      const service = new WorkerPoolService(baseConfig, logger);
      service.start();

      await expect(service.run('/mod.js', {}, { memoryMb: 200 })).rejects.toThrow(
        WorkerPoolAtCapacityError
      );
      expect(mockPiscinaRun).not.toHaveBeenCalled();
    });

    it('releases the memory reservation even when the run rejects', async () => {
      mockPiscinaRun.mockRejectedValue(new Error('boom'));
      const service = new WorkerPoolService(baseConfig, logger);
      service.start();

      await expect(service.run('/mod.js', {}, { memoryMb: 60 })).rejects.toThrow('boom');
      expect(service.availableMemoryMb).toBe(100);
    });

    it('recreates the pool after an aborted run', async () => {
      const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' });
      mockPiscinaRun.mockRejectedValueOnce(abortError);
      const service = new WorkerPoolService(baseConfig, logger);
      service.start();

      await expect(service.run('/mod.js', {}, { memoryMb: 10 })).rejects.toThrow('aborted');
      expect(mockPiscinaDestroy).toHaveBeenCalledTimes(1);

      // the pool was recreated, so a subsequent run still works
      mockPiscinaRun.mockResolvedValueOnce({ state: {} });
      await expect(service.run('/mod.js', {}, { memoryMb: 10 })).resolves.toEqual({ state: {} });
    });

    it('hasCapacityFor reflects the remaining budget', () => {
      const service = new WorkerPoolService(baseConfig, logger);
      service.start();

      expect(service.hasCapacityFor(100)).toBe(true);
      expect(service.hasCapacityFor(101)).toBe(false);
    });

    it('stop() destroys the underlying pool', async () => {
      const service = new WorkerPoolService(baseConfig, logger);
      service.start();

      await service.stop();

      expect(mockPiscinaDestroy).toHaveBeenCalledTimes(1);
    });
  });
});
