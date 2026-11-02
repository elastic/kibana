/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CONTENT_FILTERED_MODEL_RESPONSE_ERROR_CODE,
  CONTENT_FILTERED_MODEL_RESPONSE_ERROR_MESSAGE_PREFIX,
  ContentFilteredModelResponseError,
  isContentFilterFinishReason,
  isContentFilteredModelResponseError,
} from './content_filtered_model_response_error';
import { MAX_RESPONSE_PREVIEW_LENGTH } from './empty_model_response_error';

const params = {
  completionTokens: 12,
  connectorId: 'connector-1',
  contentLength: 5,
  model: 'claude-5.5-opus',
  promptTokens: 4096,
  responseBody: 'part…',
  traceId: 'trace-1',
};

describe('ContentFilteredModelResponseError', () => {
  it('carries a stable code and the diagnostic context', () => {
    const error = new ContentFilteredModelResponseError(params);

    expect(error).toEqual(
      expect.objectContaining({
        code: CONTENT_FILTERED_MODEL_RESPONSE_ERROR_CODE,
        completionTokens: 12,
        connectorId: 'connector-1',
        contentLength: 5,
        finishReason: 'content_filter',
        model: 'claude-5.5-opus',
        name: 'ContentFilteredModelResponseError',
        promptTokens: 4096,
        traceId: 'trace-1',
      })
    );
    expect(error.message).toContain(CONTENT_FILTERED_MODEL_RESPONSE_ERROR_MESSAGE_PREFIX);
    expect(error.message).toContain('connector-1');
    expect(error.message).toContain('claude-5.5-opus');
    expect(error.message).toContain('trace-1');
    expect(error.message).toContain('part…');
  });

  it('bounds the persisted preview of a long partial response', () => {
    const responseBody = 'x'.repeat(MAX_RESPONSE_PREVIEW_LENGTH * 4);

    const error = new ContentFilteredModelResponseError({
      ...params,
      contentLength: responseBody.length,
      responseBody,
    });

    expect(error.message.length).toBeLessThan(MAX_RESPONSE_PREVIEW_LENGTH * 2);
    expect(error.message).toContain('truncated');
  });

  it('reports unknown context instead of throwing when it was not provided', () => {
    const error = new ContentFilteredModelResponseError({
      connectorId: 'c',
      contentLength: 0,
      responseBody: '',
    });

    expect(error.message).toContain('model: unknown');
    expect(error.message).toContain('traceId: unknown');
  });
});

describe('isContentFilteredModelResponseError', () => {
  it('matches the error and a re-wrapped error that kept the code', () => {
    expect(isContentFilteredModelResponseError(new ContentFilteredModelResponseError(params))).toBe(
      true
    );
    expect(
      isContentFilteredModelResponseError(
        Object.assign(new Error('wrapped'), { code: CONTENT_FILTERED_MODEL_RESPONSE_ERROR_CODE })
      )
    ).toBe(true);
  });

  it.each([[new Error('boom')], [{ code: 'EMPTY_MODEL_RESPONSE' }], [null], [undefined], ['str']])(
    'does not match %p',
    (error) => {
      expect(isContentFilteredModelResponseError(error)).toBe(false);
    }
  );
});

describe('isContentFilterFinishReason', () => {
  it('only matches content_filter', () => {
    expect(isContentFilterFinishReason('content_filter')).toBe(true);
    expect(isContentFilterFinishReason('stop')).toBe(false);
    expect(isContentFilterFinishReason('length')).toBe(false);
    expect(isContentFilterFinishReason(undefined)).toBe(false);
  });
});
