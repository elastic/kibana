/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiagnosticResult } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { DISPATCH_RETRY_BUDGET_MS, DISPATCH_RETRY_MAX_RETRIES } from '../../constants';
import { DispatchRetryService } from './dispatch_retry_service';

const transientError = () => new errors.ResponseError({ statusCode: 503 } as DiagnosticResult);

describe('DispatchRetryService', () => {
  const logger = loggingSystemMock.createLogger();
  const neverAborted = new AbortController().signal;

  const run = async <T>(service: DispatchRetryService, callback: () => Promise<T>) => {
    const promise = service.retryWithBackoff(callback);
    const settled = promise.then(
      (value) => ({ value }),
      (error: Error) => ({ error })
    );
    await jest.advanceTimersByTimeAsync(DISPATCH_RETRY_BUDGET_MS);
    return settled;
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('returns the result once a transient error clears', async () => {
    const callback = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(transientError())
      .mockResolvedValueOnce('ok');

    const result = await run(
      new DispatchRetryService(logger, neverAborted, DISPATCH_RETRY_MAX_RETRIES),
      callback
    );

    expect(result).toEqual({ value: 'ok' });
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('retries a persistent transient error 3 times, then rethrows it', async () => {
    const error = transientError();
    const callback = jest.fn<Promise<string>, []>().mockRejectedValue(error);

    const result = await run(
      new DispatchRetryService(logger, neverAborted, DISPATCH_RETRY_MAX_RETRIES),
      callback
    );

    expect(result).toEqual({ error });
    expect(callback).toHaveBeenCalledTimes(DISPATCH_RETRY_MAX_RETRIES + 1);
  });

  it('does not retry a non-transient error', async () => {
    const error = new Error('boom');
    const callback = jest.fn<Promise<string>, []>().mockRejectedValue(error);

    const result = await run(
      new DispatchRetryService(logger, neverAborted, DISPATCH_RETRY_MAX_RETRIES),
      callback
    );

    expect(result).toEqual({ error });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does not retry once the tick signal has fired', async () => {
    const controller = new AbortController();
    controller.abort();
    const callback = jest.fn<Promise<string>, []>().mockRejectedValue(transientError());

    await run(
      new DispatchRetryService(logger, controller.signal, DISPATCH_RETRY_MAX_RETRIES),
      callback
    );

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('makes a single attempt with no retries allowed', async () => {
    const callback = jest.fn<Promise<string>, []>().mockRejectedValue(transientError());

    await run(new DispatchRetryService(logger, neverAborted, 0), callback);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('stops retrying when the next backoff would exceed the budget', async () => {
    const callback = jest.fn<Promise<string>, []>().mockImplementation(async () => {
      jest.setSystemTime(Date.now() + 3_000);
      throw transientError();
    });

    await run(new DispatchRetryService(logger, neverAborted, DISPATCH_RETRY_MAX_RETRIES), callback);

    expect(callback).toHaveBeenCalledTimes(2);
  });
});
