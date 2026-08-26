/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiagnosticResult } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';
import { isEsqlUserError } from './esql_user_error';

const makeResponseError = (statusCode: number) =>
  new errors.ResponseError({ statusCode } as DiagnosticResult);

describe('isEsqlUserError', () => {
  it.each([400, 401, 403, 404])(
    'returns true for ResponseError with statusCode %i',
    (statusCode) => {
      expect(isEsqlUserError(makeResponseError(statusCode))).toBe(true);
    }
  );

  it('returns false for ResponseError with statusCode 503', () => {
    expect(isEsqlUserError(makeResponseError(503))).toBe(false);
  });

  it('returns false for a plain Error', () => {
    expect(isEsqlUserError(new Error('something went wrong'))).toBe(false);
  });
});
