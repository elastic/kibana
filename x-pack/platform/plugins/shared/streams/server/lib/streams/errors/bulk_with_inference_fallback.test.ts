/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import { BulkOperationError } from '@kbn/storage-adapter';
import {
  bulkWithInferenceFallback,
  isInferenceRelatedBulkError,
} from './bulk_with_inference_fallback';

jest.mock('timers/promises', () => ({
  setTimeout: jest.fn().mockResolvedValue(undefined),
}));

import { setTimeout as mockedSetTimeout } from 'timers/promises';

const createLogger = () => loggerMock.create() as unknown as Logger;

function inferenceErrorResponse(reason: string): BulkResponse {
  return {
    errors: true,
    took: 0,
    items: [
      {
        index: {
          _index: '.kibana_streams_assets',
          _id: 'doc-1',
          status: 500,
          error: {
            type: 'exception',
            reason: `Exception when running inference id [elser-endpoint] on field [embedding]`,
            caused_by: { type: 'status_exception', reason },
          },
        },
      },
    ],
  };
}

function nonInferenceErrorResponse(): BulkResponse {
  return {
    errors: true,
    took: 0,
    items: [
      {
        index: {
          _index: '.kibana_streams_assets',
          _id: 'doc-1',
          status: 400,
          error: {
            type: 'mapper_parsing_exception',
            reason: 'failed to parse field [severity] of type [long] in document with id [doc-1]',
          },
        },
      },
    ],
  };
}

function mixedErrorResponse(): BulkResponse {
  return {
    errors: true,
    took: 0,
    items: [
      {
        index: {
          _index: '.kibana_streams_assets',
          _id: 'doc-1',
          status: 500,
          error: {
            type: 'exception',
            reason: 'Exception when running inference id [elser-endpoint] on field [embedding]',
            caused_by: {
              type: 'status_exception',
              reason: 'Unable to find model deployment task [elser-endpoint]',
            },
          },
        },
      },
      {
        index: {
          _index: '.kibana_streams_assets',
          _id: 'doc-2',
          status: 400,
          error: {
            type: 'mapper_parsing_exception',
            reason: 'failed to parse field [severity] of type [long]',
          },
        },
      },
    ],
  };
}

