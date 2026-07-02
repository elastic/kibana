/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Logger,
  SavedObjectsFindResponse,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-shared';
import type { AggregationsStringTermsBucketKeys } from '@elastic/elasticsearch/lib/api/types';
import type { ApiKeyToInvalidate } from '../../saved_objects/schemas/api_key_to_invalidate';
import type { SavedObjectTypesToQuery } from './run_invalidate';
import { queryForApiKeysInUse } from './query_for_api_keys_in_use';

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
  logger?: Logger;
}

interface GetApiKeysToInvalidateResult {
  apiKeyIdsToInvalidate: ApiKeyIdAndSOId[];
  uiamApiKeysToInvalidate?: UiamApiKeyAndSOId[];
  apiKeyIdsToExclude: ApiKeyIdAndSOId[];
}

export async function getApiKeyIdsToInvalidate({
  logger,
  apiKeySOsPendingInvalidation,
  encryptedSavedObjectsClient,
  savedObjectsClient,
  savedObjectType,
  savedObjectTypesToQuery,
}: GetApiKeyIdsToInvalidateOpts): Promise<GetApiKeysToInvalidateResult> {
  const apiKeyIds: ApiKeyIdAndSOId[] = [];
  const uiamApiKeys: UiamApiKeyAndSOId[] = [];

  if (encryptedSavedObjectsClient) {
    // Decrypt the apiKeyId for each pending invalidation SO
    await Promise.all(
      apiKeySOsPendingInvalidation.saved_objects.map(async (apiKeyPendingInvalidationSO) => {
        logger?.info(
          `Decrypting API key pending invalidation saved object ${apiKeyPendingInvalidationSO.id}`
        );
        let decryptedApiKeyPendingInvalidationObject;
        try {
          decryptedApiKeyPendingInvalidationObject =
            await encryptedSavedObjectsClient.getDecryptedAsInternalUser<ApiKeyToInvalidate>(
              savedObjectType,
              apiKeyPendingInvalidationSO.id
            );
          logger?.info(
            `Decrypted API key pending invalidation saved object ${JSON.stringify(
              decryptedApiKeyPendingInvalidationObject
            )}`
          );
        } catch (err) {
          logger?.info(
            `Error decrypting API key pending invalidation saved object ${apiKeyPendingInvalidationSO.id}`
          );
          logger?.info(err);
          if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
            // Already deleted, likely by a concurrent invalidation run - nothing to do.
            return;
          }
          throw err;
        }

        const { uiamApiKey, apiKeyId } = decryptedApiKeyPendingInvalidationObject.attributes;
        if (uiamApiKey) {
          uiamApiKeys.push({
            id: decryptedApiKeyPendingInvalidationObject.id,
            apiKeyId,
            uiamApiKey,
          });
        } else {
          apiKeyIds.push({
            id: decryptedApiKeyPendingInvalidationObject.id,
            apiKeyId,
          });
        }
      })
    );
  } else {
    // No decryption needed, return the apiKeyId as-is
    apiKeySOsPendingInvalidation.saved_objects.forEach((apiKeyPendingInvalidationSO) => {
      const { uiamApiKey, apiKeyId } = apiKeyPendingInvalidationSO.attributes;
      if (uiamApiKey) {
        uiamApiKeys.push({
          id: apiKeyPendingInvalidationSO.id,
          apiKeyId,
          uiamApiKey,
        });
      } else {
        apiKeyIds.push({
          id: apiKeyPendingInvalidationSO.id,
          apiKeyId,
        });
      }
    });
  }

  // Query saved objects index to see if any API keys are in use
  const apiKeyIdStrings = apiKeyIds.map(({ apiKeyId }) => apiKeyId);
  const uiamApiKeyIdStrings = uiamApiKeys.map(({ apiKeyId }) => apiKeyId);
  const allApiKeyIdStrings = apiKeyIdStrings.concat(uiamApiKeyIdStrings);

  let apiKeyIdsInUseBuckets: AggregationsStringTermsBucketKeys[] = [];

  for (const type of savedObjectTypesToQuery) {
    apiKeyIdsInUseBuckets = apiKeyIdsInUseBuckets.concat(
      await queryForApiKeysInUse({
        logger,
        apiKeyIds: allApiKeyIdStrings,
        savedObjectTypeToQuery: type,
        savedObjectsClient,
      })
    );
  }

  const apiKeyIdsToInvalidate: ApiKeyIdAndSOId[] = [];
  const uiamApiKeysToInvalidate: UiamApiKeyAndSOId[] = [];
  const apiKeyIdsToExclude: ApiKeyIdAndSOId[] = [];

  apiKeyIds.forEach(({ id, apiKeyId }) => {
    if (apiKeyIdsInUseBuckets.find((bucket) => bucket.key === apiKeyId)) {
      apiKeyIdsToExclude.push({ id, apiKeyId });
    } else {
      apiKeyIdsToInvalidate.push({ id, apiKeyId });
    }
  });

  uiamApiKeys.forEach(({ id, apiKeyId, uiamApiKey }) => {
    if (apiKeyIdsInUseBuckets.find((bucket) => bucket.key === apiKeyId)) {
      apiKeyIdsToExclude.push({ id, apiKeyId });
    } else {
      uiamApiKeysToInvalidate.push({ id, apiKeyId, uiamApiKey });
    }
  });

  return {
    apiKeyIdsToInvalidate,
    apiKeyIdsToExclude,
    ...(uiamApiKeysToInvalidate.length > 0 ? { uiamApiKeysToInvalidate } : {}),
  };
}
