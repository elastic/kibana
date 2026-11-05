/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  getErrorSource,
  isRetryableError,
  TaskErrorSource,
} from '@kbn/task-manager-plugin/server/task_running';
import { McpExecutionGuard, mcpExecutionGuard } from './execution_guard';

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('McpExecutionGuard', () => {
  const logger = loggingSystemMock.createLogger();
  const key = 'connector:mcp:shared:v1';
  const connectorId = 'test-connector-1';

  const ctx = (overrides: { key?: string } = {}) => ({
    key,
    connectorId,
    logger,
    ...overrides,
  });

  describe('in-flight cap', () => {
    it('rejects the call above the cap without calling fn', async () => {
      const limit = 2;
      const guard = new McpExecutionGuard({ maxInFlight: limit });
      const gate = deferred<string>();
      const fn = jest.fn(() => gate.promise);
      const rejectedFn = jest.fn(() => Promise.resolve('nope'));

      const first = guard.run(ctx(), fn);
      const second = guard.run(ctx(), fn);

      expect(guard.getInFlight(key)).toBe(limit);

      try {
        await guard.run(ctx(), rejectedFn);
        throw new Error('expected run to reject');
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toContain('Too many in-flight requests');
        expect((err as Error).message).toContain(`(limit ${limit})`);
        expect(getErrorSource(err as Error)).toBe(TaskErrorSource.FRAMEWORK);
        expect(isRetryableError(err as Error)).toBe(false);
      }

      expect(rejectedFn).not.toHaveBeenCalled();
      expect(fn).toHaveBeenCalledTimes(limit);
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Too many in-flight requests')
      );

      gate.resolve('ok');
      await expect(first).resolves.toBe('ok');
      await expect(second).resolves.toBe('ok');
    });

    it('releases the slot after success so the next run is admitted', async () => {
      const guard = new McpExecutionGuard({ maxInFlight: 1 });
      const gate = deferred<string>();
      const blocked = guard.run(ctx(), () => gate.promise);

      expect(guard.getInFlight(key)).toBe(1);

      gate.resolve('done');
      await expect(blocked).resolves.toBe('done');
      expect(guard.getInFlight(key)).toBe(0);

      await expect(guard.run(ctx(), () => Promise.resolve('next'))).resolves.toBe('next');
    });

    it('releases the slot when fn rejects', async () => {
      const guard = new McpExecutionGuard({ maxInFlight: 1 });

      await expect(guard.run(ctx(), () => Promise.reject(new Error('boom')))).rejects.toThrow(
        'boom'
      );
      expect(guard.getInFlight(key)).toBe(0);

      await expect(guard.run(ctx(), () => Promise.resolve('ok'))).resolves.toBe('ok');
    });

    it('counts each key independently', async () => {
      const guard = new McpExecutionGuard({ maxInFlight: 1 });
      const gate = deferred<string>();
      const blocked = guard.run(ctx({ key: 'key-a' }), () => gate.promise);

      await expect(guard.run(ctx({ key: 'key-a' }), () => Promise.resolve('no'))).rejects.toThrow(
        'Too many in-flight requests'
      );

      await expect(guard.run(ctx({ key: 'key-b' }), () => Promise.resolve('yes'))).resolves.toBe(
        'yes'
      );

      gate.resolve('done');
      await blocked;
    });

    it('clear() resets in-flight counts', async () => {
      const guard = new McpExecutionGuard({ maxInFlight: 1 });
      const gate = deferred<string>();
      const blocked = guard.run(ctx(), () => gate.promise);

      expect(guard.getInFlight(key)).toBe(1);
      guard.clear();
      expect(guard.getInFlight(key)).toBe(0);

      await expect(guard.run(ctx(), () => Promise.resolve('ok'))).resolves.toBe('ok');

      gate.resolve('done');
      await blocked;
      expect(guard.getInFlight(key)).toBe(0);
    });

    it('exports a singleton guard', () => {
      expect(mcpExecutionGuard).toBeInstanceOf(McpExecutionGuard);
    });
  });
});
