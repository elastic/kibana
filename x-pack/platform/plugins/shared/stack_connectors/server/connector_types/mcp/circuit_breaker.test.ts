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

const closedError = () => new McpError(McpErrorCode.ConnectionClosed, 'closed');

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
    const baseCoolingMs = 1000;
    const maxCoolingMs = 4000;

    const createBreaker = () =>
      new McpCircuitBreaker({
        now: () => clock,
        baseCoolingMs,
        maxCoolingMs,
        failureThreshold: 3,
      });

    const openBreaker = async (breaker: McpCircuitBreaker, runKey = key) => {
      for (let i = 0; i < 3; i++) {
        await expect(
          breaker.run(ctx({ key: runKey }), () => Promise.reject(closedError()))
        ).rejects.toThrow('closed');
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

    it.each([
      ['connection closed', async () => closedError()],
      ['tagged connect error', () => tagConnectFailure(new Error('connect failed'))],
      ['transport error name', async () => transportError()],
      ['http 503 name', async () => httpError(503)],
    ])('opens after connection failures shaped as %s', async (_label, buildErr) => {
      const breaker = createBreaker();
      for (let i = 0; i < 3; i++) {
        const err = await buildErr();
        await expect(breaker.run(ctx(), () => Promise.reject(err))).rejects.toBe(err);
      }

      const fn = jest.fn(() => Promise.resolve('no'));
      await expect(breaker.run(ctx(), fn)).rejects.toThrow('is unavailable, next attempt in');
      expect(fn).not.toHaveBeenCalled();
    });

    it('does not open on request timeouts from a connected client', async () => {
      const breaker = createBreaker();
      for (let i = 0; i < 3; i++) {
        await expect(breaker.run(ctx(), () => Promise.reject(timeoutError()))).rejects.toThrow(
          'timed out'
        );
      }

      await expectClosed(breaker);
    });

    it('stays open before openUntil and admits one probe at openUntil', async () => {
      const breaker = createBreaker();
      await openBreaker(breaker);

      clock = baseCoolingMs - 1;
      const earlyFn = jest.fn(() => Promise.resolve('early'));
      await expect(breaker.run(ctx(), earlyFn)).rejects.toThrow('is unavailable');
      expect(earlyFn).not.toHaveBeenCalled();

      clock = baseCoolingMs;
      const probeGate = deferred<string>();
      const probeFn = jest.fn(() => probeGate.promise);
      const probe = breaker.run(ctx(), probeFn);
      const secondFn = jest.fn(() => Promise.resolve('second'));

      await expect(breaker.run(ctx(), secondFn)).rejects.toThrow(
        'is unavailable, next attempt in 0s'
      );
      expect(secondFn).not.toHaveBeenCalled();
      expect(probeFn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('is half-open'));

      probeGate.resolve('probed');
      await expect(probe).resolves.toBe('probed');
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('is available again'));

      await expectClosed(breaker);
    });

    it('needs a full threshold of new failures after a successful probe', async () => {
      const breaker = createBreaker();
      await openBreaker(breaker);

      clock = baseCoolingMs;
      await expect(breaker.run(ctx(), () => Promise.resolve('probed'))).resolves.toBe('probed');

      const failFn = jest.fn(() => Promise.reject(closedError()));
      await expect(breaker.run(ctx(), failFn)).rejects.toThrow('closed');
      await expect(breaker.run(ctx(), failFn)).rejects.toThrow('closed');
      await expect(breaker.run(ctx(), failFn)).rejects.toThrow('closed');
      expect(failFn).toHaveBeenCalledTimes(3);

      const blockedFn = jest.fn(() => Promise.resolve('no'));
      await expect(breaker.run(ctx(), blockedFn)).rejects.toThrow('is unavailable');
      expect(blockedFn).not.toHaveBeenCalled();
    });

    it('doubles cooling on probe failure up to the max', async () => {
      const breaker = createBreaker();
      await openBreaker(breaker);

      clock = baseCoolingMs;
      await expect(breaker.run(ctx(), () => Promise.reject(closedError()))).rejects.toThrow(
        'closed'
      );
      await expect(breaker.run(ctx(), () => Promise.resolve('no'))).rejects.toThrow(
        'next attempt in 2s'
      );

      clock = baseCoolingMs + 2000;
      await expect(breaker.run(ctx(), () => Promise.reject(closedError()))).rejects.toThrow(
        'closed'
      );
      await expect(breaker.run(ctx(), () => Promise.resolve('no'))).rejects.toThrow(
        'next attempt in 4s'
      );

      clock = baseCoolingMs + 2000 + maxCoolingMs;
      await expect(breaker.run(ctx(), () => Promise.reject(closedError()))).rejects.toThrow(
        'closed'
      );
      await expect(breaker.run(ctx(), () => Promise.resolve('no'))).rejects.toThrow(
        'next attempt in 4s'
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

      gates[0].reject(closedError());
      gates[1].reject(closedError());
      gates[2].reject(closedError());
      await Promise.all(runs.slice(0, 3));

      await expect(breaker.run(ctx(), () => Promise.resolve('no'))).rejects.toThrow(
        'next attempt in 1s'
      );

      gates[3].reject(closedError());
      await runs[3];

      await expect(breaker.run(ctx(), () => Promise.resolve('no'))).rejects.toThrow(
        'next attempt in 1s'
      );
    });

    it('does not count user errors and resets an existing failure count', async () => {
      const breaker = createBreaker();
      await expect(breaker.run(ctx(), () => Promise.reject(closedError()))).rejects.toThrow(
        'closed'
      );
      await expect(breaker.run(ctx(), () => Promise.reject(closedError()))).rejects.toThrow(
        'closed'
      );

      mcpClientType.isUserError.mockReturnValue(true);
      await expect(
        breaker.run(ctx(), () => Promise.reject(new Error('unauthorized')))
      ).rejects.toThrow('unauthorized');

      mcpClientType.isUserError.mockReturnValue(false);
      await expect(breaker.run(ctx(), () => Promise.reject(closedError()))).rejects.toThrow(
        'closed'
      );
      await expect(breaker.run(ctx(), () => Promise.reject(closedError()))).rejects.toThrow(
        'closed'
      );

      await expectClosed(breaker);
    });

    it('does not count tool errors and resets an existing failure count', async () => {
      const breaker = createBreaker();
      await expect(breaker.run(ctx(), () => Promise.reject(closedError()))).rejects.toThrow(
        'closed'
      );

      await expect(
        breaker.run(ctx(), () => Promise.reject(new Error('tool failed')))
      ).rejects.toThrow('tool failed');

      await expect(breaker.run(ctx(), () => Promise.reject(closedError()))).rejects.toThrow(
        'closed'
      );
      await expect(breaker.run(ctx(), () => Promise.reject(closedError()))).rejects.toThrow(
        'closed'
      );

      await expectClosed(breaker);
    });

    it('closes when the probe fails with a tool error', async () => {
      const breaker = createBreaker();
      await openBreaker(breaker);

      clock = baseCoolingMs;
      await expect(
        breaker.run(ctx(), () => Promise.reject(new Error('tool failed')))
      ).rejects.toThrow('tool failed');

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
    it.each([
      ['connection closed', () => new McpError(McpErrorCode.ConnectionClosed, 'closed')],
      ['not connected', () => new McpNotConnectedError('server', '1.0.0')],
      ['sdk "Not connected" message', () => new Error('Not connected')],
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
      err.cause = new McpError(McpErrorCode.ConnectionClosed, 'closed');
      expect(isConnectionFailure(err)).toBe(true);

      const transportWrapper = new Error('wrapper');
      transportWrapper.cause = transportError();
      expect(isConnectionFailure(transportWrapper)).toBe(true);
    });

    it.each([
      ['request timeout', () => new McpError(McpErrorCode.RequestTimeout, 'timed out')],
      ['plain tool error', () => new Error('tool failed')],
      ['streamable http 404', () => new StreamableHTTPError(404, 'session not found')],
      ['streamable http 401', () => new StreamableHTTPError(401, 'unauthorized')],
      ['streamable http 503', () => new StreamableHTTPError(503, 'unavailable')],
      ['http 403 name', () => httpError(403)],
    ])('returns false for %s', (_label, buildErr) => {
      expect(isConnectionFailure(buildErr())).toBe(false);
    });

    it('returns false for any error when isUserError is true', async () => {
      mcpClientType.isUserError.mockReturnValue(true);
      const tagged = await tagConnectFailure(new Error('connect failed'));
      expect(isConnectionFailure(tagged)).toBe(false);
      expect(isConnectionFailure(transportError())).toBe(false);
      expect(isConnectionFailure(httpError(503))).toBe(false);
    });

    it('rethrows the same object and passes through resolved values', async () => {
      await expect(markConnectFailure(Promise.resolve('ok'))).resolves.toBe('ok');
      const err = new Error('same');
      await expect(markConnectFailure(Promise.reject(err))).rejects.toBe(err);
    });
  });
});
