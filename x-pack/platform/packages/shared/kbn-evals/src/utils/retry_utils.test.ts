/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseRetryAfterHeaderMs, withRetry } from './retry_utils';

const fastRetryOptions = { minDelayMs: 1, maxDelayMs: 2, jitter: false } as const;

function makeStatusError(status: number, message = `HTTP ${status}`) {
  const err = new Error(message) as Error & { statusCode: number };
  err.statusCode = status;
  return err;
}

// Mirrors the real `KbnClientRequesterError` shape: `.status` is the HTTP status code.
function makeKbnClientRequesterError(status: number, message = `HTTP ${status}`) {
  const err = new Error(message) as Error & { status: number };
  err.name = 'KbnClientRequesterError';
  err.status = status;
  return err;
}

describe('withRetry', () => {
  it('returns immediately on success', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, fastRetryOptions);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it.each([502, 503, 504])('retries on HTTP %s', async (status) => {
    const fn = jest.fn().mockRejectedValueOnce(makeStatusError(status)).mockResolvedValueOnce('ok');
    const result = await withRetry(fn, fastRetryOptions);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries on HTTP 429 (regression)', async () => {
    const fn = jest.fn().mockRejectedValueOnce(makeStatusError(429)).mockResolvedValueOnce('ok');
    const result = await withRetry(fn, fastRetryOptions);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry on HTTP 500 (treated as deterministic in this stack)', async () => {
    const err = makeStatusError(500);
    const fn = jest.fn().mockRejectedValue(err);
    await expect(withRetry(fn, fastRetryOptions)).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry on HTTP 413 (payload too large)', async () => {
    const err = makeStatusError(413, 'Payload Too Large');
    const fn = jest.fn().mockRejectedValue(err);
    await expect(withRetry(fn, fastRetryOptions)).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it.each([400, 401, 403, 404, 409])('does NOT retry on HTTP %s', async (status) => {
    const err = makeStatusError(status);
    const fn = jest.fn().mockRejectedValue(err);
    await expect(withRetry(fn, fastRetryOptions)).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries KbnClientRequesterError with .status', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(makeKbnClientRequesterError(503))
      .mockResolvedValueOnce('ok');
    const result = await withRetry(fn, fastRetryOptions);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry on terminal KbnClientRequesterError status', async () => {
    const err = makeKbnClientRequesterError(413, 'Payload Too Large');
    const fn = jest.fn().mockRejectedValue(err);
    await expect(withRetry(fn, fastRetryOptions)).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('throws last error after exhausting attempts on persistent 503', async () => {
    const err = makeStatusError(503);
    const fn = jest.fn().mockRejectedValue(err);
    await expect(withRetry(fn, { ...fastRetryOptions, maxAttempts: 3 })).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('invokes onRetry hook between attempts', async () => {
    const onRetry = jest.fn();
    const fn = jest.fn().mockRejectedValueOnce(makeStatusError(503)).mockResolvedValueOnce('ok');
    await withRetry(fn, { ...fastRetryOptions, onRetry, label: 'upsert' });
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(expect.objectContaining({ attempt: 1, label: 'upsert' }));
  });

  describe('Retry-After response header', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    const rateLimited = (retryAfter: string) =>
      Object.assign(makeKbnClientRequesterError(429, 'Too Many Requests'), {
        headers: new Headers({ 'retry-after': retryAfter }),
      });

    // The HTTP-date is built inside the test, after the fake clock is installed:
    // a date computed at collection time drifts by however late the test starts.
    it.each([
      ['delay-seconds', () => '30'],
      ['HTTP-date', () => new Date(Date.now() + 30_000).toUTCString()],
    ])('waits at least the %s value before retrying', async (_format, retryAfter) => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(rateLimited(retryAfter()))
        .mockResolvedValueOnce('ok');
      const result = withRetry(fn, { ...fastRetryOptions, maxDelayMs: 60_000 });

      await jest.advanceTimersByTimeAsync(25_000);
      expect(fn).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(10_000);
      await expect(result).resolves.toBe('ok');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('surfaces the error instead of retrying early when Retry-After exceeds maxDelayMs', async () => {
      const onRetry = jest.fn();
      const error = rateLimited('90');
      const fn = jest.fn().mockRejectedValueOnce(error).mockResolvedValueOnce('ok');

      await expect(
        withRetry(fn, { ...fastRetryOptions, maxDelayMs: 60_000, onRetry })
      ).rejects.toBe(error);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(onRetry).not.toHaveBeenCalled();
    });

    it('waits the full Retry-After when it equals maxDelayMs', async () => {
      const fn = jest.fn().mockRejectedValueOnce(rateLimited('60')).mockResolvedValueOnce('ok');
      const result = withRetry(fn, { ...fastRetryOptions, maxDelayMs: 60_000 });

      await jest.advanceTimersByTimeAsync(59_000);
      expect(fn).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(1_000);
      await expect(result).resolves.toBe('ok');
    });
  });

  it('uses normal backoff for Retry-After: 0 even when the message advertises a longer wait', async () => {
    jest.useFakeTimers();
    try {
      const error = Object.assign(new Error('Too Many Requests, retry after 90 seconds'), {
        statusCode: 429,
        headers: new Headers({ 'retry-after': '0' }),
      });
      const onRetry = jest.fn();
      const fn = jest.fn().mockRejectedValueOnce(error).mockResolvedValueOnce('ok');
      const result = withRetry(fn, {
        maxAttempts: 2,
        minDelayMs: 10,
        maxDelayMs: 60_000,
        jitter: false,
        onRetry,
      });

      await jest.advanceTimersByTimeAsync(10);
      await expect(result).resolves.toBe('ok');
      expect(onRetry).toHaveBeenCalledWith(expect.objectContaining({ delayMs: 10 }));
    } finally {
      jest.useRealTimers();
    }
  });

  describe('parseRetryAfterHeaderMs', () => {
    beforeEach(() => jest.useFakeTimers({ now: new Date('2026-11-21T10:00:00.000Z') }));
    afterEach(() => jest.useRealTimers());

    it.each([
      ['30', 30_000],
      ['Sat, 21 Nov 2026 10:00:45 GMT', 45_000],
      ['0', 0],
      ['Sat, 21 Nov 2026 09:59:00 GMT', 0],
      ['-5', undefined],
      ['soon', undefined],
      [undefined, undefined],
    ])('parses %p as %p ms', (value, expected) => {
      expect(parseRetryAfterHeaderMs(value)).toBe(expected);
    });
  });

  it('rethrows a retryable error when shouldRetry returns false', async () => {
    const err = makeStatusError(503);
    const fn = jest.fn().mockRejectedValue(err);
    await expect(withRetry(fn, { ...fastRetryOptions, shouldRetry: () => false })).rejects.toBe(
      err
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
