/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFindResponse, SavedObjectsClientContract } from '@kbn/core/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-shared';
import type { AggregationsStringTermsBucketKeys } from '@elastic/elasticsearch/lib/api/types';
import type { ApiKeyToInvalidate } from '../../saved_objects/schemas/api_key_to_invalidate';
import type { SavedObjectTypesToQuery } from './run_invalidate';
import { queryForApiKeysInUse } from './query_for_api_keys_in_use';

export interface ApiKeyIdAndSOId {
  id: string;
  apiKeyId: string;
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
  apiKeyIdsToExclude: ApiKeyIdAndSOId[];
}

export async function getApiKeyIdsToInvalidate({
  apiKeySOsPendingInvalidation,
  encryptedSavedObjectsClient,
  savedObjectsClient,
  savedObjectType,
  savedObjectTypesToQuery,
}: GetApiKeyIdsToInvalidateOpts): Promise<GetApiKeysToInvalidateResult> {
  let apiKeyIds: ApiKeyIdAndSOId[] = [];
  if (encryptedSavedObjectsClient) {
    // Decrypt the apiKeyId for each pending invalidation SO
    apiKeyIds = await Promise.all(
      apiKeySOsPendingInvalidation.saved_objects.map(async (apiKeyPendingInvalidationSO) => {
        const decryptedApiKeyPendingInvalidationObject =
          await encryptedSavedObjectsClient.getDecryptedAsInternalUser<ApiKeyToInvalidate>(
            savedObjectType,
            apiKeyPendingInvalidationSO.id
          );
        return {
          id: decryptedApiKeyPendingInvalidationObject.id,
          apiKeyId: decryptedApiKeyPendingInvalidationObject.attributes.apiKeyId,
        };
      })
    );
  } else {
    // No decryption needed, return the apiKeyId as-is
    apiKeyIds = apiKeySOsPendingInvalidation.saved_objects.map((apiKeyPendingInvalidationSO) => ({
      id: apiKeyPendingInvalidationSO.id,
      apiKeyId: apiKeyPendingInvalidationSO.attributes.apiKeyId,
    }));
  }

  // Query saved objects index to see if any API keys are in use
  const apiKeyIdStrings = apiKeyIds.map(({ apiKeyId }) => apiKeyId);
  let apiKeyIdsInUseBuckets: AggregationsStringTermsBucketKeys[] = [];

  for (const type of savedObjectTypesToQuery) {
    apiKeyIdsInUseBuckets = apiKeyIdsInUseBuckets.concat(
      await queryForApiKeysInUse({
        apiKeyIds: apiKeyIdStrings,
        savedObjectTypeToQuery: type,
        savedObjectsClient,
      })
    );
  }

  const apiKeyIdsToInvalidate: ApiKeyIdAndSOId[] = [];
  const apiKeyIdsToExclude: ApiKeyIdAndSOId[] = [];
  apiKeyIds.forEach(({ id, apiKeyId }) => {
    if (apiKeyIdsInUseBuckets.find((bucket) => bucket.key === apiKeyId)) {
      apiKeyIdsToExclude.push({ id, apiKeyId });
    } else {
      apiKeyIdsToInvalidate.push({ id, apiKeyId });
    }
  });

  return { apiKeyIdsToInvalidate, apiKeyIdsToExclude };
}
