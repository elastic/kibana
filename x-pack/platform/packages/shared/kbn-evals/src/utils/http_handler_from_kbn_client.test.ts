/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { ToolingLog } from '@kbn/tooling-log';
import { httpHandlerFromKbnClient } from './http_handler_from_kbn_client';

const rateLimited = (retryAfter: string, message = 'Too Many Requests') =>
  Object.assign(new Error(message), {
    status: 429,
    headers: new Headers({ 'retry-after': retryAfter }),
  });

describe('httpHandlerFromKbnClient retries', () => {
  const originalHttpRetries = process.env.KBN_EVALS_HTTP_RETRIES;
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-11-21T10:00:00.000Z') });
    jest.spyOn(Math, 'random').mockReturnValue(0);
    process.env.KBN_EVALS_HTTP_RETRIES = '1';
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    if (originalHttpRetries === undefined) delete process.env.KBN_EVALS_HTTP_RETRIES;
    else process.env.KBN_EVALS_HTTP_RETRIES = originalHttpRetries;
  });

  const setup = (retryAfter: string, message?: string) => {
    const request = jest
      .fn()
      .mockRejectedValueOnce(rateLimited(retryAfter, message))
      .mockResolvedValueOnce({ data: 'ok' });
    const fetch = httpHandlerFromKbnClient({
      kbnClient: { request } as unknown as KbnClient,
      log: { warning: jest.fn() } as unknown as ToolingLog,
    });
    const result = fetch('/api/status');
    // A red run must fail on assertions, not on a rejection nobody awaited yet.
    result.catch(() => undefined);
    return { request, result };
  };

  it('waits for an HTTP-date Retry-After before retrying', async () => {
    const { request, result } = setup('Sat, 21 Nov 2026 10:00:30 GMT');

    await jest.advanceTimersByTimeAsync(25_000);
    expect(request).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(10_000);
    await expect(result).resolves.toBe('ok');
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('caps exponential backoff at 60s when many retries are configured', async () => {
    process.env.KBN_EVALS_HTTP_RETRIES = '10';
    const request = jest.fn();
    for (let i = 0; i < 9; i++) request.mockRejectedValueOnce(rateLimited('1'));
    request.mockResolvedValueOnce({ data: 'ok' });
    const log = { warning: jest.fn() };
    const result = httpHandlerFromKbnClient({
      kbnClient: { request } as unknown as KbnClient,
      log: log as unknown as ToolingLog,
    })('/api/status');

    await jest.advanceTimersByTimeAsync(10 * 61_000);
    await expect(result).resolves.toBe('ok');
    const delays = log.warning.mock.calls.map(([msg]: [string]) =>
      Number(/retrying in (\d+)s/.exec(msg)?.[1])
    );
    expect(Math.max(...delays)).toBeLessThanOrEqual(61);
  });

  it('never waits past the 60s cap when jitter is at its maximum', async () => {
    // Largest value Math.random can return: maximum jitter.
    jest.spyOn(Math, 'random').mockReturnValue(0.999999);
    const { request, result } = setup('60');

    await jest.advanceTimersByTimeAsync(59_999);
    expect(request).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toBe('ok');
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('still adds jitter on top of Retry-After below the cap', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.999999);
    const { request, result } = setup('30');

    // base 30_000 + floor(0.999999 * min(1000, max(100, 4500))) = 30_999
    await jest.advanceTimersByTimeAsync(30_998);
    expect(request).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toBe('ok');
  });

  it.each(['0.0', '1e3', '2026-11-21T09:00:00Z'])(
    'falls back to the message hint when Retry-After is malformed (%p)',
    async (malformed) => {
      const { request, result } = setup(malformed, 'Too Many Requests, retry after 30 seconds');

      await jest.advanceTimersByTimeAsync(29_999);
      expect(request).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(1);
      await expect(result).resolves.toBe('ok');
      expect(request).toHaveBeenCalledTimes(2);
    }
  );

  it.each(['0', 'Sat, 21 Nov 2026 09:59:00 GMT'])(
    'uses normal backoff for Retry-After %p instead of a stale longer message hint',
    async (retryAfter) => {
      const { request, result } = setup(retryAfter, 'Too Many Requests, retry after 90 seconds');

      // attempt 0 backoff is 1s (random mocked to 0): the 90s body hint must be ignored.
      await jest.advanceTimersByTimeAsync(999);
      expect(request).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(1);
      await expect(result).resolves.toBe('ok');
      expect(request).toHaveBeenCalledTimes(2);
    }
  );

  it.each(['1.5', 'Sat, 21 Nov 2026 10:00:60 GMT'])(
    'surfaces the 429 when Retry-After %p is malformed and the message hint exceeds 60s',
    async (retryAfter) => {
      const { request, result } = setup(retryAfter, 'Too Many Requests, retry after 90 seconds');

      await expect(result).rejects.toMatchObject({ status: 429 });
      expect(request).toHaveBeenCalledTimes(1);
    }
  );

  it('surfaces the 429 when Retry-After overflows and the message carries no hint', async () => {
    // Default message has no hint: only the header can cause this rejection.
    const { request, result } = setup('9'.repeat(400));

    await expect(result).rejects.toMatchObject({ status: 429 });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('surfaces the 429 instead of retrying early when Retry-After exceeds 60s', async () => {
    const { request, result } = setup('90');

    await expect(result).rejects.toMatchObject({ status: 429 });
    expect(request).toHaveBeenCalledTimes(1);
  });
});
