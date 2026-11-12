/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isCallbackDeliveryError, parseRetryAfter, throwIfNotDelivered } from './errors';

const errorFor = (status: number, retryAfter?: string) => {
  try {
    throwIfNotDelivered({ status, retryAfter });
  } catch (error) {
    return error;
  }
};

describe('throwIfNotDelivered', () => {
  it.each([200, 202, 204])('returns for a %p response', (status) => {
    expect(errorFor(status)).toBeUndefined();
  });

  it.each([429, 500, 503])('throws a retryable delivery error for a %p response', (status) => {
    const error = errorFor(status);

    expect(isCallbackDeliveryError(error) && error.retryable).toBe(true);
    expect(error).toHaveProperty('message', `Callback delivery failed with status ${status}`);
    expect(error).toHaveProperty('retryAfterMs', undefined);
  });

  it.each([429, 503])('carries the Retry-After delay of a %p response', (status) => {
    expect(errorFor(status, '30')).toHaveProperty('retryAfterMs', 30_000);
  });

  it.each([301, 400, 404])(
    'throws a delivery error that is not retryable for a %p response',
    (status) => {
      const error = errorFor(status, '30');

      expect(isCallbackDeliveryError(error) && !error.retryable).toBe(true);
      expect(error).toHaveProperty('retryAfterMs', undefined);
    }
  );
});

describe('parseRetryAfter', () => {
  const now = Date.parse('Wed, 21 Oct 2026 07:28:00 GMT');

  it('parses delta-seconds', () => {
    expect(parseRetryAfter('30', now)).toBe(30_000);
    expect(parseRetryAfter(' 0 ', now)).toBe(0);
  });

  it('parses an HTTP-date relative to now', () => {
    expect(parseRetryAfter('Wed, 21 Oct 2026 07:28:45 GMT', now)).toBe(45_000);
  });

  it('floors an HTTP-date in the past at 0', () => {
    expect(parseRetryAfter('Wed, 21 Oct 2026 07:27:00 GMT', now)).toBe(0);
  });

  it.each([undefined, null, '', '   ', 'soon', '-5', '1.5'])(
    'returns undefined for %p',
    (value) => {
      expect(parseRetryAfter(value, now)).toBeUndefined();
    }
  );
});
