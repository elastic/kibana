/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-browser-mocks';
import type { Logger } from '@kbn/core/server';
import { CasesConnectorError } from './cases_connector_error';
import { CaseConnectorRetryService } from './retry_service';
import type { BackoffFactory } from './types';

describe('CryptoService', () => {
  const nextBackOff = jest.fn();
  const cb = jest.fn();

  const backOffFactory: BackoffFactory = {
    create: () => ({ nextBackOff }),
  };

  const mockLogger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

  let service: CaseConnectorRetryService;

  beforeEach(() => {
    jest.clearAllMocks();

    nextBackOff.mockReturnValue(1);
    service = new CaseConnectorRetryService(mockLogger, backOffFactory);
  });

  it('should not retry if the error is not CasesConnectorError', async () => {
    cb.mockRejectedValue(new Error('My error'));

    await expect(() => service.retryWithBackoff(cb)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"My error"`
    );

    expect(cb).toBeCalledTimes(1);
    expect(nextBackOff).not.toBeCalled();
  });

  it('should not retry if the status code is not supported', async () => {
    cb.mockRejectedValue(new CasesConnectorError('My case connector error', 500));

    await expect(() => service.retryWithBackoff(cb)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"My case connector error"`
    );

    expect(cb).toBeCalledTimes(1);
    expect(nextBackOff).not.toBeCalled();
  });

  it('should not retry after trying more than the max attempts', async () => {
    const maxAttempts = 3;
    service = new CaseConnectorRetryService(mockLogger, backOffFactory, maxAttempts);

    cb.mockRejectedValue(new CasesConnectorError('My transient error', 409));

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
      service = new CaseConnectorRetryService(mockLogger, backOffFactory, maxAttempts);

      const error = new CasesConnectorError('My transient error', statusCode);
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
    service = new CaseConnectorRetryService(mockLogger, backOffFactory);

    cb.mockResolvedValue({ status: 'ok' });

    const res = await service.retryWithBackoff(cb);

    expect(nextBackOff).toBeCalledTimes(0);
    expect(cb).toBeCalledTimes(1);
    expect(res).toEqual({ status: 'ok' });
  });

  describe('Logging', () => {
    it('should log a warning when retrying', async () => {
      service = new CaseConnectorRetryService(mockLogger, backOffFactory, 2);

      cb.mockRejectedValue(new CasesConnectorError('My transient error', 409));

      await expect(() => service.retryWithBackoff(cb)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"My transient error"`
      );

      expect(mockLogger.warn).toBeCalledTimes(2);
      expect(mockLogger.warn).toHaveBeenNthCalledWith(
        1,
        '[CaseConnector] Case connector failed with status code 409. Attempt for retry: 1'
      );

      expect(mockLogger.warn).toHaveBeenNthCalledWith(
        2,
        '[CaseConnector] Case connector failed with status code 409. Attempt for retry: 2'
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
