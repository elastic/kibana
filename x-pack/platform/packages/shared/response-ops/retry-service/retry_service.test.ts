/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { Logger } from '@kbn/core/server';
import { RetryService } from './retry_service';
import type { BackoffFactory } from './types';

class RetryServiceTestClass extends RetryService {
  protected isRetryableError(error: Error) {
    return true;
  }
}

describe('RetryService', () => {
  const nextBackOff = jest.fn();
  const cb = jest.fn();

  const backOffFactory: BackoffFactory = {
    create: () => ({ nextBackOff }),
  };

  const mockLogger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

  let service: RetryService;

  beforeEach(() => {
    jest.clearAllMocks();

    nextBackOff.mockReturnValue(1);
    service = new RetryServiceTestClass(mockLogger, backOffFactory, 'foobar');
  });

  it('should not retry after trying more than the max attempts', async () => {
    const maxAttempts = 3;
    service = new RetryServiceTestClass(mockLogger, backOffFactory, 'foobar', maxAttempts);

    cb.mockRejectedValue(new Error('My transient error'));

    await expect(() => service.retryWithBackoff(cb)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"My transient error"`
    );

    expect(cb).toBeCalledTimes(maxAttempts + 1);
    expect(nextBackOff).toBeCalledTimes(maxAttempts);
  });

  it.each([409, 429, 503])(
    'should retry and succeed retryable status code: %s',
    async (statusCode) => {
      const maxAttempts = 3;
      service = new RetryServiceTestClass(mockLogger, backOffFactory, 'foobar', maxAttempts);

      const error = new Error('My transient error');
      cb.mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue({ status: 'ok' });

      const res = await service.retryWithBackoff(cb);

      expect(nextBackOff).toBeCalledTimes(maxAttempts - 1);
      expect(cb).toBeCalledTimes(maxAttempts);
      expect(res).toEqual({ status: 'ok' });
    }
  );

  it('should succeed if cb does not throw', async () => {
    service = new RetryServiceTestClass(mockLogger, backOffFactory, 'foobar');

    cb.mockResolvedValue({ status: 'ok' });

    const res = await service.retryWithBackoff(cb);

    expect(nextBackOff).toBeCalledTimes(0);
    expect(cb).toBeCalledTimes(1);
    expect(res).toEqual({ status: 'ok' });
  });

  describe('Logging', () => {
    it('should log a warning when retrying', async () => {
      service = new RetryServiceTestClass(mockLogger, backOffFactory, 'foobar', 2);

      cb.mockRejectedValue(new Error('My transient error'));

      await expect(() => service.retryWithBackoff(cb)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"My transient error"`
      );

      expect(mockLogger.warn).toBeCalledTimes(2);
      expect(mockLogger.warn).toHaveBeenNthCalledWith(
        1,
        '[foobar][retryWithBackoff] Failed with error "My transient error". Attempt for retry: 1'
      );

      expect(mockLogger.warn).toHaveBeenNthCalledWith(
        2,
        '[foobar][retryWithBackoff] Failed with error "My transient error". Attempt for retry: 2'
      );
    });
  });
});
