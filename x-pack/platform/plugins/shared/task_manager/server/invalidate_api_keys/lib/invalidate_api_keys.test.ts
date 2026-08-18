/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { invalidateUiamAPIKeys } from './invalidate_api_keys';

describe('invalidateUiamAPIKeys', () => {
  const invalidateResult = { invalidated_api_keys: ['key-id'], error_count: 0 };

  const getAuthorizationHeader = (request: KibanaRequest) => request.headers.authorization;

  test('returns apiKeysEnabled: false when no invalidation function is provided', async () => {
    await expect(
      invalidateUiamAPIKeys({ uiamApiKey: 'essu_secret', apiKeyId: 'key-id' })
    ).resolves.toEqual({ apiKeysEnabled: false });
  });

  test('authenticates the forged request with a raw UIAM credential as-is', async () => {
    const invalidateUiamApiKeyFn = jest.fn().mockResolvedValue(invalidateResult);

    await invalidateUiamAPIKeys(
      { uiamApiKey: 'essu_secret', apiKeyId: 'key-id' },
      invalidateUiamApiKeyFn
    );

    expect(invalidateUiamApiKeyFn).toHaveBeenCalledTimes(1);
    const [request, params] = invalidateUiamApiKeyFn.mock.calls[0];
    expect(getAuthorizationHeader(request)).toBe('ApiKey essu_secret');
    expect(params).toEqual({ id: 'key-id' });
  });

  test('normalizes a `base64(id:secret)` UIAM key before authenticating the forged request', async () => {
    const invalidateUiamApiKeyFn = jest.fn().mockResolvedValue(invalidateResult);

    await invalidateUiamAPIKeys(
      {
        uiamApiKey: Buffer.from('key-id:essu_secret').toString('base64'),
        apiKeyId: 'key-id',
      },
      invalidateUiamApiKeyFn
    );

    const [request] = invalidateUiamApiKeyFn.mock.calls[0];
    expect(getAuthorizationHeader(request)).toBe('ApiKey essu_secret');
  });
});
