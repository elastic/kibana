/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { Logger } from '@kbn/core/server';
import { createLoggerRetryReporter } from './logger_retry_reporter';
import { RetryService } from './retry_service';
import type { BackoffFactory, RetryReporter } from './types';

class RetryServiceTestClass extends RetryService {
  constructor(
    backOffFactory: BackoffFactory,
    maxAttempts?: number,
    private readonly retryable: boolean = true
  ) {
    super(backOffFactory, maxAttempts);
  }

  protected isRetryableError(error: Error) {
    return this.retryable;
  }
}

describe('RetryService', () => {
  const nextBackOff = jest.fn();
  const cb = jest.fn();

  const backOffFactory: BackoffFactory = {
    create: () => ({ nextBackOff }),
  };

  const mockLogger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
  const reporter = createLoggerRetryReporter(mockLogger, 'foobar');

  let service: RetryService;

  beforeEach(() => {
    jest.clearAllMocks();

    nextBackOff.mockReturnValue(1);
    service = new RetryServiceTestClass(backOffFactory);
  });

  it('should not retry after trying more than the max attempts', async () => {
    const maxAttempts = 3;
    service = new RetryServiceTestClass(backOffFactory, maxAttempts);

    cb.mockRejectedValue(new Error('My transient error'));

    await expect(() => service.retryWithBackoff(cb)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"My transient error"`
    );

    expect(cb).toHaveBeenCalledTimes(maxAttempts + 1);
    expect(nextBackOff).toHaveBeenCalledTimes(maxAttempts);
  });

  it.each([409, 429, 503])(
    'should retry and succeed retryable status code: %s',
    async (statusCode) => {
      const maxAttempts = 3;
      service = new RetryServiceTestClass(backOffFactory, maxAttempts);

      const error = new Error('My transient error');
      cb.mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue({ status: 'ok' });

      const res = await service.retryWithBackoff(cb);

      expect(nextBackOff).toHaveBeenCalledTimes(maxAttempts - 1);
      expect(cb).toHaveBeenCalledTimes(maxAttempts);
      expect(res).toEqual({ status: 'ok' });
    }
  );

  it('should succeed if cb does not throw', async () => {
    cb.mockResolvedValue({ status: 'ok' });

    const res = await service.retryWithBackoff(cb);

    expect(nextBackOff).toHaveBeenCalledTimes(0);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(res).toEqual({ status: 'ok' });
  });

  it('should not retry non-retryable errors', async () => {
    service = new RetryServiceTestClass(backOffFactory, undefined, false);
    cb.mockRejectedValue(new Error('My fatal error'));

    await expect(() => service.retryWithBackoff(cb)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"My fatal error"`
    );

    expect(cb).toHaveBeenCalledTimes(1);
    expect(nextBackOff).toHaveBeenCalledTimes(0);
  });

  it('should start every run from the first attempt with a fresh backoff', async () => {
    const maxAttempts = 2;
    const create = jest.fn(() => ({ nextBackOff }));
    service = new RetryServiceTestClass({ create }, maxAttempts);

    cb.mockRejectedValue(new Error('My transient error'));

    await expect(() => service.retryWithBackoff(cb)).rejects.toThrow('My transient error');
    await expect(() => service.retryWithBackoff(cb)).rejects.toThrow('My transient error');

    expect(cb).toHaveBeenCalledTimes((maxAttempts + 1) * 2);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('should keep concurrent runs independent', async () => {
    const maxAttempts = 1;
    service = new RetryServiceTestClass(backOffFactory, maxAttempts);

    const failing = jest.fn().mockRejectedValue(new Error('My transient error'));
    const succeeding = jest.fn().mockRejectedValueOnce(new Error('once')).mockResolvedValue('ok');

    const [failed, succeeded] = await Promise.allSettled([
      service.retryWithBackoff(failing),
      service.retryWithBackoff(succeeding),
    ]);

    expect(failed.status).toBe('rejected');
    expect(succeeded).toEqual({ status: 'fulfilled', value: 'ok' });
    expect(failing).toHaveBeenCalledTimes(maxAttempts + 1);
    expect(succeeding).toHaveBeenCalledTimes(2);
  });

  describe('Reporting', () => {
    const spyReporter: jest.Mocked<RetryReporter> = {
      onAttempt: jest.fn(),
      onRetry: jest.fn(),
      onSettled: jest.fn(),
    };

    it('should report every attempt, every retry and the settled run once', async () => {
      const error = new Error('My transient error');
      cb.mockRejectedValueOnce(error).mockRejectedValueOnce(error).mockResolvedValue('ok');

      await service.retryWithBackoff(cb, spyReporter);

      expect(spyReporter.onAttempt.mock.calls).toEqual([[0], [1], [2]]);
      expect(spyReporter.onRetry.mock.calls).toEqual([
        [error, 1],
        [error, 2],
      ]);
      expect(spyReporter.onSettled).toHaveBeenCalledTimes(1);
      expect(spyReporter.onSettled).toHaveBeenCalledWith(2);
    });

    it('should report the settled run once when attempts are exhausted', async () => {
      service = new RetryServiceTestClass(backOffFactory, 2);
      cb.mockRejectedValue(new Error('My transient error'));

      await expect(() => service.retryWithBackoff(cb, spyReporter)).rejects.toThrow();

      expect(spyReporter.onSettled).toHaveBeenCalledTimes(1);
      expect(spyReporter.onSettled).toHaveBeenCalledWith(2);
    });

    it('should run without a reporter', async () => {
      cb.mockRejectedValueOnce(new Error('My transient error')).mockResolvedValue('ok');

      await expect(service.retryWithBackoff(cb)).resolves.toBe('ok');
    });
  });

  describe('Logging', () => {
    it('should log a warning when retrying', async () => {
      service = new RetryServiceTestClass(backOffFactory, 2);

      cb.mockRejectedValue(new Error('My transient error'));

      await expect(() =>
        service.retryWithBackoff(cb, reporter)
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"My transient error"`);

      expect(mockLogger.warn).toHaveBeenCalledTimes(2);
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
