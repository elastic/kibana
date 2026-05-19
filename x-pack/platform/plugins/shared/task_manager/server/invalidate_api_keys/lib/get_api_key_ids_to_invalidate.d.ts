/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFindResponse, SavedObjectsClientContract } from '@kbn/core/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-shared';
import type { ApiKeyToInvalidate } from '../../saved_objects/schemas/api_key_to_invalidate';
import type { SavedObjectTypesToQuery } from './run_invalidate';
export interface ApiKeyIdAndSOId {
  id: string;
  apiKeyId: string;
}
export interface UiamApiKeyAndSOId {
  id: string;
  apiKeyId: string;
  uiamApiKey: string;
}
interface GetApiKeyIdsToInvalidateOpts {
  apiKeySOsPendingInvalidation: SavedObjectsFindResponse<ApiKeyToInvalidate>;
  encryptedSavedObjectsClient?: EncryptedSavedObjectsClient;
  savedObjectsClient: SavedObjectsClientContract;
  savedObjectType: string;
  savedObjectTypesToQuery: SavedObjectTypesToQuery[];
}
interface GetApiKeysToInvalidateResult {
  apiKeyIdsToInvalidate: ApiKeyIdAndSOId[];
  uiamApiKeysToInvalidate?: UiamApiKeyAndSOId[];
  apiKeyIdsToExclude: ApiKeyIdAndSOId[];
}
export declare function getApiKeyIdsToInvalidate({
  apiKeySOsPendingInvalidation,
  encryptedSavedObjectsClient,
  savedObjectsClient,
  savedObjectType,
  savedObjectTypesToQuery,
}: GetApiKeyIdsToInvalidateOpts): Promise<GetApiKeysToInvalidateResult>;
export {};
