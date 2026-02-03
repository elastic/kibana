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
import type { ApiKeyInvalidationFn } from '../invalidate_api_keys_task';

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
