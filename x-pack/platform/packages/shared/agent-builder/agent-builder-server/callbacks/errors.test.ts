/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isCallbackDeliveryError, throwIfNotDelivered } from './errors';

const errorFor = (status: number) => {
  try {
    throwIfNotDelivered({ status });
  } catch (error) {
    return error;
  }
};

describe('throwIfNotDelivered', () => {
  it.each([200, 202, 204])('returns for a %p response', (status) => {
    expect(errorFor(status)).toBeUndefined();
  });

  it.each([500, 503])('throws a retryable delivery error for a %p response', (status) => {
    const error = errorFor(status);

    expect(isCallbackDeliveryError(error) && error.retryable).toBe(true);
    expect(error).toHaveProperty('message', `Callback delivery failed with status ${status}`);
  });

  it.each([301, 400, 404])(
    'throws a delivery error that is not retryable for a %p response',
    (status) => {
      const error = errorFor(status);

      expect(isCallbackDeliveryError(error) && !error.retryable).toBe(true);
    }
  );
});
