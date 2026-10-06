/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { ApiKeyIdAndSOId, UiamApiKeyAndSOId } from './get_api_key_ids_to_invalidate';
import type { ApiKeyInvalidationFn, UiamApiKeyInvalidationFn } from '../invalidate_api_keys_task';
interface InvalidateApiKeysAndDeleteSO {
  apiKeyIdsToInvalidate: ApiKeyIdAndSOId[];
  uiamApiKeysToInvalidate?: UiamApiKeyAndSOId[];
  invalidateApiKeyFn?: ApiKeyInvalidationFn;
  invalidateUiamApiKeyFn?: UiamApiKeyInvalidationFn;
  logger: Logger;
  missingApiKeyRetries: Record<string, number>;
  savedObjectsClient: SavedObjectsClientContract;
  savedObjectType: string;
}
export interface InvalidateApiKeysResult {
  totalInvalidated: number;
  missingApiKeyRetries: Record<string, number>;
}
export declare function invalidateApiKeysAndDeletePendingApiKeySavedObject({
  apiKeyIdsToInvalidate,
  uiamApiKeysToInvalidate,
  invalidateApiKeyFn,
  invalidateUiamApiKeyFn,
  logger,
  missingApiKeyRetries: inputRetries,
  savedObjectsClient,
  savedObjectType,
}: InvalidateApiKeysAndDeleteSO): Promise<InvalidateApiKeysResult>;
export {};
