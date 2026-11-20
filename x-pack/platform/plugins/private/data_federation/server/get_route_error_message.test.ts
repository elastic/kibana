/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRouteErrorMessage, getRouteErrorStatusCode } from './get_route_error_message';

const elasticsearchError = (body: unknown): Error =>
  Object.assign(new Error('status_exception\n\tCaused by:\n\t\tvalidation_exception: ...'), {
    meta: { statusCode: 400, body },
  });

describe('getRouteErrorMessage', () => {
  it('prefers the reason in the Elasticsearch response body over the flattened message', () => {
    const error = elasticsearchError({
      error: {
        type: 'status_exception',
        reason: 'Validation Failed: 1: federated authentication is disabled;',
        root_cause: [{ type: 'status_exception', reason: 'root cause' }],
      },
      status: 400,
    });

    expect(getRouteErrorMessage(error)).toBe(
      'Validation Failed: 1: federated authentication is disabled;'
    );
  });

  it('falls back to the first root cause when the body error has no reason', () => {
    const error = elasticsearchError({
      error: { type: 'status_exception', root_cause: [{ reason: 'root cause' }] },
    });

    expect(getRouteErrorMessage(error)).toBe('root cause');
  });

  it('uses a plain string body error, as sent for unknown routes', () => {
    const error = elasticsearchError({ error: 'no handler found for uri [/_query/x]' });

    expect(getRouteErrorMessage(error)).toBe('no handler found for uri [/_query/x]');
  });

  it('keeps the error message when there is no Elasticsearch response body', () => {
    expect(getRouteErrorMessage(new Error('boom'))).toBe('boom');
  });
});

describe('getRouteErrorStatusCode', () => {
  it('reads the status code an Elasticsearch client error exposes directly', () => {
    expect(getRouteErrorStatusCode({ statusCode: 403 })).toBe(403);
  });

  it('falls back to the status code on the response metadata', () => {
    expect(getRouteErrorStatusCode({ meta: { statusCode: 400 } })).toBe(400);
  });

  it('returns undefined when the error carries no usable status code', () => {
    expect(getRouteErrorStatusCode(new Error('boom'))).toBeUndefined();
    expect(getRouteErrorStatusCode({ statusCode: 200 })).toBeUndefined();
    expect(getRouteErrorStatusCode({ statusCode: '403' })).toBeUndefined();
    expect(getRouteErrorStatusCode('boom')).toBeUndefined();
  });
});
