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

export interface UiamApiKeyAndSOId {
  id: string;
  apiKeyId: string;
  uiamApiKey: string;
}

export interface UndecryptableApiKeyAndSOId {
  id: string;
  /** Raw stored value — plaintext when written by the pre-encryption-fix provisioning bug. */
  apiKeyId?: string;
  /** Raw stored value — plaintext when written by the pre-encryption-fix provisioning bug. */
  uiamApiKey?: string;
  error: Error;
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
  undecryptableApiKeysToInvalidate?: UndecryptableApiKeyAndSOId[];
}

export async function getApiKeyIdsToInvalidate({
  apiKeySOsPendingInvalidation,
  encryptedSavedObjectsClient,
  savedObjectsClient,
  savedObjectType,
  savedObjectTypesToQuery,
}: GetApiKeyIdsToInvalidateOpts): Promise<GetApiKeysToInvalidateResult> {
  const apiKeyIds: ApiKeyIdAndSOId[] = [];
  const uiamApiKeys: UiamApiKeyAndSOId[] = [];
  const undecryptableApiKeys: UndecryptableApiKeyAndSOId[] = [];

  if (encryptedSavedObjectsClient) {
    // Decrypt the apiKeyId for each pending invalidation SO
    await Promise.all(
      apiKeySOsPendingInvalidation.saved_objects.map(async (apiKeyPendingInvalidationSO) => {
        let decryptedApiKeyPendingInvalidationObject;
        try {
          decryptedApiKeyPendingInvalidationObject =
            await encryptedSavedObjectsClient.getDecryptedAsInternalUser<ApiKeyToInvalidate>(
              savedObjectType,
              apiKeyPendingInvalidationSO.id
            );
        } catch (error) {
          // Decryption failures are deterministic (e.g. attributes persisted in plaintext by a
          // pre-encryption-fix provisioning run), so this SO can never be drained through the
          // normal path — without special handling it would produce decrypt errors on every task
          // run, forever, and (because the whole batch is decrypted together) block draining of
          // healthy SOs. Collect it with the raw stored attribute values: when the root cause is
          // the plaintext bug those values are the real key id/key and the key can still be
          // invalidated before the SO is deleted.
          const { uiamApiKey, apiKeyId } = apiKeyPendingInvalidationSO.attributes;
          undecryptableApiKeys.push({
            id: apiKeyPendingInvalidationSO.id,
            apiKeyId,
            uiamApiKey,
            error,
          });
          return;
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

  // Query saved objects index to see if any API keys are in use. Raw ids from undecryptable SOs
  // are included: when the stored value is plaintext (the provisioning bug) it is a real key id
  // that may still be referenced.
  const apiKeyIdStrings = apiKeyIds.map(({ apiKeyId }) => apiKeyId);
  const uiamApiKeyIdStrings = uiamApiKeys.map(({ apiKeyId }) => apiKeyId);
  const undecryptableApiKeyIdStrings = undecryptableApiKeys
    .map(({ apiKeyId }) => apiKeyId)
    .filter((apiKeyId): apiKeyId is string => Boolean(apiKeyId));
  const allApiKeyIdStrings = apiKeyIdStrings
    .concat(uiamApiKeyIdStrings)
    .concat(undecryptableApiKeyIdStrings);

  let apiKeyIdsInUseBuckets: AggregationsStringTermsBucketKeys[] = [];

  for (const type of savedObjectTypesToQuery) {
    apiKeyIdsInUseBuckets = apiKeyIdsInUseBuckets.concat(
      await queryForApiKeysInUse({
        apiKeyIds: allApiKeyIdStrings,
        savedObjectTypeToQuery: type,
        savedObjectsClient,
      })
    );
  }

  const apiKeyIdsToInvalidate: ApiKeyIdAndSOId[] = [];
  const uiamApiKeysToInvalidate: UiamApiKeyAndSOId[] = [];
  const apiKeyIdsToExclude: ApiKeyIdAndSOId[] = [];
  const undecryptableApiKeysToInvalidate: UndecryptableApiKeyAndSOId[] = [];

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

  undecryptableApiKeys.forEach((undecryptableApiKey) => {
    // If the raw id matches a key still in use, keep the SO for a later run rather than
    // deleting it — deleting now would leak the key once the referencing object releases it.
    if (
      undecryptableApiKey.apiKeyId &&
      apiKeyIdsInUseBuckets.find((bucket) => bucket.key === undecryptableApiKey.apiKeyId)
    ) {
      apiKeyIdsToExclude.push({
        id: undecryptableApiKey.id,
        apiKeyId: undecryptableApiKey.apiKeyId,
      });
    } else {
      undecryptableApiKeysToInvalidate.push(undecryptableApiKey);
    }
  });

  return {
    apiKeyIdsToInvalidate,
    apiKeyIdsToExclude,
    ...(uiamApiKeysToInvalidate.length > 0 ? { uiamApiKeysToInvalidate } : {}),
    ...(undecryptableApiKeysToInvalidate.length > 0 ? { undecryptableApiKeysToInvalidate } : {}),
  };
}
