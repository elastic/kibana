/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('timers/promises');
import { setTimeout } from 'timers/promises';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { retryWithRecovery } from './retry_utils';

const setTimeoutMock = setTimeout as jest.Mock<
  ReturnType<typeof setTimeout>,
  Parameters<typeof setTimeout>
>;

describe('retryWithRecovery', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    jest.clearAllMocks();
    setTimeoutMock.mockResolvedValue(undefined);
    logger = loggingSystemMock.createLogger();
  });

  describe('successful operations', () => {
    it('should return result immediately if operation succeeds on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await retryWithRecovery(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(setTimeoutMock).not.toHaveBeenCalled();
    });

    it('should not retry if operation succeeds', async () => {
      const operation = jest.fn().mockResolvedValue({ data: 'test' });

      const result = await retryWithRecovery(operation, { maxAttempts: 3 });

      expect(result).toEqual({ data: 'test' });
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('retry attempts', () => {
    it('should retry on failure and succeed on second attempt', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce('success');

      const result = await retryWithRecovery(operation, { maxAttempts: 1 });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry multiple times until success', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Attempt 1 failed'))
        .mockRejectedValueOnce(new Error('Attempt 2 failed'))
        .mockResolvedValueOnce('success');

      const result = await retryWithRecovery(operation, { maxAttempts: 2 });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max attempts are reached', async () => {
      const error = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(error);

      await expect(retryWithRecovery(operation, { maxAttempts: 2 })).rejects.toThrow(
        'Operation failed'
      );

      expect(operation).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    });

    it('should use default maxAttempts of 1 (1 initial + 1 retry)', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce('success');

      const result = await retryWithRecovery(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('error filtering', () => {
    it('should retry only retryable errors', async () => {
      const retryableError = new Error('Retryable error');
      const nonRetryableError = new Error('Non-retryable error');

      const operation = jest
        .fn()
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(nonRetryableError);

      const isRetryableError = jest.fn((error: unknown) => {
        return error === retryableError;
      });

      await expect(
        retryWithRecovery(operation, {
          maxAttempts: 2,
          isRetryableError,
        })
      ).rejects.toThrow('Non-retryable error');

      expect(operation).toHaveBeenCalledTimes(2);
      expect(isRetryableError).toHaveBeenCalledWith(retryableError);
      expect(isRetryableError).toHaveBeenCalledWith(nonRetryableError);
    });

    it('should log debug message for non-retryable errors', async () => {
      const nonRetryableError = new Error('Non-retryable error');
      const operation = jest.fn().mockRejectedValue(nonRetryableError);

      const isRetryableError = jest.fn().mockReturnValue(false);

      await expect(
        retryWithRecovery(operation, {
          maxAttempts: 2,
          isRetryableError,
          logger,
        })
      ).rejects.toThrow('Non-retryable error');

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Non-retryable error encountered')
      );
    });

    it('should retry all errors by default', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce('success');

      const result = await retryWithRecovery(operation, { maxAttempts: 2 });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });

  describe('delays and backoff', () => {
    it('should not delay when initialDelayMs is 0', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValueOnce('success');

      await retryWithRecovery(operation, {
        maxAttempts: 1,
        initialDelayMs: 0,
      });

      expect(setTimeoutMock).not.toHaveBeenCalled();
    });

    it('should delay before retry when initialDelayMs is set', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValueOnce('success');

      await retryWithRecovery(operation, {
        maxAttempts: 1,
        initialDelayMs: 100,
      });

      expect(setTimeoutMock).toHaveBeenCalledWith(100);
    });

    it('should use constant delay when backoffMultiplier is 1', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce('success');

      await retryWithRecovery(operation, {
        maxAttempts: 2,
        initialDelayMs: 100,
        backoffMultiplier: 1,
      });

      expect(setTimeoutMock).toHaveBeenCalledTimes(2);
      expect(setTimeoutMock).toHaveBeenNthCalledWith(1, 100); // attempt 1: 100 * 1^0 = 100
      expect(setTimeoutMock).toHaveBeenNthCalledWith(2, 100); // attempt 2: 100 * 1^1 = 100
    });

    it('should use exponential backoff when backoffMultiplier is greater than 1', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockRejectedValueOnce(new Error('Error 3'))
        .mockResolvedValueOnce('success');

      await retryWithRecovery(operation, {
        maxAttempts: 3,
        initialDelayMs: 100,
        backoffMultiplier: 2,
      });

      expect(setTimeoutMock).toHaveBeenCalledTimes(3);
      expect(setTimeoutMock).toHaveBeenNthCalledWith(1, 100); // attempt 1: 100 * 2^0 = 100
      expect(setTimeoutMock).toHaveBeenNthCalledWith(2, 200); // attempt 2: 100 * 2^1 = 200
      expect(setTimeoutMock).toHaveBeenNthCalledWith(3, 400); // attempt 3: 100 * 2^2 = 400
    });

    it('should cap delay at maxDelayMs', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockRejectedValueOnce(new Error('Error 3'))
        .mockResolvedValueOnce('success');

      await retryWithRecovery(operation, {
        maxAttempts: 3,
        initialDelayMs: 100,
        backoffMultiplier: 2,
        maxDelayMs: 250,
      });

      expect(setTimeoutMock).toHaveBeenCalledTimes(3);
      expect(setTimeoutMock).toHaveBeenNthCalledWith(1, 100); // 100 * 2^0 = 100
      expect(setTimeoutMock).toHaveBeenNthCalledWith(2, 200); // 100 * 2^1 = 200
      expect(setTimeoutMock).toHaveBeenNthCalledWith(3, 250); // min(100 * 2^2 = 400, 250) = 250
    });

    it('should not delay when backoffMultiplier is undefined', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValueOnce('success');

      await retryWithRecovery(operation, {
        maxAttempts: 1,
        initialDelayMs: 100,
        backoffMultiplier: undefined,
      });

      expect(setTimeoutMock).not.toHaveBeenCalled();
    });
  });

  describe('onRetry callback', () => {
    it('should call onRetry before each retry attempt', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce('success');

      const onRetry = jest.fn().mockResolvedValue(undefined);

      await retryWithRecovery(operation, {
        maxAttempts: 2,
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenNthCalledWith(1, 1, expect.any(Error));
      expect(onRetry).toHaveBeenNthCalledWith(2, 2, expect.any(Error));
    });

    it('should continue retry even if onRetry throws an error', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockResolvedValueOnce('success');

      const onRetry = jest.fn().mockRejectedValue(new Error('Recovery failed'));

      const result = await retryWithRecovery(operation, {
        maxAttempts: 1,
        onRetry,
        logger,
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Error during recovery before retry attempt')
      );
    });

    it('should pass correct attempt number to onRetry', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce('success');

      const onRetry = jest.fn().mockResolvedValue(undefined);

      await retryWithRecovery(operation, {
        maxAttempts: 2,
        onRetry,
      });

      expect(onRetry).toHaveBeenNthCalledWith(1, 1, expect.any(Error));
      expect(onRetry).toHaveBeenNthCalledWith(2, 2, expect.any(Error));
    });
  });

  describe('logging', () => {
    it('should log retry attempts when logger is provided', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValueOnce('success');

      await retryWithRecovery(operation, {
        maxAttempts: 1,
        logger,
      });

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Retry attempt 1/1'));
    });

    it('should include operation name in log messages', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValueOnce('success');

      await retryWithRecovery(operation, {
        maxAttempts: 1,
        logger,
        operationName: 'testOperation',
      });

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('[testOperation]'));
    });

    it('should include delay in log message when delay is configured', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValueOnce('success');

      await retryWithRecovery(operation, {
        maxAttempts: 1,
        initialDelayMs: 100,
        logger,
      });

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('after 100ms delay'));
    });

    it('should log max attempts reached message', async () => {
      const error = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(error);

      await expect(
        retryWithRecovery(operation, {
          maxAttempts: 1,
          logger,
        })
      ).rejects.toThrow('Operation failed');

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Max retry attempts (1) reached')
      );
    });

    it('should not log if logger is not provided', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValueOnce('success');

      await retryWithRecovery(operation, {
        maxAttempts: 1,
      });

      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.debug).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should throw the last error when all attempts fail', async () => {
      const lastError = new Error('Last error');
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('First error'))
        .mockRejectedValueOnce(new Error('Second error'))
        .mockRejectedValueOnce(lastError);

      await expect(retryWithRecovery(operation, { maxAttempts: 2 })).rejects.toThrow('Last error');
    });

    it('should handle non-Error objects', async () => {
      const operation = jest.fn().mockRejectedValue('String error');

      await expect(retryWithRecovery(operation, { maxAttempts: 1 })).rejects.toBe('String error');
    });

    it('should handle null errors', async () => {
      const operation = jest.fn().mockRejectedValue(null);

      await expect(retryWithRecovery(operation, { maxAttempts: 1 })).rejects.toBe(null);
    });
  });

  describe('edge cases', () => {
    it('should handle maxAttempts of 0 (no retries)', async () => {
      const error = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(error);

      await expect(retryWithRecovery(operation, { maxAttempts: 0 })).rejects.toThrow(
        'Operation failed'
      );

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should handle very large maxAttempts', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValueOnce('success');

      const result = await retryWithRecovery(operation, { maxAttempts: 100 });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should handle maxDelayMs of 0', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValueOnce('success');

      await retryWithRecovery(operation, {
        maxAttempts: 1,
        initialDelayMs: 100,
        backoffMultiplier: 2,
        maxDelayMs: 0,
      });

      // When maxDelayMs is 0, the delay is capped to 0, so setTimeout should not be called
      // (since delayMs > 0 check prevents calling setTimeout with 0)
      expect(setTimeoutMock).not.toHaveBeenCalled();
    });

    it('should handle Infinity maxDelayMs', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce('success');

      await retryWithRecovery(operation, {
        maxAttempts: 2,
        initialDelayMs: 100,
        backoffMultiplier: 2,
        maxDelayMs: Infinity,
      });

      expect(setTimeoutMock).toHaveBeenNthCalledWith(1, 100);
      expect(setTimeoutMock).toHaveBeenNthCalledWith(2, 200);
    });
  });

  describe('complex scenarios', () => {
    it('should handle retry with all options combined', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce('success');

      const onRetry = jest.fn().mockResolvedValue(undefined);
      const isRetryableError = jest.fn().mockReturnValue(true);

      const result = await retryWithRecovery(operation, {
        maxAttempts: 2,
        initialDelayMs: 50,
        backoffMultiplier: 2,
        maxDelayMs: 200,
        isRetryableError,
        onRetry,
        logger,
        operationName: 'complexOperation',
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(setTimeoutMock).toHaveBeenNthCalledWith(1, 50);
      expect(setTimeoutMock).toHaveBeenNthCalledWith(2, 100);
      expect(logger.warn).toHaveBeenCalledTimes(2);
    });

    it('should handle operation that returns different values on retries', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValueOnce('first success')
        .mockResolvedValueOnce('second success');

      const result = await retryWithRecovery(operation, { maxAttempts: 1 });

      expect(result).toBe('first success');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });
});
