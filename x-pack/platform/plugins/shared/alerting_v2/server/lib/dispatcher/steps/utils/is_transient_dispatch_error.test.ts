/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiagnosticResult } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';
import { isTransientDispatchError } from './is_transient_dispatch_error';

describe('isTransientDispatchError', () => {
  it('treats a 503 response as transient', () => {
    expect(
      isTransientDispatchError(new errors.ResponseError({ statusCode: 503 } as DiagnosticResult))
    ).toBe(true);
  });

  it('treats a connection error as transient', () => {
    expect(
      isTransientDispatchError(new errors.ConnectionError('ECONNRESET', {} as DiagnosticResult))
    ).toBe(true);
  });

  it('treats a 400 response as permanent', () => {
    expect(
      isTransientDispatchError(new errors.ResponseError({ statusCode: 400 } as DiagnosticResult))
    ).toBe(false);
  });

  it('treats a plain error as permanent', () => {
    expect(isTransientDispatchError(new Error('es down'))).toBe(false);
  });
});
