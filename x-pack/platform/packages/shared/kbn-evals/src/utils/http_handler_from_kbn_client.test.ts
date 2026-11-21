/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { ToolingLog } from '@kbn/tooling-log';
import { httpHandlerFromKbnClient } from './http_handler_from_kbn_client';

const rateLimited = (retryAfter: string) =>
  Object.assign(new Error('Too Many Requests'), {
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

  const setup = (retryAfter: string) => {
    const request = jest
      .fn()
      .mockRejectedValueOnce(rateLimited(retryAfter))
      .mockResolvedValueOnce({ data: 'ok' });
    const fetch = httpHandlerFromKbnClient({
      kbnClient: { request } as unknown as KbnClient,
      log: { warning: jest.fn() } as unknown as ToolingLog,
    });
    return { request, result: fetch('/api/status') };
  };

  it('waits for an HTTP-date Retry-After before retrying', async () => {
    const { request, result } = setup('Sat, 21 Nov 2026 10:00:30 GMT');

    await jest.advanceTimersByTimeAsync(25_000);
    expect(request).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(10_000);
    await expect(result).resolves.toBe('ok');
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('caps a Retry-After hint at 60s', async () => {
    const { request, result } = setup('3600');

    await jest.advanceTimersByTimeAsync(61_000);
    await expect(result).resolves.toBe('ok');
    expect(request).toHaveBeenCalledTimes(2);
  });
});
