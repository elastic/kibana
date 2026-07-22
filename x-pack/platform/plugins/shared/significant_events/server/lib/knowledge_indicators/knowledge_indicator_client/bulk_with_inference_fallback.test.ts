/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/core/server';

// Resolve backoff sleeps instantly so retry/fallback paths run without waiting.
jest.mock('timers/promises', () => ({
  setTimeout: jest.fn().mockResolvedValue(undefined),
}));

import {
  bulkCreateWithInferenceFallback,
  countRawBulkInferenceErrors,
  errorCauseMentionsInference,
} from './bulk_with_inference_fallback';

const createLogger = (): Logger =>
  ({
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger);

const okResponse = (): BulkResponse => ({
  errors: false,
  took: 0,
  items: [{ create: { _index: '.ki', status: 201 } }],
});

const inferenceErrorResponse = (): BulkResponse => ({
  errors: true,
  took: 0,
  items: [
    {
      create: {
        _index: '.ki',
        status: 500,
        error: { type: 'inference_exception', reason: 'inference service unavailable' },
      },
    },
  ],
});

const otherErrorResponse = (): BulkResponse => ({
  errors: true,
  took: 0,
  items: [
    {
      create: {
        _index: '.ki',
        status: 400,
        error: { type: 'mapper_parsing_exception', reason: 'mapping conflict' },
      },
    },
  ],
});

describe('errorCauseMentionsInference', () => {
  it('detects inference in nested caused_by', () => {
    expect(
      errorCauseMentionsInference({
        type: 'status_exception',
        reason: 'failed',
        caused_by: { type: 'inference_exception', reason: 'down' },
      })
    ).toBe(true);
  });

  it('returns false when no cause mentions inference', () => {
    expect(errorCauseMentionsInference({ type: 'mapper_parsing_exception', reason: 'bad' })).toBe(
      false
    );
  });
});

describe('countRawBulkInferenceErrors', () => {
  it('separates inference and other errors', () => {
    const response: BulkResponse = {
      errors: true,
      took: 0,
      items: [
        ...inferenceErrorResponse().items,
        ...otherErrorResponse().items,
        ...okResponse().items,
      ],
    };
    expect(countRawBulkInferenceErrors(response)).toEqual({ inference: 1, other: 1 });
  });

  it('returns zeroes for an empty item list', () => {
    expect(countRawBulkInferenceErrors({ errors: false, took: 0, items: [] })).toEqual({
      inference: 0,
      other: 0,
    });
  });
});

describe('bulkCreateWithInferenceFallback', () => {
  it('returns immediately on first success without falling back', async () => {
    const attempt = jest.fn().mockResolvedValue(okResponse());
    const response = await bulkCreateWithInferenceFallback(createLogger(), attempt);
    expect(response.errors).toBe(false);
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(attempt).toHaveBeenCalledWith({ includeEmbedding: true });
  });

  it('throws without retrying on a non-inference error', async () => {
    const attempt = jest.fn().mockResolvedValue(otherErrorResponse());
    await expect(bulkCreateWithInferenceFallback(createLogger(), attempt)).rejects.toThrow(
      /non-inference error/
    );
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it('throws without retrying on mixed inference + other errors', async () => {
    const mixed: BulkResponse = {
      errors: true,
      took: 0,
      items: [...inferenceErrorResponse().items, ...otherErrorResponse().items],
    };
    const attempt = jest.fn().mockResolvedValue(mixed);
    await expect(bulkCreateWithInferenceFallback(createLogger(), attempt)).rejects.toThrow(
      /mixed errors/
    );
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it('retries inference failures and returns when one succeeds', async () => {
    const attempt = jest
      .fn()
      .mockResolvedValueOnce(inferenceErrorResponse())
      .mockResolvedValueOnce(okResponse());

    await bulkCreateWithInferenceFallback(createLogger(), attempt);

    expect(attempt).toHaveBeenCalledTimes(2);
    expect(attempt).toHaveBeenNthCalledWith(2, { includeEmbedding: true });
  });

  it('falls back to writing without embedding after exhausting inference retries', async () => {
    const attempt = jest
      .fn()
      .mockResolvedValueOnce(inferenceErrorResponse())
      .mockResolvedValueOnce(inferenceErrorResponse())
      .mockResolvedValueOnce(inferenceErrorResponse())
      .mockResolvedValueOnce(okResponse());

    const response = await bulkCreateWithInferenceFallback(createLogger(), attempt);

    expect(response.errors).toBe(false);
    expect(attempt).toHaveBeenCalledTimes(4);
    expect(attempt).toHaveBeenLastCalledWith({ includeEmbedding: false });
  });

  it('throws when the embedding-stripped fallback also fails', async () => {
    const attempt = jest
      .fn()
      .mockResolvedValueOnce(inferenceErrorResponse())
      .mockResolvedValueOnce(inferenceErrorResponse())
      .mockResolvedValueOnce(inferenceErrorResponse())
      .mockResolvedValueOnce(otherErrorResponse());

    await expect(bulkCreateWithInferenceFallback(createLogger(), attempt)).rejects.toThrow(
      /fallback without embedding failed/
    );

    expect(attempt).toHaveBeenCalledTimes(4);
  });
});
