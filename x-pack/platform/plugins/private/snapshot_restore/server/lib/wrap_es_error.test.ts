/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { wrapEsError } from './wrap_es_error';

describe('wrapEsError', () => {
  const esErrorBody = {
    error: {
      root_cause: [{ reason: 'root cause reason' }],
      caused_by: { reason: 'outer reason', caused_by: { reason: 'inner reason' } },
    },
  };

  it('extracts the caused_by chain from the ES client error metadata', () => {
    const error = wrapEsError({
      statusCode: 404,
      message: 'Response Error',
      meta: { body: esErrorBody },
    });

    expect(error).toEqual({ statusCode: 404, cause: ['outer reason', 'inner reason'] });
  });

  it('parses a JSON string body', () => {
    const error = wrapEsError({
      statusCode: 404,
      message: 'Response Error',
      response: JSON.stringify(esErrorBody),
    });

    expect(error).toEqual({ statusCode: 404, cause: ['outer reason', 'inner reason'] });
  });

  it('falls back to the error message when the body is not JSON', () => {
    const error = wrapEsError({
      statusCode: 502,
      message: 'Bad Gateway',
      meta: { body: '<html><body>502 Bad Gateway</body></html>' },
    });

    expect(error).toEqual({ statusCode: 502, cause: 'Bad Gateway' });
  });

  it.each([
    ['a JSON primitive', '"gateway timeout"'],
    ['a JSON array', '["a", "b"]'],
    ['a JSON null', 'null'],
    ['a non-string, non-object body', 42],
  ])('falls back to the error message when the body is %s', (_label, body) => {
    const error = wrapEsError({ statusCode: 504, message: 'Gateway Timeout', meta: { body } });

    expect(error).toEqual({ statusCode: 504, cause: 'Gateway Timeout' });
  });

  it('uses the custom message for a mapped status code', () => {
    const error = wrapEsError(
      { statusCode: 404, meta: { body: esErrorBody } },
      { 404: 'Not here' }
    );

    expect(error).toEqual({ statusCode: 404, message: 'Not here' });
  });
});
