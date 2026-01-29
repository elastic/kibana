/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  retryWithBackoff,
  createRetryWrapper,
  isTransientError,
} from './retry_with_backoff';

describe('retry_with_backoff', () => {
  let logger: MockedLogger;

  beforeEach(() => {
    logger = loggerMock.create();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isTransientError', () => {
    it('returns true for rate limit errors', () => {
      expect(isTransientError(new Error('Rate limit exceeded'))).toBe(true);
      expect(isTransientError(new Error('Too many requests'))).toBe(true);
      expect(isTransientError(new Error('Quota exceeded'))).toBe(true);
      expect(isTransientError(new Error('Request throttled'))).toBe(true);
    });

    it('returns true for timeout errors', () => {
      expect(isTransientError(new Error('Request timeout'))).toBe(true);
      expect(isTransientError(new Error('Connection timed out'))).toBe(true);
      expect(isTransientError(new Error('Deadline exceeded'))).toBe(true);
    });

    it('returns true for network errors', () => {
      expect(isTransientError(new Error('Network error'))).toBe(true);
      expect(isTransientError(new Error('Connection reset'))).toBe(true);
      expect(isTransientError(new Error('ECONNRESET'))).toBe(true);
      expect(isTransientError(new Error('ECONNREFUSED'))).toBe(true);
      expect(isTransientError(new Error('ETIMEDOUT'))).toBe(true);
      expect(isTransientError(new Error('Socket hang up'))).toBe(true);
    });

    it('returns true for service unavailable errors', () => {
      expect(isTransientError(new Error('Service unavailable'))).toBe(true);
      expect(isTransientError(new Error('Internal server error'))).toBe(true);
      expect(isTransientError(new Error('Bad gateway'))).toBe(true);
      expect(isTransientError(new Error('Gateway timeout'))).toBe(true);
    });

    it('returns true for retryable status codes', () => {
      expect(isTransientError({ status: 429 })).toBe(true);
      expect(isTransientError({ status: 500 })).toBe(true);
      expect(isTransientError({ status: 502 })).toBe(true);
      expect(isTransientError({ status: 503 })).toBe(true);
      expect(isTransientError({ status: 504 })).toBe(true);
      expect(isTransientError({ statusCode: 408 })).toBe(true);
    });

    it('returns false for non-retryable errors', () => {
      expect(isTransientError(new Error('Invalid input'))).toBe(false);
      expect(isTransientError(new Error('Authentication failed'))).toBe(false);
      expect(isTransientError(new Error('Not found'))).toBe(false);
      expect(isTransientError({ status: 400 })).toBe(false);
      expect(isTransientError({ status: 401 })).toBe(false);
      expect(isTransientError({ status: 404 })).toBe(false);
    });

    it('returns false for AbortError', () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      expect(isTransientError(abortError)).toBe(false);
    });

    it('returns false for null/undefined', () => {
      expect(isTransientError(null)).toBe(false);
      expect(isTransientError(undefined)).toBe(false);
    });

    it('returns true for errors with code property', () => {
      expect(isTransientError({ code: 429 })).toBe(true);
      expect(isTransientError({ code: 503 })).toBe(true);
      expect(isTransientError({ code: 504 })).toBe(true);
    });

    it('returns true for string errors matching patterns', () => {
      expect(isTransientError('Rate limit exceeded')).toBe(true);
      expect(isTransientError('Connection timeout')).toBe(true);
      expect(isTransientError('Network error occurred')).toBe(true);
    });

    it('returns false for string errors not matching patterns', () => {
      expect(isTransientError('Invalid input')).toBe(false);
      expect(isTransientError('Permission denied')).toBe(false);
    });

    it('returns true for overloaded/capacity errors', () => {
      expect(isTransientError(new Error('Server overloaded'))).toBe(true);
      expect(isTransientError(new Error('Capacity exceeded'))).toBe(true);
    });

    it('returns true for ENOTFOUND errors', () => {
      expect(isTransientError(new Error('ENOTFOUND'))).toBe(true);
    });

    it('handles object errors via JSON stringify', () => {
      // Objects that don't have message, status, statusCode, or code
      // are converted to JSON string and pattern matched
      expect(isTransientError({ error: 'rate limit exceeded' })).toBe(true);
      expect(isTransientError({ error: 'unknown error' })).toBe(false);
    });
  });

  describe('retryWithBackoff', () => {
    it('returns result on first successful attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await retryWithBackoff(operation, { maxRetries: 3 });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('retries on transient errors and succeeds', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockResolvedValue('success');

      const result = await retryWithBackoff(operation, {
        maxRetries: 3,
        initialDelayMs: 10, // Use short delays for testing
        logger,
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
      expect(logger.warn).toHaveBeenCalledTimes(2);
    });

    it('throws after max retries exhausted', async () => {
      const error = new Error('Rate limit exceeded');
      const operation = jest.fn().mockRejectedValue(error);

      await expect(
        retryWithBackoff(operation, {
          maxRetries: 2,
          initialDelayMs: 10,
          logger,
        })
      ).rejects.toThrow('Rate limit exceeded');

      expect(operation).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
      expect(logger.warn).toHaveBeenCalledTimes(3); // 2 retry warnings + 1 max attempts warning
    });

    it('does not retry non-retryable errors', async () => {
      const error = new Error('Invalid input');
      const operation = jest.fn().mockRejectedValue(error);

      await expect(
        retryWithBackoff(operation, {
          maxRetries: 3,
          logger,
        })
      ).rejects.toThrow('Invalid input');

      expect(operation).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Non-retryable error')
      );
    });

    it('uses custom isRetryableError function', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Custom retryable'))
        .mockResolvedValue('success');

      const result = await retryWithBackoff(operation, {
        maxRetries: 3,
        initialDelayMs: 10,
        isRetryableError: (err) => err instanceof Error && err.message === 'Custom retryable',
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('applies exponential backoff correctly', async () => {
      const delays: number[] = [];
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockResolvedValue('success');

      await retryWithBackoff(operation, {
        maxRetries: 3,
        initialDelayMs: 10,
        backoffMultiplier: 2,
        jitter: 0, // Disable jitter for predictable testing
        onRetry: (_attempt, _error, delayMs) => {
          delays.push(delayMs);
        },
      });

      expect(delays).toEqual([10, 20, 40]); // 10, 10*2, 10*4
    });

    it('respects maxDelayMs cap', async () => {
      const delays: number[] = [];
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockResolvedValue('success');

      await retryWithBackoff(operation, {
        maxRetries: 2,
        initialDelayMs: 10,
        backoffMultiplier: 10,
        maxDelayMs: 50,
        jitter: 0,
        onRetry: (_attempt, _error, delayMs) => {
          delays.push(delayMs);
        },
      });

      expect(delays).toEqual([10, 50]); // Second delay capped at 50, not 100
    });

    it('calls onRetry callback before each retry', async () => {
      const onRetry = jest.fn();
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Rate limit error 1'))
        .mockRejectedValueOnce(new Error('Rate limit error 2'))
        .mockResolvedValue('success');

      await retryWithBackoff(operation, {
        maxRetries: 3,
        initialDelayMs: 10,
        jitter: 0,
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenNthCalledWith(1, 1, expect.any(Error), 10);
      expect(onRetry).toHaveBeenNthCalledWith(2, 2, expect.any(Error), 20);
    });

    it('continues retry even if onRetry callback throws', async () => {
      const onRetry = jest.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockResolvedValue('success');

      const result = await retryWithBackoff(operation, {
        maxRetries: 3,
        initialDelayMs: 10,
        onRetry,
        logger,
      });

      expect(result).toBe('success');
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Error during onRetry callback')
      );
    });

    it('respects abort signal before first attempt', async () => {
      const controller = new AbortController();
      controller.abort();

      const operation = jest.fn().mockResolvedValue('success');

      await expect(
        retryWithBackoff(operation, {
          abortSignal: controller.signal,
        })
      ).rejects.toThrow('Operation aborted');

      expect(operation).not.toHaveBeenCalled();
    });

    it('respects abort signal during sleep', async () => {
      const controller = new AbortController();
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockResolvedValue('success');

      const promise = retryWithBackoff(operation, {
        maxRetries: 5,
        initialDelayMs: 1000, // Long delay so we can abort during it
        abortSignal: controller.signal,
      });

      // Wait for first operation to fail, then abort
      await new Promise((resolve) => setTimeout(resolve, 50));
      controller.abort();

      await expect(promise).rejects.toThrow('Operation aborted');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('includes operation name in log messages', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockResolvedValue('success');

      await retryWithBackoff(operation, {
        maxRetries: 3,
        initialDelayMs: 10,
        operationName: 'test-operation',
        logger,
      });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[test-operation]')
      );
    });

    it('handles zero maxRetries (no retries)', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Rate limit'));

      await expect(
        retryWithBackoff(operation, {
          maxRetries: 0,
          logger,
        })
      ).rejects.toThrow('Rate limit');

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('adds jitter to delay times', async () => {
      const delays: number[] = [];
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockResolvedValue('success');

      // Run multiple times to verify jitter adds randomness
      await retryWithBackoff(operation, {
        maxRetries: 2,
        initialDelayMs: 100,
        jitter: 0.5, // 50% jitter
        onRetry: (_attempt, _error, delayMs) => {
          delays.push(delayMs);
        },
      });

      // With 50% jitter, delays should be within 50-150ms and 100-300ms
      // But they shouldn't all be exactly 100 and 200
      expect(delays.length).toBe(2);
      expect(delays[0]).toBeGreaterThanOrEqual(50);
      expect(delays[0]).toBeLessThanOrEqual(150);
      expect(delays[1]).toBeGreaterThanOrEqual(100);
      expect(delays[1]).toBeLessThanOrEqual(300);
    });

    it('works with default options when none provided', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await retryWithBackoff(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('supports async onRetry callback', async () => {
      const onRetryResults: number[] = [];
      const asyncOnRetry = jest.fn().mockImplementation(async (attempt: number) => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        onRetryResults.push(attempt);
      });
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockResolvedValue('success');

      await retryWithBackoff(operation, {
        maxRetries: 3,
        initialDelayMs: 10,
        jitter: 0,
        onRetry: asyncOnRetry,
      });

      expect(asyncOnRetry).toHaveBeenCalledTimes(1);
      expect(onRetryResults).toEqual([1]);
    });

    it('handles operation that throws non-Error objects', async () => {
      const operation = jest.fn().mockRejectedValue('string error with rate limit');

      await expect(
        retryWithBackoff(operation, {
          maxRetries: 1,
          initialDelayMs: 10,
        })
      ).rejects.toBe('string error with rate limit');

      // String containing 'rate limit' is retryable
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('handles operation that throws object with status code', async () => {
      const errorObj = { status: 503, message: 'Service unavailable' };
      const operation = jest.fn().mockRejectedValue(errorObj);

      await expect(
        retryWithBackoff(operation, {
          maxRetries: 1,
          initialDelayMs: 10,
        })
      ).rejects.toEqual(errorObj);

      // Status 503 is retryable
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('handles very large backoff multiplier with max delay cap', async () => {
      const delays: number[] = [];
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockResolvedValue('success');

      await retryWithBackoff(operation, {
        maxRetries: 1,
        initialDelayMs: 100,
        backoffMultiplier: 100, // Very large multiplier
        maxDelayMs: 200, // But capped at 200ms
        jitter: 0,
        onRetry: (_attempt, _error, delayMs) => {
          delays.push(delayMs);
        },
      });

      expect(delays).toEqual([100]); // First retry uses initial delay
    });

    it('logs non-retryable error without operation name prefix', async () => {
      const error = new Error('Invalid input');
      const operation = jest.fn().mockRejectedValue(error);

      await expect(
        retryWithBackoff(operation, {
          maxRetries: 3,
          logger,
          // No operationName provided
        })
      ).rejects.toThrow('Invalid input');

      // Should log without prefix
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Non-retryable error encountered: Invalid input')
      );
    });

    it('handles zero delay correctly', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockResolvedValue('success');

      const result = await retryWithBackoff(operation, {
        maxRetries: 1,
        initialDelayMs: 0,
        jitter: 0,
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('createRetryWrapper', () => {
    it('creates a wrapper with default options', async () => {
      const retryable = createRetryWrapper({
        maxRetries: 2,
        initialDelayMs: 10,
        jitter: 0,
      });

      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockResolvedValue('success');

      const result = await retryable(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('allows overriding options per call', async () => {
      const retryable = createRetryWrapper({
        maxRetries: 1,
        initialDelayMs: 10,
        jitter: 0,
      });

      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockResolvedValue('success');

      const result = await retryable(operation, { maxRetries: 3 });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('preserves logger from default options', async () => {
      const retryable = createRetryWrapper({
        maxRetries: 2,
        initialDelayMs: 10,
        jitter: 0,
        logger,
        operationName: 'wrapped-op',
      });

      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockResolvedValue('success');

      await retryable(operation);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[wrapped-op]')
      );
    });

    it('can be reused for multiple operations', async () => {
      const retryable = createRetryWrapper({
        maxRetries: 1,
        initialDelayMs: 5,
        jitter: 0,
      });

      const operation1 = jest.fn().mockResolvedValue('result1');
      const operation2 = jest.fn().mockResolvedValue('result2');

      const [result1, result2] = await Promise.all([
        retryable(operation1),
        retryable(operation2),
      ]);

      expect(result1).toBe('result1');
      expect(result2).toBe('result2');
      expect(operation1).toHaveBeenCalledTimes(1);
      expect(operation2).toHaveBeenCalledTimes(1);
    });

    it('handles different return types', async () => {
      const retryable = createRetryWrapper({
        maxRetries: 1,
        initialDelayMs: 5,
      });

      const stringOp = jest.fn().mockResolvedValue('string');
      const numberOp = jest.fn().mockResolvedValue(42);
      const objectOp = jest.fn().mockResolvedValue({ key: 'value' });

      const stringResult = await retryable(stringOp);
      const numberResult = await retryable(numberOp);
      const objectResult = await retryable(objectOp);

      expect(stringResult).toBe('string');
      expect(numberResult).toBe(42);
      expect(objectResult).toEqual({ key: 'value' });
    });
  });
});
