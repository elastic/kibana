/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { formatEsError, formatErrorMessage } from './format_es_error';

const esResponseError = (body: unknown, statusCode = 400) =>
  new errors.ResponseError(elasticsearchClientMock.createApiResponse({ statusCode, body }));

describe('formatEsError', () => {
  it('formats type and reason when both are present', () => {
    const error = esResponseError({
      error: { type: 'verification_exception', reason: 'Unknown index [nope]' },
    });

    expect(formatEsError(error)).toBe('verification_exception: Unknown index [nope]');
  });

  it('formats just the type when there is no reason', () => {
    const error = esResponseError({ error: { type: 'es_rejected_execution_exception' } });

    expect(formatEsError(error)).toBe('es_rejected_execution_exception');
  });

  it('falls back to a generic message instead of the raw body when there is no error.type', () => {
    // The ES client sets `error.message` to `JSON.stringify(body)` in this shape;
    // that raw body must never reach the caller.
    const error = esResponseError({ unexpected: 'shape', secret: 'internal-detail' });

    expect(formatEsError(error)).toBe('Elasticsearch returned an unexpected error');
    expect(formatEsError(error)).not.toContain('internal-detail');
  });

  it('falls back to a generic message for a non-object body', () => {
    const error = esResponseError('not json');

    expect(formatEsError(error)).toBe('Elasticsearch returned an unexpected error');
  });
});

describe('formatErrorMessage', () => {
  it('delegates to formatEsError for ResponseError', () => {
    const error = esResponseError({
      error: {
        type: 'security_exception',
        reason: 'action [indices:admin/delete] is unauthorized',
      },
    });

    expect(formatErrorMessage(error)).toBe(
      'security_exception: action [indices:admin/delete] is unauthorized'
    );
  });

  it('returns Error.message for non-ES errors', () => {
    expect(formatErrorMessage(new Error('boom'))).toBe('boom');
  });
});
