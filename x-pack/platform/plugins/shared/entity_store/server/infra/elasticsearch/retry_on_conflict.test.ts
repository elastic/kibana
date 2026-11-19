/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as esErrors } from '@elastic/elasticsearch';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { retryOnConflict } from './retry_on_conflict';

const fastRetries = { retries: 3, minTimeout: 1, maxTimeout: 1 };

const soConflictError = () => SavedObjectsErrorHelpers.createConflictError('type', 'id');

const esConflictError = () =>
  new esErrors.ResponseError({
    body: {},
    statusCode: 409,
    headers: {},
    warnings: [],
    meta: {},
  } as unknown as ConstructorParameters<typeof esErrors.ResponseError>[0]);

describe('retryOnConflict', () => {
  it('returns the result when fn succeeds', async () => {
    await expect(retryOnConflict(async () => 'ok')).resolves.toBe('ok');
  });

  it('retries on saved objects conflict errors', async () => {
    const fn = jest.fn().mockRejectedValueOnce(soConflictError()).mockResolvedValue('ok');

    await expect(retryOnConflict(fn, fastRetries)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries on elasticsearch 409 responses', async () => {
    const fn = jest.fn().mockRejectedValueOnce(esConflictError()).mockResolvedValue('ok');

    await expect(retryOnConflict(fn, fastRetries)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('rejects with the original error on non-conflict failures without retrying', async () => {
    const failure = new Error('boom');
    const fn = jest.fn().mockRejectedValue(failure);

    await expect(retryOnConflict(fn, fastRetries)).rejects.toBe(failure);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('gives up after the configured retries and rejects with the conflict error', async () => {
    const fn = jest.fn().mockRejectedValue(soConflictError());

    await expect(retryOnConflict(fn, { ...fastRetries, retries: 2 })).rejects.toThrow('conflict');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
