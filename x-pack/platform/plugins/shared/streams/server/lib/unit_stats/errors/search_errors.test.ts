/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { isMissingStreamError, toSearchError } from './search_errors';

const responseError = (statusCode: number) =>
  new errors.ResponseError({ statusCode, body: {}, headers: {}, warnings: [], meta: {} as never });

describe('toSearchError', () => {
  it.each([
    ['a 403', responseError(403), 'forbidden', 403],
    ['a 429', responseError(429), 'unavailable', 503],
    ['a 503', responseError(503), 'unavailable', 503],
    ['a timeout', new errors.TimeoutError('timeout', {} as never), 'timeout', 503],
    ['a 500', responseError(500), 'error', 500],
    ['an unknown error', new Error('boom'), 'error', 500],
  ])('maps %s to the %s code and a %s status', (_label, error, code, statusCode) => {
    const mapped = toSearchError(error, 'destination stats');

    expect(mapped.code).toBe(code);
    expect(mapped.statusCode).toBe(statusCode);
    expect(mapped.toStatsError().code).toBe(code);
  });

  it('keeps the original error as the cause and out of the reason', () => {
    const original = new Error('raw body with secrets');

    const mapped = toSearchError(original, 'stats');

    expect(mapped.cause).toBe(original);
    expect(mapped.toStatsError().reason).toBe('The stats query failed.');
  });
});

describe('isMissingStreamError', () => {
  it('is true for a 404 only', () => {
    expect(isMissingStreamError(responseError(404))).toBe(true);
    expect(isMissingStreamError(responseError(403))).toBe(false);
    expect(isMissingStreamError(new Error('404'))).toBe(false);
  });
});
