/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors, type DiagnosticResult } from '@elastic/elasticsearch';
import { loggerMock } from '@kbn/logging-mocks';
import { retryTransientEsErrors } from './retry';

jest.mock('timers/promises', () => ({
  setTimeout: jest.fn().mockResolvedValue(undefined),
}));

const createResponseError = (
  statusCode: number,
  body: Record<string, unknown>
): errors.ResponseError => {
  return new errors.ResponseError({
    statusCode,
    body,
    headers: {},
    warnings: [],
    meta: {
      aborted: false,
      attempts: 1,
      connection: null,
      context: null,
      name: 'test',
      request: {} as unknown as DiagnosticResult['meta']['request'],
    },
  });
};

const createEsRejectedExecutionError = () => {
  return createResponseError(429, {
    error: {
      type: 'es_rejected_execution_exception',
      reason:
        'rejected execution of coordinating operation [coordinating_and_primary_bytes=0, replica_bytes=0, all_bytes=0, coordinating_operation_bytes=0, max_coordinating_bytes=0]',
    },
  });
};

const createNonRetryableError = () => {
  return createResponseError(400, {
    error: {
      type: 'illegal_argument_exception',
      reason: 'invalid request',
    },
  });
};

describe('retryTransientEsErrors', () => {
  const logger = loggerMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns result when call succeeds on first attempt', async () => {
    const esCall = jest.fn().mockResolvedValue({ success: true });

    const result = await retryTransientEsErrors(esCall, { logger });

    expect(result).toEqual({ success: true });
    expect(esCall).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('retries on es_rejected_execution_exception (HTTP 429) and succeeds', async () => {
    const esCall = jest
      .fn()
      .mockRejectedValueOnce(createEsRejectedExecutionError())
      .mockResolvedValue({ success: true });

    const result = await retryTransientEsErrors(esCall, { logger });

    expect(result).toEqual({ success: true });
    expect(esCall).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Retrying Elasticsearch operation after [2s]')
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('es_rejected_execution_exception')
    );
  });

  it('retries multiple times with exponential backoff before succeeding', async () => {
    const { setTimeout: setTimeoutMock } = jest.requireMock('timers/promises');

    const esCall = jest
      .fn()
      .mockRejectedValueOnce(createEsRejectedExecutionError())
      .mockRejectedValueOnce(createEsRejectedExecutionError())
      .mockRejectedValueOnce(createEsRejectedExecutionError())
      .mockResolvedValue({ success: true });

    const result = await retryTransientEsErrors(esCall, { logger });

    expect(result).toEqual({ success: true });
    expect(esCall).toHaveBeenCalledTimes(4);
    expect(logger.warn).toHaveBeenCalledTimes(3);

    expect(setTimeoutMock).toHaveBeenNthCalledWith(1, 2000);
    expect(setTimeoutMock).toHaveBeenNthCalledWith(2, 4000);
    expect(setTimeoutMock).toHaveBeenNthCalledWith(3, 8000);
  });

  it('throws after exhausting max retry attempts', async () => {
    const error = createEsRejectedExecutionError();
    const esCall = jest.fn().mockRejectedValue(error);

    await expect(retryTransientEsErrors(esCall, { logger })).rejects.toThrow(error);

    expect(esCall).toHaveBeenCalledTimes(6);
    expect(logger.warn).toHaveBeenCalledTimes(5);
  });

  it('does not retry non-retryable errors', async () => {
    const error = createNonRetryableError();
    const esCall = jest.fn().mockRejectedValue(error);

    await expect(retryTransientEsErrors(esCall, { logger })).rejects.toThrow(error);

    expect(esCall).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('works without a logger', async () => {
    const esCall = jest
      .fn()
      .mockRejectedValueOnce(createEsRejectedExecutionError())
      .mockResolvedValue({ success: true });

    const result = await retryTransientEsErrors(esCall);

    expect(result).toEqual({ success: true });
    expect(esCall).toHaveBeenCalledTimes(2);
  });
});
