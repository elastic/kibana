/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { isApiAuthorized, getApiError } from '.';
import { API_STATUS } from '../../constants';
import type { CcrState } from '../reducers';
import type { CcrApiError } from '../../services/http_error';

const makeHttpFetchError = ({
  statusCode,
  responseStatus,
  message = 'boom',
}: {
  statusCode?: number;
  responseStatus?: number;
  message?: string;
}): IHttpFetchError<ResponseErrorBody> => {
  const body = {
    message,
    ...(statusCode !== undefined ? { statusCode } : {}),
  } as unknown as ResponseErrorBody;
  const error = Object.assign(new Error(message), {
    body,
    request: { path: '/fake' } as unknown as IHttpFetchError['request'],
    ...(responseStatus !== undefined
      ? {
          response: {
            status: responseStatus,
          } as unknown as IHttpFetchError['response'],
        }
      : {}),
  });
  return error as unknown as IHttpFetchError<ResponseErrorBody>;
};

const makeState = (scope: string, error: CcrApiError | null): CcrState =>
  ({
    api: {
      status: {},
      error: error ? { [scope]: error } : {},
    },
  } as unknown as CcrState);

describe('store/selectors/isApiAuthorized', () => {
  const scope = 'autoFollowPattern';

  it('returns true when there is no error for the scope', () => {
    const state = makeState(scope, null);
    expect(isApiAuthorized(scope)(state)).toBe(true);
  });

  it('returns false for a 403 HttpFetchError exposed via response.status', () => {
    const state = makeState(scope, makeHttpFetchError({ responseStatus: 403 }));
    expect(isApiAuthorized(scope)(state)).toBe(false);
  });

  it('returns false for a 403 HttpFetchError exposed via body.statusCode', () => {
    const state = makeState(scope, makeHttpFetchError({ statusCode: 403 }));
    expect(isApiAuthorized(scope)(state)).toBe(false);
  });

  it('returns true for non-403 HttpFetchErrors (e.g. 404, 500)', () => {
    const state404 = makeState(scope, makeHttpFetchError({ statusCode: 404 }));
    const state500 = makeState(scope, makeHttpFetchError({ responseStatus: 500 }));
    expect(isApiAuthorized(scope)(state404)).toBe(true);
    expect(isApiAuthorized(scope)(state500)).toBe(true);
  });

  it('returns true for a plain Error without a status (treats as non-auth error)', () => {
    const state = makeState(scope, new Error('unexpected'));
    expect(isApiAuthorized(scope)(state)).toBe(true);
  });

  // `HttpFetchError` exposes status via `error.response.status` or
  // `error.body.statusCode`, not via a top-level `error.status`. The selector
  // must read from those fields — reading a top-level `error.status` would
  // always be `undefined`, leaving the unauthorized UI branch unreachable.
  it('does not read a non-existent top-level error.status', () => {
    const error = makeHttpFetchError({ responseStatus: 403 });
    // Even if future code accidentally attaches a misleading top-level `status`,
    // the selector must keep using the real HttpFetchError fields.
    Object.assign(error, { status: 200 });
    const state = makeState(scope, error as unknown as CcrApiError);
    expect(isApiAuthorized(scope)(state)).toBe(false);
  });
});

describe('store/selectors/getApiError', () => {
  it('returns null when there is no error for the scope', () => {
    const state = makeState('other', null);
    expect(getApiError('absent')(state)).toBeNull();
  });

  it('returns the stored error for the scope', () => {
    const error = new Error('boom');
    const state = makeState('autoFollowPattern', error);
    expect(getApiError('autoFollowPattern')(state)).toBe(error);
  });
});

describe('store/selectors smoke', () => {
  it('API_STATUS constants are importable (sanity check for reducer wiring)', () => {
    expect(API_STATUS.IDLE).toBeDefined();
  });
});
