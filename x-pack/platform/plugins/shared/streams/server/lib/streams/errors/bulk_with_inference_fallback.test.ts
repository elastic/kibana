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
  it('runs attempt once with includeEmbedding=true on success', async () => {
    const attempt = jest.fn().mockResolvedValue('ok');

    const result = await bulkWithInferenceFallback(createLogger(), attempt);

    expect(result).toBe('ok');
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(attempt).toHaveBeenCalledWith({ includeEmbedding: true });
  });

  it('retries without embedding when the first attempt throws an inference-related BulkOperationError', async () => {
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
    expect(attempt).toHaveBeenNthCalledWith(2, { includeEmbedding: false });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Bulk write failed due to inference error (1/1 items)')
    );
    expect(logger.debug).toHaveBeenCalledWith('Bulk write retry without embedding succeeded');
  });

  it('propagates the retry error when the second attempt also fails', async () => {
    const firstError = new BulkOperationError(
      'first failure',
      inferenceErrorResponse(
        'Error in inference process: [inference canceled as process is stopping]'
      )
    );
    const secondError = new BulkOperationError(
      'second failure',
      inferenceErrorResponse(
        'Error in inference process: [inference canceled as process is stopping]'
      )
    );
    const attempt = jest.fn().mockRejectedValueOnce(firstError).mockRejectedValueOnce(secondError);

    await expect(bulkWithInferenceFallback(createLogger(), attempt)).rejects.toBe(secondError);
    expect(attempt).toHaveBeenCalledTimes(2);
  });

  it('does not retry when a non-BulkOperationError is thrown', async () => {
    const error = new Error('network failure');
    const attempt = jest.fn().mockRejectedValue(error);

    await expect(bulkWithInferenceFallback(createLogger(), attempt)).rejects.toBe(error);
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it('does not retry when BulkOperationError items contain only non-inference errors', async () => {
    const error = new BulkOperationError('mapping conflict', nonInferenceErrorResponse());
    const attempt = jest.fn().mockRejectedValueOnce(error);

    await expect(bulkWithInferenceFallback(createLogger(), attempt)).rejects.toBe(error);
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it('does not retry when BulkOperationError has mixed inference and non-inference item failures', async () => {
    const error = new BulkOperationError('mixed errors', mixedErrorResponse());
    const logger = createLogger();
    const attempt = jest.fn().mockRejectedValueOnce(error);

    await expect(bulkWithInferenceFallback(logger, attempt)).rejects.toBe(error);
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('mixed errors (1 inference + 1 other out of 2 items)')
    );
  });
});