describe('isInferenceRelatedBulkError', () => {
  it('returns true when all errored items mention inference in the reason', () => {
    const error = new BulkOperationError(
      'bulk failed',
      inferenceErrorResponse('Unable to find model deployment task [elser-endpoint]')
    );
    expect(isInferenceRelatedBulkError(error)).toBe(true);
  });

  it('returns true when inference is mentioned only in the error type', () => {
    const response: BulkResponse = {
      errors: true,
      took: 0,
      items: [
        {
          index: {
            _index: '.kibana_streams_assets',
            _id: 'doc-1',
            status: 500,
            error: {
              type: 'inference_exception',
              reason: 'Unable to find model deployment task [elser-endpoint]',
            },
          },
        },
      ],
    };
    const error = new BulkOperationError('bulk failed', response);
    expect(isInferenceRelatedBulkError(error)).toBe(true);
  });

  it('returns true when inference is mentioned only in caused_by.reason', () => {
    const response: BulkResponse = {
      errors: true,
      took: 0,
      items: [
        {
          index: {
            _index: '.kibana_streams_assets',
            _id: 'doc-1',
            status: 500,
            error: {
              type: 'status_exception',
              reason: 'Unable to find model deployment task [elser-endpoint]',
              caused_by: {
                type: 'exception',
                reason: 'Error loading inference for inference id [elser-endpoint] on field [x]',
              },
            },
          },
        },
      ],
    };
    const error = new BulkOperationError('bulk failed', response);
    expect(isInferenceRelatedBulkError(error)).toBe(true);
  });

  it('returns true when inference is mentioned only in a nested caused_by.type', () => {
    const response: BulkResponse = {
      errors: true,
      took: 0,
      items: [
        {
          index: {
            _index: '.kibana_streams_assets',
            _id: 'doc-1',
            status: 500,
            error: {
              type: 'status_exception',
              reason: 'Unable to find model deployment task [elser-endpoint]',
              caused_by: {
                type: 'inference_exception',
                reason: 'Endpoint not available',
              },
            },
          },
        },
      ],
    };
    const error = new BulkOperationError('bulk failed', response);
    expect(isInferenceRelatedBulkError(error)).toBe(true);
  });

  it('returns true when inference is mentioned only in root_cause', () => {
    const response: BulkResponse = {
      errors: true,
      took: 0,
      items: [
        {
          index: {
            _index: '.kibana_streams_assets',
            _id: 'doc-1',
            status: 500,
            error: {
              type: 'status_exception',
              reason: 'Unable to find model deployment task [elser-endpoint]',
              root_cause: [
                {
                  type: 'exception',
                  reason: 'Inference endpoint [elser-endpoint] not available',
                },
              ],
            },
          },
        },
      ],
    };
    const error = new BulkOperationError('bulk failed', response);
    expect(isInferenceRelatedBulkError(error)).toBe(true);
  });

  it('returns true when inference is mentioned only in suppressed', () => {
    const response: BulkResponse = {
      errors: true,
      took: 0,
      items: [
        {
          index: {
            _index: '.kibana_streams_assets',
            _id: 'doc-1',
            status: 500,
            error: {
              type: 'status_exception',
              reason: 'Unable to find model deployment task [elser-endpoint]',
              suppressed: [
                {
                  type: 'exception',
                  reason: 'Inference pipeline processing failed',
                },
              ],
            },
          },
        },
      ],
    };
    const error = new BulkOperationError('bulk failed', response);
    expect(isInferenceRelatedBulkError(error)).toBe(true);
  });

  it('returns false when no errored items mention inference', () => {
    const error = new BulkOperationError('bulk failed', nonInferenceErrorResponse());
    expect(isInferenceRelatedBulkError(error)).toBe(false);
  });

  it('returns false when items are a mix of inference and non-inference errors', () => {
    const error = new BulkOperationError('bulk failed', mixedErrorResponse());
    expect(isInferenceRelatedBulkError(error)).toBe(false);
  });

  it('returns false when there are no errored items (empty items array)', () => {
    const error = new BulkOperationError('bulk failed', {
      errors: true,
      took: 0,
      items: [],
    });
    expect(isInferenceRelatedBulkError(error)).toBe(false);
  });

  it('returns false when items have no errors', () => {
    const error = new BulkOperationError('bulk failed', {
      errors: false,
      took: 0,
      items: [{ index: { _index: 'test', _id: '1', status: 200 } }],
    });
    expect(isInferenceRelatedBulkError(error)).toBe(false);
  });

  it('returns false when response.items is undefined', () => {
    const error = new BulkOperationError('bulk failed', {
      errors: true,
      took: 0,
    } as BulkResponse);
    expect(isInferenceRelatedBulkError(error)).toBe(false);
  });
});

