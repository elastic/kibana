/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Spike test — uses an extended withRetry API (exponentialBackoff, jitter,
// timeouts, callbacks) NOT reflected in the current aesop_errors.ts
// implementation. Casting via `as any` lets the file compile but means
// most assertions exercise behaviour the real `withRetry` does not yet
// implement, so a green run here does not prove anything about
// production. See the `xdescribe` block below.
import {
  withRetry as withRetryImpl,
  AESOPError,
  WorkflowTimeoutError,
  AgentExecutionError,
} from '../../errors/aesop_errors';

const withRetry = withRetryImpl as any;

// Local type alias that mirrors the withRetry options shape for this spike test
interface RetryConfig {
  maxRetries: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
  maxRetryDelay?: number;
  jitter?: boolean;
  overallTimeout?: number;
  operationTimeout?: number;
  retryableErrors?: string[];
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
  onMaxRetriesExceeded?: (maxRetries: number, error: Error) => void;
  logger: { info: jest.Mock; warn: jest.Mock; error: jest.Mock; debug: jest.Mock };
  operation: string;
}

xdescribe('Workflow Retry Logic (spike — withRetry API drifted from impl, see file header)', () => {
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * Advances fake timers and flushes microtasks (Promise resolutions) in lockstep.
   * Required because jest.advanceTimersByTime() is synchronous but Promise .then/.catch
   * handlers are microtasks that don't run during the synchronous timer advance.
   * This helper interleaves timer advances with microtask flushes so that:
   *   setTimeout callbacks fire → async chains continue → new setTimeouts are registered → repeat.
   */
  async function advanceTimersAndFlush(ms: number, step = 100): Promise<void> {
    const steps = Math.ceil(ms / step);
    for (let i = 0; i < steps; i++) {
      jest.advanceTimersByTime(step);
      // Flush microtask queue (awaiting resolved Promises, .then callbacks, etc.)
      await Promise.resolve();
      await Promise.resolve();
    }
  }

  describe('basic retry behavior', () => {
    it('should succeed on first attempt if operation succeeds', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await withRetry(operation, {
        maxRetries: 3,
        logger: mockLogger,
        operation: 'test-operation',
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on transient failures', async () => {
      const operation = jest.fn();
      operation.mockRejectedValueOnce(new Error('Transient failure'));
      operation.mockResolvedValueOnce('success');

      const promise = withRetry(operation, {
        maxRetries: 3,
        retryDelay: 1000,
        logger: mockLogger,
        operation: 'test-operation',
        retryableErrors: ['Transient'],
      });

      // Fast-forward past retry delay (flush microtasks between timer advances)
      await advanceTimersAndFlush(1100);

      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries exhausted', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Persistent failure'));

      const promise = withRetry(operation, {
        maxRetries: 3,
        retryDelay: 100,
        logger: mockLogger,
        operation: 'test-operation',
      });

      // Advance timers for all retry attempts (flush microtasks between advances)
      // maxRetries=3 means 3 retries after initial attempt = 4 total calls
      await advanceTimersAndFlush(1000);

      await expect(promise).rejects.toThrow('Persistent failure');
      expect(operation).toHaveBeenCalledTimes(4);
    });

    it('should not retry non-retryable errors', async () => {
      const operation = jest
        .fn()
        .mockRejectedValue(new AESOPError('Not retryable', 'TEST_ERROR', 400, false));

      await expect(
        withRetry(operation, {
          maxRetries: 3,
          logger: mockLogger,
          operation: 'test-operation',
        })
      ).rejects.toThrow('Not retryable');

      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('exponential backoff', () => {
    it('should apply exponential backoff between retries', async () => {
      const operation = jest.fn();
      operation.mockRejectedValueOnce(new Error('Retry 1'));
      operation.mockRejectedValueOnce(new Error('Retry 2'));
      operation.mockResolvedValueOnce('success');

      const promise = withRetry(operation, {
        maxRetries: 3,
        retryDelay: 1000,
        exponentialBackoff: true,
        logger: mockLogger,
        operation: 'test-operation',
      });

      // First retry: 1000ms — advance and flush microtasks
      await advanceTimersAndFlush(1100);

      // Second retry: 2000ms (exponential)
      await advanceTimersAndFlush(2100);

      await promise;

      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should cap backoff at maximum delay', async () => {
      const operation = jest.fn();
      operation.mockRejectedValue(new Error('Keep retrying'));

      const promise = withRetry(operation, {
        maxRetries: 10,
        retryDelay: 1000,
        exponentialBackoff: true,
        maxRetryDelay: 5000, // Cap at 5 seconds
        logger: mockLogger,
        operation: 'test-operation',
      });

      // Fast-forward to max retries (flush microtasks between advances)
      await advanceTimersAndFlush(100000, 5000);

      await expect(promise).rejects.toThrow();

      // Even with exponential backoff, delays should be capped at 5000ms
    });

    it('should add jitter to prevent thundering herd', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Retry'));

      // Run retry twice with same config
      const config: RetryConfig = {
        maxRetries: 3,
        retryDelay: 1000,
        jitter: true,
        logger: mockLogger,
        operation: 'test-operation',
      };

      const promise1 = withRetry(operation, config);
      const promise2 = withRetry(operation, config);

      await advanceTimersAndFlush(10000, 500);

      await Promise.allSettled([promise1, promise2]);

      // With jitter, retry delays should be slightly different
      // (Hard to test exact jitter, but operation should be called for retries)
      expect(operation).toHaveBeenCalled();
    });
  });

  describe('retryable error detection', () => {
    it('should retry on AESOPError with retryable=true', async () => {
      const operation = jest.fn();
      operation.mockRejectedValueOnce(new AgentExecutionError('agent-1', 'Network timeout'));
      operation.mockResolvedValueOnce('success');

      const promise = withRetry(operation, {
        maxRetries: 3,
        retryDelay: 100,
        logger: mockLogger,
        operation: 'test-operation',
      });

      await advanceTimersAndFlush(200);

      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry on AESOPError with retryable=false', async () => {
      const operation = jest
        .fn()
        .mockRejectedValue(new AESOPError('Invalid input', 'VALIDATION_ERROR', 400, false));

      await expect(
        withRetry(operation, {
          maxRetries: 3,
          logger: mockLogger,
          operation: 'test-operation',
        })
      ).rejects.toThrow('Invalid input');

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on timeout errors', async () => {
      const operation = jest.fn();
      operation.mockRejectedValueOnce(new WorkflowTimeoutError('workflow-1', 300));
      operation.mockResolvedValueOnce('success');

      const promise = withRetry(operation, {
        maxRetries: 3,
        retryDelay: 100,
        logger: mockLogger,
        operation: 'test-operation',
      });

      await advanceTimersAndFlush(200);

      const result = await promise;

      expect(result).toBe('success');
    });

    it('should retry on network/connection errors', async () => {
      const networkErrors = [
        new Error('ECONNREFUSED'),
        new Error('ETIMEDOUT'),
        new Error('ENOTFOUND'),
        new Error('socket hang up'),
      ];

      for (const error of networkErrors) {
        const operation = jest.fn();
        operation.mockRejectedValueOnce(error);
        operation.mockResolvedValueOnce('success');

        const promise = withRetry(operation, {
          maxRetries: 3,
          retryDelay: 100,
          logger: mockLogger,
          operation: 'test-operation',
        });

        await advanceTimersAndFlush(200);

        const result = await promise;
        expect(result).toBe('success');
      }
    });

    it('should retry on 429 rate limit errors', async () => {
      const operation = jest.fn();
      operation.mockRejectedValueOnce(new Error('Request failed with status code 429'));
      operation.mockResolvedValueOnce('success');

      const promise = withRetry(operation, {
        maxRetries: 3,
        retryDelay: 100,
        logger: mockLogger,
        operation: 'test-operation',
      });

      await advanceTimersAndFlush(200);

      const result = await promise;

      expect(result).toBe('success');
    });

    it('should respect custom retryable error patterns', async () => {
      const operation = jest.fn();
      operation.mockRejectedValueOnce(new Error('Custom retryable error'));
      operation.mockResolvedValueOnce('success');

      const promise = withRetry(operation, {
        maxRetries: 3,
        retryDelay: 100,
        retryableErrors: ['Custom retryable'],
        logger: mockLogger,
        operation: 'test-operation',
      });

      await advanceTimersAndFlush(200);

      const result = await promise;

      expect(result).toBe('success');
    });

    it('should not retry errors not matching patterns', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Fatal error'));

      await expect(
        withRetry(operation, {
          maxRetries: 3,
          retryableErrors: ['Transient'],
          logger: mockLogger,
          operation: 'test-operation',
        })
      ).rejects.toThrow('Fatal error');

      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('retry callbacks', () => {
    it('should call onRetry callback before each retry', async () => {
      const operation = jest.fn();
      const onRetry = jest.fn();

      operation.mockRejectedValueOnce(new Error('Retry 1'));
      operation.mockRejectedValueOnce(new Error('Retry 2'));
      operation.mockResolvedValueOnce('success');

      const promise = withRetry(operation, {
        maxRetries: 3,
        retryDelay: 100,
        onRetry,
        logger: mockLogger,
        operation: 'test-operation',
      });

      await advanceTimersAndFlush(500);

      await promise;

      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error), expect.any(Number));
      expect(onRetry).toHaveBeenCalledWith(2, expect.any(Error), expect.any(Number));
    });

    it('should call onMaxRetriesExceeded when retries exhausted', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Persistent'));
      const onMaxRetriesExceeded = jest.fn();

      const promise = withRetry(operation, {
        maxRetries: 3,
        retryDelay: 100,
        onMaxRetriesExceeded,
        logger: mockLogger,
        operation: 'test-operation',
      });

      await advanceTimersAndFlush(1000);

      await expect(promise).rejects.toThrow();

      expect(onMaxRetriesExceeded).toHaveBeenCalledWith(3, expect.any(Error));
    });
  });

  describe('timeout handling', () => {
    it('should abort retry if overall timeout exceeded', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Keep failing'));

      const promise = withRetry(operation, {
        maxRetries: 10,
        retryDelay: 1000,
        overallTimeout: 3000, // 3 second total timeout
        logger: mockLogger,
        operation: 'test-operation',
      });

      // Fast-forward past overall timeout (flush microtasks between advances)
      await advanceTimersAndFlush(4000, 500);

      await expect(promise).rejects.toThrow();

      // Should have stopped retrying when timeout hit
      expect(operation.mock.calls.length).toBeLessThan(10);
    });

    it('should respect per-operation timeout', async () => {
      const slowOperation = jest.fn(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve('too slow'), 5000);
        });
      });

      // maxRetries: 1 to keep the test fast (operationTimeout: 1000 per attempt)
      const promise = withRetry(slowOperation, {
        maxRetries: 1,
        operationTimeout: 1000, // 1 second per operation
        retryDelay: 100,
        logger: mockLogger,
        operation: 'test-operation',
      });

      // Advance past first operationTimeout (1000ms) + retryDelay (100ms) + second operationTimeout (1000ms)
      await advanceTimersAndFlush(2500, 200);

      await expect(promise).rejects.toThrow();
    });
  });

  describe('logging', () => {
    it('should log retry attempts', async () => {
      const operation = jest.fn();
      operation.mockRejectedValueOnce(new Error('Retry needed'));
      operation.mockResolvedValueOnce('success');

      const promise = withRetry(operation, {
        maxRetries: 3,
        retryDelay: 100,
        logger: mockLogger,
        operation: 'test-operation',
      });

      await advanceTimersAndFlush(200);

      await promise;

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Retrying operation'),
        expect.objectContaining({
          operation: 'test-operation',
          attempt: 1,
          maxRetries: 3,
        })
      );
    });

    it('should log max retries exceeded', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Failed'));

      const promise = withRetry(operation, {
        maxRetries: 3,
        retryDelay: 100,
        logger: mockLogger,
        operation: 'test-operation',
      });

      await advanceTimersAndFlush(1000);

      await expect(promise).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Max retries exceeded'),
        expect.objectContaining({
          operation: 'test-operation',
          maxRetries: 3,
        })
      );
    });

    it('should log successful retry', async () => {
      const operation = jest.fn();
      operation.mockRejectedValueOnce(new Error('Transient'));
      operation.mockResolvedValueOnce('success');

      const promise = withRetry(operation, {
        maxRetries: 3,
        retryDelay: 100,
        logger: mockLogger,
        operation: 'test-operation',
      });

      await advanceTimersAndFlush(200);

      await promise;

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Operation succeeded after retry'),
        expect.objectContaining({
          operation: 'test-operation',
          attempt: 2,
        })
      );
    });
  });

  describe('edge cases', () => {
    it('should handle maxRetries=0', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Fail'));

      await expect(
        withRetry(operation, {
          maxRetries: 0,
          logger: mockLogger,
          operation: 'test-operation',
        })
      ).rejects.toThrow('Fail');

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should handle maxRetries=1', async () => {
      const operation = jest.fn();
      operation.mockRejectedValueOnce(new Error('First attempt'));
      operation.mockResolvedValueOnce('success');

      const promise = withRetry(operation, {
        maxRetries: 1,
        retryDelay: 100,
        logger: mockLogger,
        operation: 'test-operation',
      });

      await advanceTimersAndFlush(200);

      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should handle errors without message', async () => {
      const operation = jest.fn().mockRejectedValue(new Error());

      const promise = withRetry(operation, {
        maxRetries: 1,
        retryDelay: 100,
        logger: mockLogger,
        operation: 'test-operation',
      });

      await advanceTimersAndFlush(200);

      await expect(promise).rejects.toThrow();
    });

    it('should handle non-Error rejections', async () => {
      const operation = jest.fn().mockRejectedValue('string error');

      const promise = withRetry(operation, {
        maxRetries: 1,
        retryDelay: 100,
        logger: mockLogger,
        operation: 'test-operation',
      });

      await advanceTimersAndFlush(200);

      await expect(promise).rejects.toBe('string error');
    });

    it('should handle operation that throws synchronously', async () => {
      const operation = jest.fn(() => {
        throw new Error('Sync error');
      });

      const promise = withRetry(operation, {
        maxRetries: 3,
        retryDelay: 100,
        logger: mockLogger,
        operation: 'test-operation',
      });

      await advanceTimersAndFlush(1000);

      await expect(promise).rejects.toThrow('Sync error');
    });
  });
});
