/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getS3AuthFailureClass,
  S3_AUTHENTICATION_ERROR_CODES,
  S3_AUTHORIZATION_ERROR_CODES,
} from './s3_auth_failure_classes';

describe('getS3AuthFailureClass', () => {
  it.each(S3_AUTHENTICATION_ERROR_CODES)('puts %s in authentication', (code) => {
    expect(getS3AuthFailureClass(code)).toBe('authentication');
  });

  it.each(S3_AUTHORIZATION_ERROR_CODES)('puts %s in authorization', (code) => {
    expect(getS3AuthFailureClass(code)).toBe('authorization');
  });

  it('has no code in both classes', () => {
    const overlap = S3_AUTHENTICATION_ERROR_CODES.filter((code) =>
      S3_AUTHORIZATION_ERROR_CODES.includes(code)
    );

    expect(overlap).toEqual([]);
  });

  it('goes by the code and not the status: the codes that come back as a 400 are in authentication', () => {
    expect(getS3AuthFailureClass('ExpiredToken')).toBe('authentication');
    expect(getS3AuthFailureClass('InvalidToken')).toBe('authentication');
  });

  it.each([
    // The other S3 codes.
    'NoSuchBucket',
    'SlowDown',
    'ServiceUnavailable',
    'InternalError',
    'RequestTimeout',
    'PermanentRedirect',
    'MissingSecurityHeader',
    'AccessControlListNotSupported',
    'KMS.DisabledException',
    // The exporter's own words, and the fallback of the items metric.
    'timeout',
    'canceled',
    'dns',
    'connection_refused',
    'network',
    'other',
    'queue_full',
    '_OTHER',
    // A code that AWS does not list.
    'AuthorizationHeaderMalformed',
  ])('gives %s no class', (code) => {
    expect(getS3AuthFailureClass(code)).toBeUndefined();
  });

  it('gives no code no class', () => {
    expect(getS3AuthFailureClass(null)).toBeUndefined();
  });

  it('does not read the prototype for a code like "constructor"', () => {
    expect(getS3AuthFailureClass('constructor')).toBeUndefined();
    expect(getS3AuthFailureClass('__proto__')).toBeUndefined();
    expect(getS3AuthFailureClass('toString')).toBeUndefined();
  });

  it('matches the code exactly, with its case', () => {
    expect(getS3AuthFailureClass('accessdenied')).toBeUndefined();
    expect(getS3AuthFailureClass('AccessDenied ')).toBeUndefined();
  });
});
