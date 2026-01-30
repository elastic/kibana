/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-browser-mocks';
import type { Logger } from '@kbn/core/server';
import { errors as EsErrors } from '@elastic/elasticsearch';
import { CasesAnalyticsRetryService } from './cases_analytics_retry_service';
import type { BackoffFactory } from '@kbn/response-ops-retry-service';

describe('CasesAnalyticsRetryService', () => {
  const nextBackOff = jest.fn();
  const cb = jest.fn();
  const retryableError = new EsErrors.ConnectionError('My retryable error');

  const backOffFactory: BackoffFactory = {
    create: () => ({ nextBackOff }),
  };

  const mockLogger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

  let service: CasesAnalyticsRetryService;

  beforeEach(() => {
    jest.clearAllMocks();

    nextBackOff.mockReturnValue(1);
    service = new CasesAnalyticsRetryService(mockLogger, backOffFactory);
  });

  it('should not retry if the error is not a retryable ElasticsearchClientError', async () => {
    cb.mockRejectedValue(new Error('My error'));

    await expect(() => service.retryWithBackoff(cb)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"My error"`
    );

    expect(cb).toBeCalledTimes(1);
    expect(nextBackOff).not.toBeCalled();
  });

  it('should not retry after trying more than the max attempts', async () => {
    const maxAttempts = 3;
    service = new CasesAnalyticsRetryService(mockLogger, backOffFactory, maxAttempts);

    cb.mockRejectedValue(retryableError);

    await expect(() => service.retryWithBackoff(cb)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"My retryable error"`
    );

    expect(cb).toBeCalledTimes(maxAttempts + 1);
    expect(nextBackOff).toBeCalledTimes(maxAttempts);
  });

  it('should succeed if cb does not throw', async () => {
    service = new CasesAnalyticsRetryService(mockLogger, backOffFactory);

    cb.mockResolvedValue({ status: 'ok' });

    const res = await service.retryWithBackoff(cb);

    expect(nextBackOff).toBeCalledTimes(0);
    expect(cb).toBeCalledTimes(1);
    expect(res).toEqual({ status: 'ok' });
  });

  describe('Logging', () => {
    it('should log a warning when retrying', async () => {
      service = new CasesAnalyticsRetryService(mockLogger, backOffFactory, 2);

      cb.mockRejectedValue(retryableError);

      await expect(() => service.retryWithBackoff(cb)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"My retryable error"`
      );

      expect(mockLogger.warn).toBeCalledTimes(2);
      expect(mockLogger.warn).toHaveBeenNthCalledWith(
        1,
        '[CasesAnalytics][retryWithBackoff] Failed with error "My retryable error". Attempt for retry: 1'
      );

      expect(mockLogger.warn).toHaveBeenNthCalledWith(
        2,
        '[CasesAnalytics][retryWithBackoff] Failed with error "My retryable error". Attempt for retry: 2'
      );
    });

    it('should not log a warning when the error is not supported', async () => {
      cb.mockRejectedValue(new Error('My error'));

      await expect(() => service.retryWithBackoff(cb)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"My error"`
      );

      expect(mockLogger.warn).not.toBeCalled();
    });
  });
});