describe('bulkWithInferenceFallback', () => {
  beforeEach(() => {
    (mockedSetTimeout as jest.Mock).mockClear();
  });

  it('runs attempt once with includeEmbedding=true on success', async () => {
    const attempt = jest.fn().mockResolvedValue('ok');

    const result = await bulkWithInferenceFallback(createLogger(), attempt);

    expect(result).toBe('ok');
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(attempt).toHaveBeenCalledWith({ includeEmbedding: true });
    expect(mockedSetTimeout).not.toHaveBeenCalled();
  });

  it('retries with embedding (not stripping it) on transient inference errors and returns when one succeeds', async () => {
    const bulkError = new BulkOperationError(
      'inference unavailable',
      inferenceErrorResponse('Unable to find model deployment task [elser-endpoint]')
    );
    const logger = createLogger();
    const attempt = jest.fn().mockRejectedValueOnce(bulkError).mockResolvedValueOnce('retried');

    const result = await bulkWithInferenceFallback(logger, attempt);

    expect(result).toBe('retried');
    expect(attempt).toHaveBeenCalledTimes(2);
    expect(attempt).toHaveBeenNthCalledWith(1, { includeEmbedding: true });
    expect(attempt).toHaveBeenNthCalledWith(2, { includeEmbedding: true });
    expect(mockedSetTimeout).toHaveBeenCalledTimes(1);
    expect(mockedSetTimeout).toHaveBeenNthCalledWith(1, 2000);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('retrying in 2000ms (attempt 1/3)')
    );
  });

  it('uses exponential backoff between retry attempts', async () => {
    const bulkError = new BulkOperationError(
      'inference unavailable',
      inferenceErrorResponse('Unable to find model deployment task [elser-endpoint]')
    );
    const attempt = jest
      .fn()
      .mockRejectedValueOnce(bulkError)
      .mockRejectedValueOnce(bulkError)
      .mockResolvedValueOnce('finally-ok');

    const result = await bulkWithInferenceFallback(createLogger(), attempt);

    expect(result).toBe('finally-ok');
    expect(attempt).toHaveBeenCalledTimes(3);
    expect(mockedSetTimeout).toHaveBeenCalledTimes(2);
    expect(mockedSetTimeout).toHaveBeenNthCalledWith(1, 2000);
    expect(mockedSetTimeout).toHaveBeenNthCalledWith(2, 4000);
  });

  it('falls back to writing without embedding only after all backoff retries fail', async () => {
    const bulkError = new BulkOperationError(
      'inference unavailable',
      inferenceErrorResponse('Unable to find model deployment task [elser-endpoint]')
    );
    const logger = createLogger();
    const attempt = jest
      .fn()
      .mockRejectedValueOnce(bulkError)
      .mockRejectedValueOnce(bulkError)
      .mockRejectedValueOnce(bulkError)
      .mockResolvedValueOnce('fallback-ok');

    const result = await bulkWithInferenceFallback(logger, attempt);

    expect(result).toBe('fallback-ok');
    expect(attempt).toHaveBeenCalledTimes(4);
    expect(attempt).toHaveBeenNthCalledWith(1, { includeEmbedding: true });
    expect(attempt).toHaveBeenNthCalledWith(2, { includeEmbedding: true });
    expect(attempt).toHaveBeenNthCalledWith(3, { includeEmbedding: true });
    expect(attempt).toHaveBeenNthCalledWith(4, { includeEmbedding: false });
    expect(mockedSetTimeout).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'after 3 attempts -- falling back to writing without semantic_text embedding'
      )
    );
    expect(logger.debug).toHaveBeenCalledWith('Bulk write fallback without embedding succeeded');
  });

  it('propagates the fallback error when the embedding-stripped attempt also fails', async () => {
    const bulkError = new BulkOperationError(
      'inference unavailable',
      inferenceErrorResponse(
        'Error in inference process: [inference canceled as process is stopping]'
      )
    );
    const fallbackError = new Error('mapping conflict');
    const attempt = jest
      .fn()
      .mockRejectedValueOnce(bulkError)
      .mockRejectedValueOnce(bulkError)
      .mockRejectedValueOnce(bulkError)
      .mockRejectedValueOnce(fallbackError);

    await expect(bulkWithInferenceFallback(createLogger(), attempt)).rejects.toBe(fallbackError);
    expect(attempt).toHaveBeenCalledTimes(4);
  });

  it('does not retry when a non-BulkOperationError is thrown', async () => {
    const error = new Error('network failure');
    const attempt = jest.fn().mockRejectedValue(error);

    await expect(bulkWithInferenceFallback(createLogger(), attempt)).rejects.toBe(error);
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(mockedSetTimeout).not.toHaveBeenCalled();
  });

  it('does not retry when BulkOperationError items contain only non-inference errors', async () => {
    const error = new BulkOperationError('mapping conflict', nonInferenceErrorResponse());
    const attempt = jest.fn().mockRejectedValueOnce(error);

    await expect(bulkWithInferenceFallback(createLogger(), attempt)).rejects.toBe(error);
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(mockedSetTimeout).not.toHaveBeenCalled();
  });

  it('does not retry when BulkOperationError has mixed inference and non-inference item failures', async () => {
    const error = new BulkOperationError('mixed errors', mixedErrorResponse());
    const logger = createLogger();
    const attempt = jest.fn().mockRejectedValueOnce(error);

    await expect(bulkWithInferenceFallback(logger, attempt)).rejects.toBe(error);
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(mockedSetTimeout).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('mixed errors (1 inference + 1 other out of 2 items)')
    );
  });
});
