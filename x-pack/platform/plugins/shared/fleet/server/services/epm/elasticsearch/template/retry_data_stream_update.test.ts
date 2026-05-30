/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry from 'p-retry';

import { errors as EsErrors } from '@elastic/elasticsearch';
import { loggerMock } from '@kbn/logging-mocks';

import { retryDataStreamUpdateOnClusterEventTimeout } from './retry_data_stream_update';

// Use 0ms delays so tests run synchronously without fake timers.
jest.mock('p-retry', () => {
  const actual = jest.requireActual<typeof import('p-retry')>('p-retry');
  const mockFn = jest
    .fn()
    .mockImplementation((fn: Parameters<typeof actual.default>[0], options: any) =>
      actual.default(fn, { ...options, minTimeout: 0, maxTimeout: 0, randomize: false })
    );
  (mockFn as any).AbortError = actual.AbortError;
  return { __esModule: true, default: mockFn, AbortError: actual.AbortError };
});

const buildResponseError = (statusCode: number, errorType: string): EsErrors.ResponseError =>
  new EsErrors.ResponseError({
    statusCode,
    body: { error: { type: errorType, reason: errorType } },
    headers: {},
    meta: {} as any,
    warnings: [],
  });

describe('retryDataStreamUpdateOnClusterEventTimeout', () => {
  beforeEach(() => {
    jest.mocked(pRetry).mockClear();
  });

  it('resolves immediately when the operation succeeds on the first attempt', async () => {
    const operation = jest.fn().mockResolvedValue('ok');
    const logger = loggerMock.create();

    const result = await retryDataStreamUpdateOnClusterEventTimeout(operation, {
      logger,
      dataStreamName: 'test-stream',
    });

    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('retries on process_cluster_event_timeout_exception (body.error.type) and succeeds', async () => {
    const clusterTimeoutError = buildResponseError(503, 'process_cluster_event_timeout_exception');
    const operation = jest
      .fn()
      .mockRejectedValueOnce(clusterTimeoutError)
      .mockResolvedValueOnce('ok');
    const logger = loggerMock.create();

    const result = await retryDataStreamUpdateOnClusterEventTimeout(operation, {
      logger,
      dataStreamName: 'test-stream',
    });

    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('process_cluster_event_timeout_exception')
    );
  });

  it('retries on process_cluster_event_timeout_exception via root_cause', async () => {
    const clusterTimeoutError = new EsErrors.ResponseError({
      statusCode: 503,
      body: {
        error: {
          type: 'some_outer_type',
          root_cause: [{ type: 'process_cluster_event_timeout_exception' }],
        },
      },
      headers: {},
      meta: {} as any,
      warnings: [],
    });
    const operation = jest
      .fn()
      .mockRejectedValueOnce(clusterTimeoutError)
      .mockResolvedValueOnce('ok');
    const logger = loggerMock.create();

    const result = await retryDataStreamUpdateOnClusterEventTimeout(operation, {
      logger,
      dataStreamName: 'test-stream',
    });

    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('retries on 429 TooManyRequests errors', async () => {
    const tooManyRequestsError = buildResponseError(429, 'circuit_breaking_exception');
    const operation = jest
      .fn()
      .mockRejectedValueOnce(tooManyRequestsError)
      .mockResolvedValueOnce('ok');
    const logger = loggerMock.create();

    const result = await retryDataStreamUpdateOnClusterEventTimeout(operation, {
      logger,
      dataStreamName: 'test-stream',
    });

    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('test-stream'));
  });

  it('aborts immediately (no retry) on non-ES errors', async () => {
    const arbitraryError = new Error('some unexpected error');
    const operation = jest.fn().mockRejectedValue(arbitraryError);
    const logger = loggerMock.create();

    await expect(
      retryDataStreamUpdateOnClusterEventTimeout(operation, {
        logger,
        dataStreamName: 'test-stream',
      })
    ).rejects.toThrow('some unexpected error');

    expect(operation).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('aborts immediately on ES errors that are not cluster-event-timeout or 429', async () => {
    const illegalArgError = buildResponseError(400, 'illegal_argument_exception');
    const operation = jest.fn().mockRejectedValue(illegalArgError);
    const logger = loggerMock.create();

    await expect(
      retryDataStreamUpdateOnClusterEventTimeout(operation, {
        logger,
        dataStreamName: 'test-stream',
      })
    ).rejects.toThrow();

    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('stops retrying after exhausting the retry limit (4 retries = 5 total attempts)', async () => {
    const clusterTimeoutError = buildResponseError(503, 'process_cluster_event_timeout_exception');
    const operation = jest.fn().mockRejectedValue(clusterTimeoutError);
    const logger = loggerMock.create();

    await expect(
      retryDataStreamUpdateOnClusterEventTimeout(operation, {
        logger,
        dataStreamName: 'test-stream',
      })
    ).rejects.toThrow();

    // 1 initial attempt + 4 retries
    expect(operation).toHaveBeenCalledTimes(5);
  });
});
