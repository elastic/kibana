/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  InvalidateAPIKeysParams,
  InvalidateAPIKeyResult as SecurityPluginInvalidateAPIKeyResult,
} from '@kbn/security-plugin-types-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';

import { type FakeRawRequest, type Headers } from '@kbn/core-http-server';
import type { ApiKeyInvalidationFn, UiamApiKeyInvalidationFn } from '../invalidate_api_keys_task';

export type InvalidateAPIKeyResult =
  | { apiKeysEnabled: false }
  | { apiKeysEnabled: true; result: SecurityPluginInvalidateAPIKeyResult };

export async function invalidateAPIKeys(
  params: InvalidateAPIKeysParams,
  invalidateApiKeyFn?: ApiKeyInvalidationFn
): Promise<InvalidateAPIKeyResult> {
  if (!invalidateApiKeyFn) {
    return { apiKeysEnabled: false };
  }
  const invalidateAPIKeyResult = await invalidateApiKeyFn(params);
  // Null when Elasticsearch security is disabled
  if (!invalidateAPIKeyResult) {
    return { apiKeysEnabled: false };
  }
  return {
    apiKeysEnabled: true,
    result: invalidateAPIKeyResult,
  };
}

export async function invalidateUiamAPIKeys(
  params: {
    uiamApiKey: string;
    apiKeyId: string;
  },
  invalidateUiamApiKeyFn?: UiamApiKeyInvalidationFn
): Promise<InvalidateAPIKeyResult> {
  if (!invalidateUiamApiKeyFn) {
    return { apiKeysEnabled: false };
  }

  const requestHeaders: Headers = {};
  requestHeaders.authorization = `ApiKey ${params.uiamApiKey}`;
  const fakeRawRequest: FakeRawRequest = {
    headers: requestHeaders,
    path: '/',
  };

  const fakeRequest = kibanaRequestFactory(fakeRawRequest);

  const invalidateUiamAPIKeyResult = await invalidateUiamApiKeyFn(fakeRequest, {
    id: params.apiKeyId,
  });
  // Null when Elasticsearch security is disabled
  if (!invalidateUiamAPIKeyResult) {
    return { apiKeysEnabled: false };
  }
  return {
    apiKeysEnabled: true,
    result: invalidateUiamAPIKeyResult,
  };
}
