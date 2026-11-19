/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deriveErrorCodeFromStatus } from './derive_error_code';

describe('deriveErrorCodeFromStatus', () => {
  it.each([
    [400, 'BAD_REQUEST'],
    [401, 'UNAUTHORIZED'],
    [403, 'FORBIDDEN'],
    [404, 'NOT_FOUND'],
    [409, 'CONFLICT'],
    [422, 'UNPROCESSABLE_ENTITY'],
    [429, 'TOO_MANY_REQUESTS'],
    [500, 'INTERNAL_SERVER_ERROR'],
    [502, 'BAD_GATEWAY'],
    [503, 'SERVICE_UNAVAILABLE'],
    [504, 'GATEWAY_TIMEOUT'],
  ])('maps %i to "%s"', (status, expected) => {
    expect(deriveErrorCodeFromStatus(status)).toBe(expected);
  });

  it('falls back to BAD_REQUEST for unknown 4xx codes', () => {
    expect(deriveErrorCodeFromStatus(418)).toBe('BAD_REQUEST');
  });

  it('falls back to INTERNAL_SERVER_ERROR for unknown 5xx codes', () => {
    expect(deriveErrorCodeFromStatus(599)).toBe('INTERNAL_SERVER_ERROR');
  });

  it('falls back to INTERNAL_SERVER_ERROR for non-error status codes', () => {
    expect(deriveErrorCodeFromStatus(200)).toBe('INTERNAL_SERVER_ERROR');
  });
});
