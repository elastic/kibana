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
import type { ApiKeyInvalidationFn, UiamApiKeyInvalidationFn } from '../invalidate_api_keys_task';
export type InvalidateAPIKeyResult =
  | {
      apiKeysEnabled: false;
    }
  | {
      apiKeysEnabled: true;
      result: SecurityPluginInvalidateAPIKeyResult;
    };
export declare function invalidateAPIKeys(
  params: InvalidateAPIKeysParams,
  invalidateApiKeyFn?: ApiKeyInvalidationFn
): Promise<InvalidateAPIKeyResult>;
export declare function invalidateUiamAPIKeys(
  params: {
    uiamApiKey: string;
    apiKeyId: string;
  },
  invalidateUiamApiKeyFn?: UiamApiKeyInvalidationFn
): Promise<InvalidateAPIKeyResult>;
