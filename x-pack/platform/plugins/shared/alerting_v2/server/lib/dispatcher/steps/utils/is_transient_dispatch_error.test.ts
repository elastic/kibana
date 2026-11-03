/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiagnosticResult } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';
import {
  EsConcurrentModificationError,
  EsUnacknowledgedError,
} from '../../../services/retry_service';
import { isTransientDispatchError } from './is_transient_dispatch_error';

describe('isTransientDispatchError', () => {
  it.each([408, 410, 429, 502, 503, 504])('treats a %s response as transient', (statusCode) => {
    expect(
      isTransientDispatchError(new errors.ResponseError({ statusCode } as DiagnosticResult))
    ).toBe(true);
  });

  it('treats a request timeout as transient', () => {
    expect(isTransientDispatchError(new errors.TimeoutError('timed out'))).toBe(true);
  });

  it('treats a missing living connection as transient', () => {
    expect(
      isTransientDispatchError(
        new errors.NoLivingConnectionsError('no connections', {} as DiagnosticResult)
      )
    ).toBe(true);
  });

  it('treats an unacknowledged write as transient', () => {
    expect(isTransientDispatchError(new EsUnacknowledgedError('not acknowledged'))).toBe(true);
  });

  it('treats a concurrent modification as transient', () => {
    expect(isTransientDispatchError(new EsConcurrentModificationError('conflict'))).toBe(true);
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
