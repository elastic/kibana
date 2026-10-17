/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EMPTY_MODEL_RESPONSE_ERROR_CODE,
  EmptyModelResponseError,
  getBoundedResponsePreview,
  isEmptyModelResponseError,
  MAX_RESPONSE_PREVIEW_LENGTH,
} from './empty_model_response_error';

const getError = (
  overrides: Partial<ConstructorParameters<typeof EmptyModelResponseError>[0]> = {}
) =>
  new EmptyModelResponseError({
    completionTokens: 0,
    connectorId: 'test-connector-id',
    contentLength: 0,
    model: 'anthropic-claude-5.5-opus',
    promptTokens: 128390,
    responseBody: '',
    traceId: 'test-trace-id',
    ...overrides,
  });

describe('EmptyModelResponseError', () => {
  it('carries the connector, model, token counts and trace id in the message', () => {
    const error = getError();

    expect(error.message).toContain('the model returned an empty response');
    expect(error.message).toContain('test-connector-id');
    expect(error.message).toContain('anthropic-claude-5.5-opus');
    expect(error.message).toContain('prompt tokens: 128390');
    expect(error.message).toContain('completion tokens: 0');
    expect(error.message).toContain('test-trace-id');
  });

  it('reports unknown values instead of omitting them', () => {
    const error = getError({
      connectorId: 'test-connector-id',
      model: undefined,
      promptTokens: undefined,
      completionTokens: undefined,
      traceId: undefined,
    });

    expect(error.message).toContain('model: unknown');
    expect(error.message).toContain('prompt tokens: unknown');
    expect(error.message).toContain('completion tokens: unknown');
    expect(error.message).toContain('traceId: unknown');
  });

  it('exposes the structured fields for callers that classify the failure', () => {
    const error = getError({ completionTokens: 0, contentLength: 0 });

    expect(error.code).toEqual(EMPTY_MODEL_RESPONSE_ERROR_CODE);
    expect(error.name).toEqual('EmptyModelResponseError');
    expect(error.connectorId).toEqual('test-connector-id');
    expect(error.completionTokens).toEqual(0);
    expect(error.contentLength).toEqual(0);
    expect(error.promptTokens).toEqual(128390);
  });
});

describe('isEmptyModelResponseError', () => {
  it('returns true for an empty model response error', () => {
    expect(isEmptyModelResponseError(getError())).toBe(true);
  });

  it('returns true when the error was re-wrapped but kept the code', () => {
    const wrapped = new Error('wrapped by a framework');
    Object.assign(wrapped, { code: EMPTY_MODEL_RESPONSE_ERROR_CODE });

    expect(isEmptyModelResponseError(wrapped)).toBe(true);
  });

  it('returns false for other errors, and for non-errors', () => {
    expect(isEmptyModelResponseError(new Error('boom'))).toBe(false);
    expect(isEmptyModelResponseError(undefined)).toBe(false);
    expect(isEmptyModelResponseError('the model returned an empty response')).toBe(false);
  });
});

describe('getBoundedResponsePreview', () => {
  it('returns a short response unchanged', () => {
    expect(getBoundedResponsePreview('<html>502 Bad Gateway</html>')).toEqual(
      '<html>502 Bad Gateway</html>'
    );
  });

  it('does not truncate a response of exactly the maximum length', () => {
    const response = 'x'.repeat(MAX_RESPONSE_PREVIEW_LENGTH);

    expect(getBoundedResponsePreview(response)).toEqual(response);
  });

  it('bounds a long response and reports the total length', () => {
    const response = 'x'.repeat(MAX_RESPONSE_PREVIEW_LENGTH + 100);

    const preview = getBoundedResponsePreview(response);

    expect(preview.startsWith('x'.repeat(MAX_RESPONSE_PREVIEW_LENGTH))).toBe(true);
    expect(preview).toContain(`truncated, ${response.length} characters total`);
  });

  it('honors an explicit bound', () => {
    const preview = getBoundedResponsePreview('abcdef', 3);

    expect(preview).toEqual('abc... (truncated, 6 characters total)');
  });
});
