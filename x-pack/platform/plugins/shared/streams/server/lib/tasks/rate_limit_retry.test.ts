/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { createInferenceProviderError, createInferenceInternalError } from '@kbn/inference-common';
import { isRateLimitError, withRateLimitRetry, RateLimitTimeoutError } from './rate_limit_retry';

describe('rate_limit_retry', () => {
  describe('isRateLimitError', () => {
    it('returns true for 429 inference provider error', () => {
      const error = createInferenceProviderError('Rate limit exceeded', { status: 429 });
      expect(isRateLimitError(error)).toBe(true);
    });

    it('returns false for non-429 inference provider error', () => {
      const error = createInferenceProviderError('Server error', { status: 500 });
      expect(isRateLimitError(error)).toBe(false);
    });

    it('returns false for inference provider error without status', () => {
      const error = createInferenceProviderError('Some error');
      expect(isRateLimitError(error)).toBe(false);
    });

    it('returns false for inference internal error', () => {
      const error = createInferenceInternalError('Internal error');
      expect(isRateLimitError(error)).toBe(false);
    });

    it('returns false for plain Error', () => {
      const error = new Error('Some error');
      expect(isRateLimitError(error)).toBe(false);
    });

    it('returns false for null', () => {
      expect(isRateLimitError(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isRateLimitError(undefined)).toBe(false);
    });

    it('returns false for non-error objects', () => {
      expect(isRateLimitError({ status: 429 })).toBe(false);
    });
  });

  describe('RateLimitTimeoutError', () => {
    it('is an instance of Error', () => {
      const error = new RateLimitTimeoutError();
      expect(error).toBeInstanceOf(Error);
    });

    it('has the correct name', () => {
      const error = new RateLimitTimeoutError();
      expect(error.name).toBe('RateLimitTimeoutError');
    });

    it('has a default message', () => {
      const error = new RateLimitTimeoutError();
      expect(error.message).toBe('Rate limit retry budget exhausted');
    });

    it('accepts a custom message', () => {
      const error = new RateLimitTimeoutError('Custom message');
      expect(error.message).toBe('Custom message');
    });

    it('can be caught with instanceof', () => {
      const error = new RateLimitTimeoutError();
      expect(error instanceof RateLimitTimeoutError).toBe(true);
    });
  });

  describe('withRateLimitRetry', () => {
    it('returns the result on success', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      const result = await withRateLimitRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('rethrows non-rate-limit errors immediately', async () => {
      const error = new Error('Some other error');
      const fn = jest.fn().mockRejectedValue(error);

      await expect(withRateLimitRetry(fn)).rejects.toThrow('Some other error');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('rethrows non-429 inference provider errors immediately', async () => {
      const error = createInferenceProviderError('Server error', { status: 500 });
      const fn = jest.fn().mockRejectedValue(error);

      await expect(withRateLimitRetry(fn)).rejects.toThrow('Server error');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on rate limit error and succeeds', async () => {
      const rateLimitError = createInferenceProviderError('Rate limit exceeded', { status: 429 });
      const fn = jest.fn().mockRejectedValueOnce(rateLimitError).mockResolvedValueOnce('success');

      const result = await withRateLimitRetry(fn, {
        initialDelayMs: 10,
        maxDurationMs: 1000,
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('retries multiple times on repeated rate limit errors', async () => {
      const rateLimitError = createInferenceProviderError('Rate limit exceeded', { status: 429 });
      const fn = jest
        .fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce('success');

      const result = await withRateLimitRetry(fn, {
        initialDelayMs: 10,
        maxDurationMs: 5000,
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(4);
    });

    it('throws RateLimitTimeoutError when budget exhausted', async () => {
      const rateLimitError = createInferenceProviderError('Rate limit exceeded', { status: 429 });
      const fn = jest.fn().mockRejectedValue(rateLimitError);

      await expect(
        withRateLimitRetry(fn, {
          initialDelayMs: 50,
          maxDurationMs: 100, // Short budget to trigger timeout quickly
        })
      ).rejects.toBeInstanceOf(RateLimitTimeoutError);

      // Should have attempted at least twice (initial + 1 retry within 100ms)
      expect(fn.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('respects abort signal before first attempt', async () => {
      const controller = new AbortController();
      controller.abort();

      const fn = jest.fn().mockResolvedValue('success');

      await expect(withRateLimitRetry(fn, { signal: controller.signal })).rejects.toThrow(
        'Request was aborted'
      );

      expect(fn).not.toHaveBeenCalled();
    });

    it('respects abort signal during retry wait', async () => {
      const controller = new AbortController();
      const rateLimitError = createInferenceProviderError('Rate limit exceeded', { status: 429 });
      const fn = jest.fn().mockRejectedValue(rateLimitError);

      // Abort after a short delay
      setTimeout(() => controller.abort(), 50);

      await expect(
        withRateLimitRetry(fn, {
          signal: controller.signal,
          initialDelayMs: 1000, // Long delay to ensure abort happens during wait
          maxDurationMs: 10000,
        })
      ).rejects.toThrow('Request was aborted');
    });

    it('uses exponential backoff', async () => {
      const rateLimitError = createInferenceProviderError('Rate limit exceeded', { status: 429 });
      const timestamps: number[] = [];

      const fn = jest.fn().mockImplementation(async () => {
        timestamps.push(Date.now());
        if (fn.mock.calls.length < 4) {
          throw rateLimitError;
        }
        return 'success';
      });

      await withRateLimitRetry(fn, {
        initialDelayMs: 50,
        maxDurationMs: 10000,
      });

      // Check that delays roughly double (with some tolerance for timing)
      const delays = timestamps.slice(1).map((t, i) => t - timestamps[i]);
      expect(delays.length).toBe(3);

      // First delay should be around initialDelayMs (50ms)
      expect(delays[0]).toBeGreaterThanOrEqual(45);
      expect(delays[0]).toBeLessThan(100);

      // Second delay should be around 2x initial (100ms)
      expect(delays[1]).toBeGreaterThanOrEqual(90);
      expect(delays[1]).toBeLessThan(200);

      // Third delay should be around 4x initial (200ms)
      expect(delays[2]).toBeGreaterThanOrEqual(180);
      expect(delays[2]).toBeLessThan(400);
    });

    it('caps delay at maxDelayMs', async () => {
      const rateLimitError = createInferenceProviderError('Rate limit exceeded', { status: 429 });
      let callCount = 0;
      const timestamps: number[] = [];

      const fn = jest.fn().mockImplementation(async () => {
        timestamps.push(Date.now());
        callCount++;
        if (callCount < 5) {
          throw rateLimitError;
        }
        return 'success';
      });

      await withRateLimitRetry(fn, {
        initialDelayMs: 20,
        maxDelayMs: 50, // Cap at 50ms
        maxDurationMs: 10000,
      });

      // Delays: 20, 40, 50 (capped), 50 (capped)
      const delays = timestamps.slice(1).map((t, i) => t - timestamps[i]);

      // All delays after the first couple should be capped at maxDelayMs
      delays.slice(2).forEach((delay) => {
        expect(delay).toBeLessThan(80); // maxDelayMs + tolerance
      });
    });

    it('logs retry attempts when logger is provided', async () => {
      const rateLimitError = createInferenceProviderError('Rate limit exceeded', { status: 429 });
      const fn = jest.fn().mockRejectedValueOnce(rateLimitError).mockResolvedValueOnce('success');

      const mockLogger = {
        debug: jest.fn(),
        warn: jest.fn(),
      } as any;

      await withRateLimitRetry(fn, {
        initialDelayMs: 10,
        maxDurationMs: 1000,
        logger: mockLogger,
      });

      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('logs warning when budget exhausted', async () => {
      const rateLimitError = createInferenceProviderError('Rate limit exceeded', { status: 429 });
      const fn = jest.fn().mockRejectedValue(rateLimitError);

      const mockLogger = {
        debug: jest.fn(),
        warn: jest.fn(),
      } as any;

      await expect(
        withRateLimitRetry(fn, {
          initialDelayMs: 10,
          maxDurationMs: 50,
          logger: mockLogger,
        })
      ).rejects.toBeInstanceOf(RateLimitTimeoutError);

      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });
});
