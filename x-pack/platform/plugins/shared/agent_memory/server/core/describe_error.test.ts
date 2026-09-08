/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors, type DiagnosticResult } from '@elastic/elasticsearch';
import { describeError } from './describe_error';

const createResponseError = (): errors.ResponseError =>
  new errors.ResponseError({
    statusCode: 403,
    body: {
      error: {
        type: 'security_exception',
        reason: 'denied for private memory content',
      },
    },
    headers: {},
    warnings: [],
    meta: {
      aborted: false,
      attempts: 1,
      connection: null,
      context: null,
      name: 'agent-memory-test',
      request: {} as DiagnosticResult['meta']['request'],
    },
  });

describe('describeError', () => {
  it('describes an Elasticsearch response without exposing content-bearing fields', () => {
    const error = createResponseError();

    expect(describeError(error)).toBe('kind=ResponseError status_code=403 type=security_exception');
    expect(describeError(error)).not.toContain('private memory content');
  });

  it('uses generic categories for ordinary and non-Error values', () => {
    expect(describeError(new Error('private query text'))).toBe('kind=Error');
    expect(describeError({ secret: 'private memory content' })).toBe('kind=unknown');
  });
});
