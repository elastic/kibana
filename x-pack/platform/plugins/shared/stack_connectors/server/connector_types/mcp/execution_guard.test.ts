/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { clientTypes } from '@kbn/connector-specs/server';
import { McpError, McpErrorCode, McpNotConnectedError, StreamableHTTPError } from '@kbn/mcp-client';
import {
  getErrorSource,
  isRetryableError,
  TaskErrorSource,
} from '@kbn/task-manager-plugin/server/task_running';
import {
  isConnectionFailure,
  markConnectFailure,
  McpExecutionGuard,
  mcpExecutionGuard,
} from './execution_guard';

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
  shouldInvalidateOnError: jest.Mock;
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

const transportError = () => {
  const err = new Error('transport');
  err.name = 'McpConnectionTransportError';
  return err;
};

const httpError = (httpStatus: number) => {
  const err = new Error('http') as Error & { httpStatus: number };
  err.name = 'McpConnectionHttpError';
  err.httpStatus = httpStatus;
  return err;
};

const tagConnectFailure = async (err: Error): Promise<Error> => {
  await markConnectFailure(Promise.reject(err)).catch((caught) => {
    expect(caught).toBe(err);
  });
  return err;
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

  beforeEach(() => {
    jest.clearAllMocks();
    mcpClientType.isUserError.mockReturnValue(false);
    mcpClientType.shouldInvalidateOnError.mockReturnValue(false);
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

  describe('circuit breaker', () => {
    let clock = 0;
    const baseCoolingMs = 1000;
    const maxCoolingMs = 4000;

    const createGuard = () =>
      new McpExecutionGuard({
        now: () => clock,
        baseCoolingMs,
        maxCoolingMs,
        failureThreshold: 3,
      });

    const openBreaker = async (guard: McpExecutionGuard, runKey = key) => {
      for (let i = 0; i < 3; i++) {
        await expect(
          guard.run(ctx({ key: runKey }), () => Promise.reject(timeoutError()))
        ).rejects.toThrow('timed out');
      }
    };

    beforeEach(() => {
      clock = 0;
    });

    it('opens after the failure threshold and fails fast', async () => {
      const guard = createGuard();
      await openBreaker(guard);

      const fn = jest.fn(() => Promise.resolve('no'));
      try {
        await guard.run(ctx(), fn);
        throw new Error('expected run to reject');
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toContain('is unavailable, next attempt in');
        expect(getErrorSource(err as Error)).toBe(TaskErrorSource.FRAMEWORK);
        expect(isRetryableError(err as Error)).toBe(false);
      }

      expect(fn).not.toHaveBeenCalled();
      expect(guard.getBreakerState(key)).toBe('open');
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('is unavailable'));
      expect(logger.warn).toHaveBeenCalled();
    });

    it.each([
      ['request timeout', async () => timeoutError()],
      ['tagged connect error', () => tagConnectFailure(new Error('connect failed'))],
      ['transport error name', async () => transportError()],
      ['streamable http 503', async () => new StreamableHTTPError(503, 'unavailable')],
    ])('opens after connection failures shaped as %s', async (_label, buildErr) => {
      const guard = createGuard();
      for (let i = 0; i < 3; i++) {
        const err = await buildErr();
        await expect(guard.run(ctx(), () => Promise.reject(err))).rejects.toBe(err);
      }

      const fn = jest.fn(() => Promise.resolve('no'));
      await expect(guard.run(ctx(), fn)).rejects.toThrow('is unavailable, next attempt in');
      expect(fn).not.toHaveBeenCalled();
    });

    it('stays open before openUntil and admits one probe at openUntil', async () => {
      const guard = createGuard();
      await openBreaker(guard);

      clock = baseCoolingMs - 1;
      const earlyFn = jest.fn(() => Promise.resolve('early'));
      await expect(guard.run(ctx(), earlyFn)).rejects.toThrow('is unavailable');
      expect(earlyFn).not.toHaveBeenCalled();
      expect(guard.getBreakerState(key)).toBe('open');

      clock = baseCoolingMs;
      const probeGate = deferred<string>();
      const probeFn = jest.fn(() => probeGate.promise);
      const probe = guard.run(ctx(), probeFn);
      const secondFn = jest.fn(() => Promise.resolve('second'));

      await expect(guard.run(ctx(), secondFn)).rejects.toThrow(
        'is unavailable, next attempt in 0s'
      );
      expect(secondFn).not.toHaveBeenCalled();
      expect(probeFn).toHaveBeenCalledTimes(1);
      expect(guard.getBreakerState(key)).toBe('half-open');

      probeGate.resolve('probed');
      await expect(probe).resolves.toBe('probed');
      expect(guard.getBreakerState(key)).toBe('closed');
    });

    it('needs a full threshold of new failures after a successful probe', async () => {
      const guard = createGuard();
      await openBreaker(guard);

      clock = baseCoolingMs;
      await expect(guard.run(ctx(), () => Promise.resolve('probed'))).resolves.toBe('probed');
      expect(guard.getBreakerState(key)).toBe('closed');

      const failFn = jest.fn(() => Promise.reject(timeoutError()));
      await expect(guard.run(ctx(), failFn)).rejects.toThrow('timed out');
      await expect(guard.run(ctx(), failFn)).rejects.toThrow('timed out');
      await expect(guard.run(ctx(), failFn)).rejects.toThrow('timed out');
      expect(failFn).toHaveBeenCalledTimes(3);

      const blockedFn = jest.fn(() => Promise.resolve('no'));
      await expect(guard.run(ctx(), blockedFn)).rejects.toThrow('is unavailable');
      expect(blockedFn).not.toHaveBeenCalled();
    });

    it('doubles cooling on probe failure up to the max', async () => {
      const guard = createGuard();
      await openBreaker(guard);

      clock = baseCoolingMs;
      await expect(guard.run(ctx(), () => Promise.reject(timeoutError()))).rejects.toThrow(
        'timed out'
      );
      await expect(guard.run(ctx(), () => Promise.resolve('no'))).rejects.toThrow(
        'next attempt in 2s'
      );

      clock = baseCoolingMs + 2000;
      await expect(guard.run(ctx(), () => Promise.reject(timeoutError()))).rejects.toThrow(
        'timed out'
      );
      await expect(guard.run(ctx(), () => Promise.resolve('no'))).rejects.toThrow(
        'next attempt in 4s'
      );

      clock = baseCoolingMs + 2000 + maxCoolingMs;
      await expect(guard.run(ctx(), () => Promise.reject(timeoutError()))).rejects.toThrow(
        'timed out'
      );
      await expect(guard.run(ctx(), () => Promise.resolve('no'))).rejects.toThrow(
        'next attempt in 4s'
      );
    });

    it('ignores connection failures from calls admitted before the breaker opened', async () => {
      const guard = createGuard();
      const gates = [0, 1, 2, 3].map(() => deferred<string>());
      const runs = gates.map((gate) =>
        guard
          .run(ctx(), () => gate.promise)
          .then(
            () => undefined,
            (err: unknown) => err
          )
      );

      gates[0].reject(timeoutError());
      gates[1].reject(timeoutError());
      gates[2].reject(timeoutError());
      await Promise.all(runs.slice(0, 3));

      await expect(guard.run(ctx(), () => Promise.resolve('no'))).rejects.toThrow(
        'next attempt in 1s'
      );

      gates[3].reject(timeoutError());
      await runs[3];

      await expect(guard.run(ctx(), () => Promise.resolve('no'))).rejects.toThrow(
        'next attempt in 1s'
      );
    });

    it('does not count user errors and resets an existing failure count', async () => {
      const guard = createGuard();
      await expect(guard.run(ctx(), () => Promise.reject(timeoutError()))).rejects.toThrow(
        'timed out'
      );
      await expect(guard.run(ctx(), () => Promise.reject(timeoutError()))).rejects.toThrow(
        'timed out'
      );

      mcpClientType.isUserError.mockReturnValue(true);
      await expect(
        guard.run(ctx(), () => Promise.reject(new Error('unauthorized')))
      ).rejects.toThrow('unauthorized');

      mcpClientType.isUserError.mockReturnValue(false);
      await expect(guard.run(ctx(), () => Promise.reject(timeoutError()))).rejects.toThrow(
        'timed out'
      );
      await expect(guard.run(ctx(), () => Promise.reject(timeoutError()))).rejects.toThrow(
        'timed out'
      );

      const next = jest.fn(() => Promise.resolve('ok'));
      await expect(guard.run(ctx(), next)).resolves.toBe('ok');
      expect(next).toHaveBeenCalledTimes(1);
      expect(guard.getBreakerState(key)).toBe('closed');
    });

    it('does not count tool errors and resets an existing failure count', async () => {
      const guard = createGuard();
      await expect(guard.run(ctx(), () => Promise.reject(timeoutError()))).rejects.toThrow(
        'timed out'
      );

      await expect(
        guard.run(ctx(), () => Promise.reject(new Error('tool failed')))
      ).rejects.toThrow('tool failed');

      const next = jest.fn(() => Promise.resolve('ok'));
      await expect(guard.run(ctx(), () => Promise.reject(timeoutError()))).rejects.toThrow(
        'timed out'
      );
      await expect(guard.run(ctx(), () => Promise.reject(timeoutError()))).rejects.toThrow(
        'timed out'
      );
      await expect(guard.run(ctx(), next)).resolves.toBe('ok');
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('closes when the probe fails with a tool error', async () => {
      const guard = createGuard();
      await openBreaker(guard);

      clock = baseCoolingMs;
      await expect(
        guard.run(ctx(), () => Promise.reject(new Error('tool failed')))
      ).rejects.toThrow('tool failed');
      expect(guard.getBreakerState(key)).toBe('closed');
    });

    it('keeps other keys closed when one key is open', async () => {
      const guard = createGuard();
      await openBreaker(guard, 'key-a');

      await expect(guard.run(ctx({ key: 'key-b' }), () => Promise.resolve('ok'))).resolves.toBe(
        'ok'
      );
      expect(guard.getBreakerState('key-a')).toBe('open');
      expect(guard.getBreakerState('key-b')).toBe('closed');
    });

    it('clear() closes an open breaker', async () => {
      const guard = createGuard();
      await openBreaker(guard);

      guard.clear();
      expect(guard.getBreakerState(key)).toBe('closed');
      await expect(guard.run(ctx(), () => Promise.resolve('ok'))).resolves.toBe('ok');
    });
  });

  describe('isConnectionFailure', () => {
    it.each([
      ['request timeout', () => new McpError(McpErrorCode.RequestTimeout, 'timed out')],
      ['connection closed', () => new McpError(McpErrorCode.ConnectionClosed, 'closed')],
      ['not connected', () => new McpNotConnectedError('server', '1.0.0')],
      ['streamable http 503', () => new StreamableHTTPError(503, 'unavailable')],
      ['transport error name', () => transportError()],
      ['http 502 name', () => httpError(502)],
    ])('returns true for %s', (_label, buildErr) => {
      expect(isConnectionFailure(buildErr())).toBe(true);
    });

    it('returns true for a plain error tagged by markConnectFailure', async () => {
      const err = await tagConnectFailure(new Error('connect failed'));
      expect(isConnectionFailure(err)).toBe(true);
    });

    it('returns true when the cause matches', () => {
      const err = new Error('wrapper');
      err.cause = new McpError(McpErrorCode.RequestTimeout, 'timed out');
      expect(isConnectionFailure(err)).toBe(true);

      const transportWrapper = new Error('wrapper');
      transportWrapper.cause = transportError();
      expect(isConnectionFailure(transportWrapper)).toBe(true);
    });

    it('returns true when shouldInvalidateOnError is true', () => {
      mcpClientType.shouldInvalidateOnError.mockReturnValue(true);
      expect(isConnectionFailure(new Error('socket closed'))).toBe(true);
    });

    it('returns false for a plain error', () => {
      expect(isConnectionFailure(new Error('tool failed'))).toBe(false);
    });

    it('returns false for StreamableHTTPError 401', () => {
      expect(isConnectionFailure(new StreamableHTTPError(401, 'unauthorized'))).toBe(false);
    });

    it('returns false for an McpConnectionHttpError 403 shape', () => {
      expect(isConnectionFailure(httpError(403))).toBe(false);
    });

    it('returns false for any error when isUserError is true', async () => {
      mcpClientType.isUserError.mockReturnValue(true);
      const tagged = await tagConnectFailure(new Error('connect failed'));
      expect(isConnectionFailure(tagged)).toBe(false);
      expect(isConnectionFailure(timeoutError())).toBe(false);
      expect(isConnectionFailure(new StreamableHTTPError(503, 'unavailable'))).toBe(false);
    });

    it('rethrows the same object and passes through resolved values', async () => {
      await expect(markConnectFailure(Promise.resolve('ok'))).resolves.toBe('ok');
      const err = new Error('same');
      await expect(markConnectFailure(Promise.reject(err))).rejects.toBe(err);
    });
  });
});
