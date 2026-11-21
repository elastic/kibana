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

  it.each(['0.0', '1e3', '+5', '2026-11-21T09:00:00Z'])(
    'falls back to the message hint when Retry-After is malformed (%p)',
    async (malformed) => {
      jest.useFakeTimers({ now: new Date('2026-11-21T10:00:00.000Z') });
      try {
        const error = Object.assign(new Error('Too Many Requests, retry after 30 seconds'), {
          statusCode: 429,
          headers: new Headers({ 'retry-after': malformed }),
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
        result.catch(() => undefined);

        await jest.advanceTimersByTimeAsync(29_999);
        expect(fn).toHaveBeenCalledTimes(1);
        await jest.advanceTimersByTimeAsync(1);
        await expect(result).resolves.toBe('ok');
        expect(onRetry).toHaveBeenCalledWith(expect.objectContaining({ delayMs: 30_000 }));
      } finally {
        jest.useRealTimers();
      }
    }
  );

  describe('delay cap with jitter', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      // Largest value Math.random can return: maximum jitter.
      jest.spyOn(Math, 'random').mockReturnValue(0.999999);
    });
    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    const rateLimited = (retryAfter?: string) =>
      Object.assign(makeKbnClientRequesterError(429, 'Too Many Requests'), {
        headers: new Headers(retryAfter === undefined ? {} : { 'retry-after': retryAfter }),
      });

    it.each([
      ['Retry-After equal to maxDelayMs', '60', 1_000, 60_000],
      ['exponential backoff that reaches maxDelayMs', undefined, 50_000, 50_000],
    ])('never schedules past maxDelayMs for %s', async (_name, retryAfter, minDelayMs, cap) => {
      const onRetry = jest.fn();
      const fn = jest
        .fn()
        .mockRejectedValueOnce(rateLimited(retryAfter))
        .mockResolvedValueOnce('ok');
      const result = withRetry(fn, {
        maxAttempts: 2,
        minDelayMs,
        maxDelayMs: cap,
        jitter: true,
        onRetry,
      });
      result.catch(() => undefined);

      await jest.advanceTimersByTimeAsync(cap - 1);
      expect(fn).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(1);
      await expect(result).resolves.toBe('ok');
      expect(fn).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenCalledWith(expect.objectContaining({ delayMs: cap }));
    });

    it('still adds jitter on top of Retry-After below the cap', async () => {
      const onRetry = jest.fn();
      const fn = jest.fn().mockRejectedValueOnce(rateLimited('30')).mockResolvedValueOnce('ok');
      const result = withRetry(fn, {
        maxAttempts: 2,
        minDelayMs: 1,
        maxDelayMs: 60_000,
        jitter: true,
        onRetry,
      });
      result.catch(() => undefined);

      await jest.advanceTimersByTimeAsync(30_998);
      expect(fn).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(1);
      await expect(result).resolves.toBe('ok');
      // base 30_000 + floor(0.999999 * min(1000, max(100, 4500))) = 30_999
      expect(onRetry).toHaveBeenCalledWith(expect.objectContaining({ delayMs: 30_999 }));
    });
  });

  describe('Retry-After header versus a longer message hint', () => {
    beforeEach(() => jest.useFakeTimers({ now: new Date('2026-11-21T10:00:00.000Z') }));
    afterEach(() => jest.useRealTimers());

    const withBodyHint = (retryAfter: string) =>
      Object.assign(new Error('Too Many Requests, retry after 90 seconds'), {
        statusCode: 429,
        headers: new Headers({ 'retry-after': retryAfter }),
      });

    it.each(['Sat, 21 Nov 2026 09:59:00 GMT'])(
      'uses normal backoff for a past HTTP-date (%p) instead of the stale message hint',
      async (retryAfter) => {
        const onRetry = jest.fn();
        const fn = jest
          .fn()
          .mockRejectedValueOnce(withBodyHint(retryAfter))
          .mockResolvedValueOnce('ok');
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
      }
    );

    it.each(['1.5', 'Sat, 21 Nov 2026 10:00:60 GMT'])(
      'surfaces the error when Retry-After %p is malformed and the message hint exceeds maxDelayMs',
      async (retryAfter) => {
        const error = withBodyHint(retryAfter);
        const fn = jest.fn().mockRejectedValueOnce(error).mockResolvedValueOnce('ok');

        await expect(
          withRetry(fn, { minDelayMs: 1, maxDelayMs: 60_000, jitter: false })
        ).rejects.toBe(error);
        expect(fn).toHaveBeenCalledTimes(1);
      }
    );

    it('surfaces the error when Retry-After overflows and the message carries no hint', async () => {
      // Plain message: only the header can cause this rejection. 400 nines is valid
      // delay-seconds that overflows to Infinity, above the 60s ceiling.
      const error = Object.assign(new Error('Too Many Requests'), {
        statusCode: 429,
        headers: new Headers({ 'retry-after': '9'.repeat(400) }),
      });
      const fn = jest.fn().mockRejectedValueOnce(error).mockResolvedValueOnce('ok');

      await expect(
        withRetry(fn, { minDelayMs: 1, maxDelayMs: 60_000, jitter: false })
      ).rejects.toBe(error);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('keeps a tiny maxDelayMs a hard ceiling under maximum jitter', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.999999);
      try {
        const onRetry = jest.fn();
        const fn = jest
          .fn()
          .mockRejectedValueOnce(makeStatusError(503))
          .mockResolvedValueOnce('ok');
        const result = withRetry(fn, {
          maxAttempts: 2,
          minDelayMs: 1,
          maxDelayMs: 2,
          jitter: true,
          onRetry,
        });

        await jest.advanceTimersByTimeAsync(1);
        expect(fn).toHaveBeenCalledTimes(1);
        await jest.advanceTimersByTimeAsync(1);
        await expect(result).resolves.toBe('ok');
        expect(onRetry).toHaveBeenCalledWith(expect.objectContaining({ delayMs: 2 }));
      } finally {
        jest.restoreAllMocks();
      }
    });
  });

  describe('parseRetryAfterHeaderMs', () => {
    beforeEach(() => jest.useFakeTimers({ now: new Date('2026-11-21T10:00:00.000Z') }));
    afterEach(() => jest.useRealTimers());

    it.each([
      ['30', 30_000],
      [' 30 ', 30_000],
      ['0', 0],
      ['Sat, 21 Nov 2026 10:00:45 GMT', 45_000],
      ['Sat, 21 Nov 2026 09:59:00 GMT', 0],
      // obsolete formats recipients must still accept (RFC 9110 section 5.6.7)
      ['Saturday, 21-Nov-26 10:00:45 GMT', 45_000],
      ['Sat Nov 21 10:00:45 2026', 45_000],
      ['Sat Nov  1 10:00:45 2026', 0],
      // a leap second is only valid at 23:59:60 on the last day of June or December
      ['Thu, 31 Dec 2026 23:59:60 GMT', Date.UTC(2027, 0, 1) - Date.UTC(2026, 10, 21, 10)],
      ['Tue, 30 Jun 2026 23:59:60 GMT', 0],
      // a two-digit year more than 50 years ahead is the most recent past year with those digits
      ['Saturday, 21-Nov-99 10:00:45 GMT', 0],
    ])('parses valid %p as %p ms', (value, expected) => {
      expect(parseRetryAfterHeaderMs(value)).toBe(expected);
    });

    // Now is 2026-11-21T10:00:00Z, so the 50-calendar-year boundary is 2076-11-21T10:00:00Z.
    it.each([
      [
        'before the boundary',
        'Saturday, 21-Nov-76 09:59:59 GMT',
        Date.UTC(2076, 10, 21, 9, 59, 59),
      ],
      ['at the boundary', 'Saturday, 21-Nov-76 10:00:00 GMT', Date.UTC(2076, 10, 21, 10)],
      ['after the boundary', 'Saturday, 21-Nov-76 10:00:01 GMT', undefined],
      ['well inside the window', 'Saturday, 21-Nov-70 10:00:00 GMT', Date.UTC(2070, 10, 21, 10)],
    ])('resolves an RFC 850 two-digit year %s', (_name, value, futureUtcMs) => {
      // Beyond the boundary the date is the most recent past year (1976): already elapsed.
      expect(parseRetryAfterHeaderMs(value)).toBe(
        futureUtcMs === undefined ? 0 : futureUtcMs - Date.now()
      );
    });

    it.each([
      '-5',
      '0.0',
      '1.5',
      '1e3',
      '+5',
      '0x10',
      '1_000',
      'Infinity',
      'NaN',
      'soon',
      '',
      '   ',
      '2026-11-21T09:00:00Z',
      '2026-11-21T10:00:30Z',
      'Nov 21 2026 10:00:30',
      'Sat, 21 Nov 2026 10:00:30',
      'Sat, 21 Nov 2026 10:00:30 PST',
      'Sat, 31 Nov 2026 10:00:30 GMT',
      'Sat, 30 Feb 2026 10:00:30 GMT',
      'Sat, 21 Nov 2026 24:00:30 GMT',
      'Sat, 21 Nov 2026 10:60:30 GMT',
      'Sat, 21 Nov 2026 10:00:60 GMT',
      'Thu, 31 Dec 2026 23:58:60 GMT',
      'Wed, 30 Dec 2026 23:59:60 GMT',
      'Tue, 30 Jun 2026 22:59:60 GMT',
      'Mon, 31 Aug 2026 23:59:60 GMT',
      'Sat, 21 Nov 2026 10:00:61 GMT',
      'Sat, 21 Foo 2026 10:00:30 GMT',
      'Foo, 21 Nov 2026 10:00:30 GMT',
      '30 seconds',
      undefined,
      null,
      30,
    ])('rejects malformed %p', (value) => {
      expect(parseRetryAfterHeaderMs(value)).toBeUndefined();
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
