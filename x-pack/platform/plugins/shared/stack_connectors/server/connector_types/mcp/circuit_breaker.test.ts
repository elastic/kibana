/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { clientTypes } from '@kbn/connector-specs/server';
import { McpError, McpErrorCode } from '@kbn/mcp-client';
import {
  getErrorSource,
  isRetryableError,
  TaskErrorSource,
} from '@kbn/task-manager-plugin/server/task_running';
import {
  isConnectionFailure,
  markConnectFailure,
  McpCircuitBreaker,
  mcpCircuitBreaker,
} from './circuit_breaker';

jest.mock('@kbn/connector-specs/server', () => ({
  clientTypes: {
    mcp: {
      id: 'mcp',
      build: jest.fn(),
      terminate: jest.fn(),
      isUserError: jest.fn(),
      shouldInvalidateOnError: jest.fn(),
    },
  },
}));

const mcpClientType = clientTypes.mcp as unknown as {
  isUserError: jest.Mock;
};

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const timeoutError = () => new McpError(McpErrorCode.RequestTimeout, 'timed out');

const tagConnectFailure = async (err: Error): Promise<Error> => {
  await markConnectFailure(Promise.reject(err)).catch((caught) => {
    expect(caught).toBe(err);
  });
  return err;
};

describe('McpCircuitBreaker', () => {
  const logger = loggingSystemMock.createLogger();
  const key = 'connector:mcp:shared:v1';
  const connectorId = 'test-connector-1';

  const ctx = (overrides: { key?: string } = {}) => ({
    key,
    connectorId,
    logger,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mcpClientType.isUserError.mockReturnValue(false);
  });

  it('exports a singleton breaker', () => {
    expect(mcpCircuitBreaker).toBeInstanceOf(McpCircuitBreaker);
  });

  describe('run', () => {
    let clock = 0;
    const coolingMs = 1000;

    const createBreaker = () =>
      new McpCircuitBreaker({ now: () => clock, coolingMs, failureThreshold: 3 });

    const connectError = () => tagConnectFailure(new Error('closed'));

    const failConnect = async (breaker: McpCircuitBreaker, runKey = key) => {
      const err = await connectError();
      await expect(breaker.run(ctx({ key: runKey }), () => Promise.reject(err))).rejects.toBe(err);
    };

    const openBreaker = async (breaker: McpCircuitBreaker, runKey = key) => {
      for (let i = 0; i < 3; i++) {
        await failConnect(breaker, runKey);
      }
    };

    const expectClosed = async (breaker: McpCircuitBreaker, runKey = key) => {
      const fn = jest.fn(() => Promise.resolve('ok'));
      await expect(breaker.run(ctx({ key: runKey }), fn)).resolves.toBe('ok');
      expect(fn).toHaveBeenCalledTimes(1);
    };

    beforeEach(() => {
      clock = 0;
    });

    it('passes through the result and rethrows the original error', async () => {
      const breaker = createBreaker();
      await expect(breaker.run(ctx(), () => Promise.resolve('ok'))).resolves.toBe('ok');

      const err = new Error('boom');
      await expect(breaker.run(ctx(), () => Promise.reject(err))).rejects.toBe(err);
    });

    it('opens after the failure threshold and fails fast', async () => {
      const breaker = createBreaker();
      await openBreaker(breaker);

      const fn = jest.fn(() => Promise.resolve('no'));
      try {
        await breaker.run(ctx(), fn);
        throw new Error('expected run to reject');
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toContain('is unavailable, next attempt in');
        expect(getErrorSource(err as Error)).toBe(TaskErrorSource.FRAMEWORK);
        expect(isRetryableError(err as Error)).toBe(false);
      }

      expect(fn).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('is unavailable'));
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('is unavailable after 3 connection failures')
      );
    });

    it('does not open on untagged errors or request timeouts', async () => {
      const breaker = createBreaker();
      for (let i = 0; i < 3; i++) {
        await expect(breaker.run(ctx(), () => Promise.reject(timeoutError()))).rejects.toThrow(
          'timed out'
        );
        await expect(breaker.run(ctx(), () => Promise.reject(new Error('plain')))).rejects.toThrow(
          'plain'
        );
      }

      await expectClosed(breaker);
    });

    it('stays open before openUntil and runs a real call after', async () => {
      const breaker = createBreaker();
      await openBreaker(breaker);

      clock = coolingMs - 1;
      const earlyFn = jest.fn(() => Promise.resolve('early'));
      await expect(breaker.run(ctx(), earlyFn)).rejects.toThrow('is unavailable');
      expect(earlyFn).not.toHaveBeenCalled();

      clock = coolingMs;
      await expectClosed(breaker);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('is available again'));
    });

    it('re-opens after one more failure once the cooling window ends', async () => {
      const breaker = createBreaker();
      await openBreaker(breaker);

      clock = coolingMs;
      await failConnect(breaker);

      await expect(breaker.run(ctx(), () => Promise.resolve('no'))).rejects.toThrow(
        'next attempt in 1s'
      );
    });

    it('ignores connection failures from calls admitted before the breaker opened', async () => {
      const breaker = createBreaker();
      const gates = [0, 1, 2, 3].map(() => deferred<string>());
      const runs = gates.map((gate) =>
        breaker
          .run(ctx(), () => gate.promise)
          .then(
            () => undefined,
            (err: unknown) => err
          )
      );

      for (const gate of gates.slice(0, 3)) {
        gate.reject(await connectError());
      }
      await Promise.all(runs.slice(0, 3));

      clock = 400;
      gates[3].reject(await connectError());
      await runs[3];

      clock = coolingMs - 1;
      await expect(breaker.run(ctx(), () => Promise.resolve('no'))).rejects.toThrow(
        'next attempt in 1s'
      );
    });

    it('keeps the breaker open when a call admitted before it opened fails with a non-connect error', async () => {
      const breaker = createBreaker();
      const lateGate = deferred<string>();
      const lateRun = breaker.run(ctx(), () => lateGate.promise).catch((err: unknown) => err);

      for (let i = 0; i < 3; i++) {
        await breaker
          .run(ctx(), async () => Promise.reject(await connectError()))
          .catch(() => undefined);
      }

      clock = 400;
      lateGate.reject(timeoutError());
      await lateRun;

      const fn = jest.fn().mockResolvedValue('no');
      await expect(breaker.run(ctx(), fn)).rejects.toThrow('is unavailable');
      expect(fn).not.toHaveBeenCalled();
    });

    it('counts one failed build once when concurrent callers share the same error', async () => {
      const breaker = createBreaker();
      const err = await connectError();
      const results = await Promise.allSettled(
        [0, 1, 2, 3].map(() => breaker.run(ctx(), () => Promise.reject(err)))
      );

      expect(results.map((result) => result.status)).toEqual(Array(4).fill('rejected'));
      await expectClosed(breaker);
    });

    it('does not count user errors and resets an existing failure count', async () => {
      const breaker = createBreaker();
      await failConnect(breaker);
      await failConnect(breaker);

      mcpClientType.isUserError.mockReturnValue(true);
      await expect(
        breaker.run(ctx(), () => Promise.reject(new Error('unauthorized')))
      ).rejects.toThrow('unauthorized');

      mcpClientType.isUserError.mockReturnValue(false);
      await failConnect(breaker);
      await failConnect(breaker);

      await expectClosed(breaker);
    });

    it('resets an existing failure count on non-connection errors', async () => {
      const breaker = createBreaker();
      await failConnect(breaker);
      await expect(
        breaker.run(ctx(), () => Promise.reject(new Error('tool failed')))
      ).rejects.toThrow('tool failed');
      await failConnect(breaker);
      await failConnect(breaker);

      await expectClosed(breaker);
    });

    it('keeps other keys closed when one key is open', async () => {
      const breaker = createBreaker();
      await openBreaker(breaker, 'key-a');

      await expectClosed(breaker, 'key-b');
      await expect(breaker.run(ctx({ key: 'key-a' }), () => Promise.resolve('no'))).rejects.toThrow(
        'is unavailable'
      );
    });

    it('clear() closes an open breaker', async () => {
      const breaker = createBreaker();
      await openBreaker(breaker);

      breaker.clear();
      await expectClosed(breaker);
    });
  });

  describe('isConnectionFailure', () => {
    it('returns true for an error tagged by markConnectFailure', async () => {
      const err = await tagConnectFailure(new Error('connect failed'));
      expect(isConnectionFailure(err)).toBe(true);
    });

    it('returns false for untagged errors and request timeouts', () => {
      expect(isConnectionFailure(new Error('tool failed'))).toBe(false);
      expect(isConnectionFailure(timeoutError())).toBe(false);
    });

    it('returns false for a tagged error when isUserError is true', async () => {
      mcpClientType.isUserError.mockReturnValue(true);
      const tagged = await tagConnectFailure(new Error('connect failed'));
      expect(isConnectionFailure(tagged)).toBe(false);
    });

    it('rethrows the same object and passes through resolved values', async () => {
      await expect(markConnectFailure(Promise.resolve('ok'))).resolves.toBe('ok');
      const err = new Error('same');
      await expect(markConnectFailure(Promise.reject(err))).rejects.toBe(err);
    });
  });
});
