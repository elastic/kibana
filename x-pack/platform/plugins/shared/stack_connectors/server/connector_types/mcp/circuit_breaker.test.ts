/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { StreamableHTTPError, UnauthorizedError } from '@kbn/mcp-client';
import {
  getErrorSource,
  isRetryableError,
  TaskErrorSource,
} from '@kbn/task-manager-plugin/server/task_running';
import {
  BREAKER_INITIAL_COOLING_MS,
  BREAKER_MAX_COOLING_MS,
  BREAKER_STATE_MAX_SIZE,
  isConnectionFailure,
  isUserError,
  markConnectFailure,
  McpCircuitBreaker,
  mcpCircuitBreaker,
} from './circuit_breaker';

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const tagConnectFailure = async (err: Error): Promise<Error> => {
  await markConnectFailure(Promise.reject(err)).catch((caught) => {
    expect(caught).toBe(err);
  });
  return err;
};

const withCause = (message: string, cause: unknown): Error => new Error(message, { cause });

describe('McpCircuitBreaker', () => {
  const logger = loggingSystemMock.createLogger();
  const key = 'connector-1:hash-a';
  const connectorId = 'test-connector-1';

  const ctx = (overrides: { key?: string } = {}) => ({
    key,
    connectorId,
    logger,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports a singleton breaker', () => {
    expect(mcpCircuitBreaker).toBeInstanceOf(McpCircuitBreaker);
  });

  it('uses 60 s initial cooling, 10 min max cooling and 1000 keys by default', () => {
    expect(BREAKER_INITIAL_COOLING_MS).toBe(60 * 1000);
    expect(BREAKER_MAX_COOLING_MS).toBe(10 * 60 * 1000);
    expect(BREAKER_STATE_MAX_SIZE).toBe(1000);
  });

  describe('run', () => {
    let clock = 0;
    const coolingMs = 1000;
    const maxCoolingMs = 4000;

    const createBreaker = () =>
      new McpCircuitBreaker({
        now: () => clock,
        initialCoolingMs: coolingMs,
        maxCoolingMs,
        failureThreshold: 3,
      });

    const connectError = () => tagConnectFailure(new Error('closed'));

    const failConnect = async (breaker: McpCircuitBreaker, runKey = key) => {
      const err = await connectError();
      return breaker
        .run(ctx({ key: runKey }), () => Promise.reject(err))
        .then(
          () => {
            throw new Error('expected run to reject');
          },
          (caught: Error) => caught
        );
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

    const expectOpen = async (breaker: McpCircuitBreaker, nextAttempt: string) => {
      const fn = jest.fn(() => Promise.resolve('no'));
      await expect(breaker.run(ctx(), fn)).rejects.toThrow(nextAttempt);
      expect(fn).not.toHaveBeenCalled();
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

    it('keeps retries on for the first 2 failures and turns them off for the one that opens it', async () => {
      const breaker = createBreaker();

      const first = await failConnect(breaker);
      const second = await failConnect(breaker);
      const third = await failConnect(breaker);

      expect(isRetryableError(first)).toBeNull();
      expect(isRetryableError(second)).toBeNull();
      expect(isRetryableError(third)).toBe(false);
      expect(getErrorSource(third)).toBe(TaskErrorSource.FRAMEWORK);
      expect(third.message).toBe('closed');
    });

    it('does not open on untagged errors or request timeouts', async () => {
      const breaker = createBreaker();
      for (let i = 0; i < 3; i++) {
        await expect(
          breaker.run(ctx(), () => Promise.reject(new Error('Request timed out')))
        ).rejects.toThrow('Request timed out');
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
      await expectOpen(breaker, 'is unavailable');

      clock = coolingMs;
      await expectClosed(breaker);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('is available again'));
    });

    it('re-opens after one more failure once the cooling window ends and doubles the cooling', async () => {
      const breaker = createBreaker();
      await openBreaker(breaker);

      // first window: 1000 ms
      clock = coolingMs;
      const reopened = await failConnect(breaker);
      expect(isRetryableError(reopened)).toBe(false);

      // second window: 2000 ms
      clock = coolingMs + 1999;
      await expectOpen(breaker, 'next attempt in 1s');

      clock = coolingMs + 2000;
      await failConnect(breaker);

      // third window: 4000 ms, which is the max
      clock = coolingMs + 2000 + 3999;
      await expectOpen(breaker, 'next attempt in 1s');

      clock = coolingMs + 2000 + 4000;
      await failConnect(breaker);

      // fourth window stays capped at 4000 ms
      clock = coolingMs + 2000 + 4000 + 3999;
      await expectOpen(breaker, 'next attempt in 1s');
      clock = coolingMs + 2000 + 4000 + 4000;
      await expectClosed(breaker);
    });

    it('doubles from 60 s to the 10 min cap with the default options', async () => {
      const breaker = new McpCircuitBreaker({ now: () => clock });
      const fail = async () => {
        const err = await connectError();
        await breaker.run(ctx(), () => Promise.reject(err)).catch(() => undefined);
      };
      const isOpenAt = async (at: number) => {
        clock = at;
        const fn = jest.fn(() => Promise.resolve('ok'));
        const open = await breaker.run(ctx(), fn).then(
          () => false,
          () => true
        );
        // a successful probe closes the breaker, so only call it for times that must stay open
        return { open, called: fn.mock.calls.length };
      };

      for (let i = 0; i < 3; i++) {
        await fail();
      }

      // 60, 120, 240, 480, 600, 600 seconds
      let openedAt = 0;
      for (const windowSeconds of [60, 120, 240, 480, 600, 600]) {
        const windowMs = windowSeconds * 1000;
        expect(await isOpenAt(openedAt + windowMs - 1)).toEqual({ open: true, called: 0 });
        clock = openedAt + windowMs;
        await fail(); // half-open: one failure re-opens
        openedAt = clock;
      }
    });

    it('success after a re-open resets the count and the cooling', async () => {
      const breaker = createBreaker();
      await openBreaker(breaker);

      clock = coolingMs;
      await failConnect(breaker); // re-open for 2000 ms
      clock = coolingMs + 2000;
      await expectClosed(breaker); // success closes it

      await openBreaker(breaker); // needs 3 failures again
      const openedAt = clock;
      clock = openedAt + coolingMs - 1;
      await expectOpen(breaker, 'is unavailable');
      clock = openedAt + coolingMs; // back to the initial 1000 ms window
      await expectClosed(breaker);
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
      const late = await runs[3];
      expect(isRetryableError(late as Error)).toBeNull();

      clock = coolingMs - 1;
      await expectOpen(breaker, 'next attempt in 1s');
    });

    it('keeps the breaker open when a call admitted before it opened fails with a non-connect error', async () => {
      const breaker = createBreaker();
      const lateGate = deferred<string>();
      const lateRun = breaker.run(ctx(), () => lateGate.promise).catch((err: unknown) => err);

      await openBreaker(breaker);

      clock = 400;
      lateGate.reject(new Error('Request timed out'));
      await lateRun;

      await expectOpen(breaker, 'is unavailable');
    });

    it('does not count user errors and resets an existing failure count', async () => {
      const breaker = createBreaker();
      await failConnect(breaker);
      await failConnect(breaker);

      const userError = await tagConnectFailure(
        withCause('Unauthorized error: nope', new UnauthorizedError('nope'))
      );
      await expect(breaker.run(ctx(), () => Promise.reject(userError))).rejects.toBe(userError);
      expect(isRetryableError(userError)).toBeNull();

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

    it('evicts the oldest key when more than the maximum number of keys are tracked', async () => {
      const breaker = createBreaker();
      await openBreaker(breaker, 'key-0');
      for (let i = 1; i <= BREAKER_STATE_MAX_SIZE; i++) {
        await failConnect(breaker, `key-${i}`);
      }

      // key-0 was evicted, so it is closed again
      await expectClosed(breaker, 'key-0');
    });
  });

  describe('isUserError', () => {
    it('is true for an UnauthorizedError cause', () => {
      expect(isUserError(withCause('x', new UnauthorizedError('nope')))).toBe(true);
    });

    it('is true for a 401 or 403 StreamableHTTPError cause', () => {
      expect(isUserError(withCause('x', new StreamableHTTPError(401, 'nope')))).toBe(true);
      expect(isUserError(withCause('x', new StreamableHTTPError(403, 'nope')))).toBe(true);
    });

    it('is false for other causes and for errors without a cause', () => {
      expect(isUserError(withCause('x', new StreamableHTTPError(502, 'bad gateway')))).toBe(false);
      expect(isUserError(withCause('x', new Error('fetch failed')))).toBe(false);
      expect(isUserError(new Error('x'))).toBe(false);
      expect(isUserError('x')).toBe(false);
    });
  });

  describe('isConnectionFailure', () => {
    it('returns true for an error tagged by markConnectFailure', async () => {
      const err = await tagConnectFailure(new Error('connect failed'));
      expect(isConnectionFailure(err)).toBe(true);
    });

    it('returns false for untagged errors', () => {
      expect(isConnectionFailure(new Error('tool failed'))).toBe(false);
    });

    it('returns false for a tagged user error', async () => {
      const tagged = await tagConnectFailure(
        withCause('Unauthorized error: nope', new UnauthorizedError('nope'))
      );
      expect(isConnectionFailure(tagged)).toBe(false);
    });

    it('rethrows the same object and passes through resolved values', async () => {
      await expect(markConnectFailure(Promise.resolve('ok'))).resolves.toBe('ok');
      const err = new Error('same');
      await expect(markConnectFailure(Promise.reject(err))).rejects.toBe(err);
    });
  });
});
