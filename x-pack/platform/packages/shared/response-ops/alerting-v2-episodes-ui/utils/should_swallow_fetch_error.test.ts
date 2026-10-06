/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPrivilegeFetchError, shouldSwallowFetchError } from './should_swallow_fetch_error';

const httpError = (status: number, extras: Record<string, unknown> = {}) => ({
  name: 'Error',
  message: `HTTP ${status}`,
  response: { status },
  ...extras,
});

describe('shouldSwallowFetchError', () => {
  it('swallows AbortError', () => {
    const error = new Error('aborted');
    error.name = 'AbortError';
    expect(shouldSwallowFetchError(error)).toBe(true);
  });

  it.each([401, 403, 503])('swallows HTTP %s from response.status', (status) => {
    expect(shouldSwallowFetchError(httpError(status))).toBe(true);
  });

  it('swallows HTTP 403 from body.statusCode', () => {
    expect(
      shouldSwallowFetchError({
        name: 'Error',
        message: 'Forbidden',
        body: { statusCode: 403 },
      })
    ).toBe(true);
  });

  it('swallows HTTP 503 from a wrapped original error', () => {
    expect(
      shouldSwallowFetchError({
        name: 'Error',
        message: 'ES|QL failed',
        original: httpError(503),
      })
    ).toBe(true);
  });

  it('swallows an ES|QL security_exception wrapped by the expressions error', () => {
    expect(
      shouldSwallowFetchError({
        name: 'Error',
        message: 'action [indices:data/read/esql] is unauthorized',
        original: {
          name: 'EsError',
          message: 'action [indices:data/read/esql] is unauthorized',
          attributes: { error: { type: 'security_exception', reason: 'unauthorized' } },
        },
      })
    ).toBe(true);
  });

  it('does not swallow other ES|QL errors', () => {
    expect(
      shouldSwallowFetchError({
        name: 'EsError',
        message: 'parsing failed',
        attributes: { error: { type: 'parsing_exception', reason: 'bad query' } },
      })
    ).toBe(false);
  });

  it('does not swallow HTTP 500', () => {
    expect(shouldSwallowFetchError(httpError(500))).toBe(false);
  });

  it('does not swallow HTTP 500 from body.statusCode', () => {
    expect(
      shouldSwallowFetchError({
        name: 'Error',
        message: 'Internal Server Error',
        body: { statusCode: 500 },
      })
    ).toBe(false);
  });

  it('does not swallow a generic Error', () => {
    expect(shouldSwallowFetchError(new Error('boom'))).toBe(false);
  });

  it('does not swallow undefined', () => {
    expect(shouldSwallowFetchError(undefined)).toBe(false);
  });
});

describe('isPrivilegeFetchError', () => {
  it.each([401, 403])('is true for HTTP %s', (status) => {
    expect(isPrivilegeFetchError(httpError(status))).toBe(true);
  });

  it('is true for an ES security_exception', () => {
    expect(
      isPrivilegeFetchError({
        name: 'EsError',
        message: 'unauthorized',
        attributes: { error: { type: 'security_exception' } },
      })
    ).toBe(true);
  });

  it('is false for transient failures and aborts', () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';

    expect(isPrivilegeFetchError(httpError(503))).toBe(false);
    expect(isPrivilegeFetchError(httpError(500))).toBe(false);
    expect(isPrivilegeFetchError(abortError)).toBe(false);
  });
});
