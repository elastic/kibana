/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiagnosticResult } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { AlertingRetryService } from './alerting_retry_service';

describe('AlertingRetryService', () => {
  const logger = loggingSystemMock.createLogger();

  async function flushTimers(ms: number = 2_000) {
    // baseDelay is 250ms and maxBackoffTime is 1000ms in AlertingRetryService, so 2000ms
    // is enough to cover a retry delay even with jitter.
    await jest.advanceTimersByTimeAsync(ms);
  }

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates to EsTransientRetryService and returns the callback result', async () => {
    const service = new AlertingRetryService(logger);

    await expect(service.retry(async () => 'ok')).resolves.toBe('ok');
  });

  it('retries transient ES errors (e.g. 503) and eventually succeeds', async () => {
    const service = new AlertingRetryService(logger);

    const callback = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(new errors.ResponseError({ statusCode: 503 } as DiagnosticResult))
      .mockResolvedValueOnce('ok');

    const promise = service.retry(callback);
    const assertion = expect(promise).resolves.toBe('ok');
    await flushTimers();
    await assertion;

    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-transient ES errors (e.g. 500)', async () => {
    const service = new AlertingRetryService(logger);

    const err = new errors.ResponseError({ statusCode: 500 } as DiagnosticResult);
    const callback = jest.fn<Promise<never>, []>().mockRejectedValueOnce(err);

    const promise = service.retry(callback);
    const assertion = expect(promise).rejects.toBe(err);
    await flushTimers();
    await assertion;

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('re-throws Elasticsearch ResponseError as-is', async () => {
    const service = new AlertingRetryService(logger);

    const esError = new errors.ResponseError({ statusCode: 503 } as DiagnosticResult);

    const promise = service.retry(async () => {
      throw esError;
    });
    const assertion = expect(promise).rejects.toBe(esError);
    await flushTimers();
    await assertion;
  });

  it('re-throws Error instances as-is', async () => {
    const service = new AlertingRetryService(logger);

    const err = new Error('boom');

    const promise = service.retry(async () => {
      throw err;
    });
    const assertion = expect(promise).rejects.toBe(err);
    await flushTimers();
    await assertion;
  });

  it('wraps non-Error throws into an Error', async () => {
    const service = new AlertingRetryService(logger);

    const promise = service.retry(async () => {
      // eslint-disable-next-line no-throw-literal
      throw 'boom';
    });
    const assertion = expect(promise).rejects.toMatchObject({
      message: expect.stringContaining('Elasticsearch error'),
    });
    await flushTimers();
    await assertion;
  });
});
