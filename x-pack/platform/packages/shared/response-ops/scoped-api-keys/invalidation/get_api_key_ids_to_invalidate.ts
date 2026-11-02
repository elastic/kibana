/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFindResponse, SavedObjectsClientContract } from '@kbn/core/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-shared';
import type { AggregationsStringTermsBucketKeys } from '@elastic/elasticsearch/lib/api/types';
import type { ApiKeyPendingInvalidation, GetSOIdsUsedByRunningTasksFn, RunningTask } from './types';
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
  apiKeySOsPendingInvalidation: SavedObjectsFindResponse<ApiKeyPendingInvalidation>;
  encryptedSavedObjectsClient?: EncryptedSavedObjectsClient;
  getSOIdsUsedByRunningTasks?: GetSOIdsUsedByRunningTasksFn;
  savedObjectsClient: SavedObjectsClientContract;
  savedObjectType: string;
  savedObjectTypesToQuery: SavedObjectTypesToQuery[];
}

interface GetApiKeysToInvalidateResult {
  apiKeyIdsToInvalidate: ApiKeyIdAndSOId[];
  uiamApiKeysToInvalidate?: UiamApiKeyAndSOId[];
  apiKeyIdsToExclude: ApiKeyIdAndSOId[];
}

export async function getApiKeyIdsToInvalidate({
  apiKeySOsPendingInvalidation,
  encryptedSavedObjectsClient,
  getSOIdsUsedByRunningTasks,
  savedObjectsClient,
  savedObjectType,
  savedObjectTypesToQuery,
}: GetApiKeyIdsToInvalidateOpts): Promise<GetApiKeysToInvalidateResult> {
  const apiKeyIds: ApiKeyIdAndSOId[] = [];
  const uiamApiKeys: UiamApiKeyAndSOId[] = [];
  const runningTasks = new Map<string, RunningTask>();

  const trackRunningTask = (soId: string, { taskId, taskStartedAt }: ApiKeyPendingInvalidation) => {
    if (taskId && taskStartedAt) {
      runningTasks.set(soId, { taskId, taskStartedAt });
    }
  };

  if (encryptedSavedObjectsClient) {
    // Decrypt the apiKeyId for each pending invalidation SO
    await Promise.all(
      apiKeySOsPendingInvalidation.saved_objects.map(async (apiKeyPendingInvalidationSO) => {
        const decryptedApiKeyPendingInvalidationObject =
          await encryptedSavedObjectsClient.getDecryptedAsInternalUser<ApiKeyPendingInvalidation>(
            savedObjectType,
            apiKeyPendingInvalidationSO.id
          );

        trackRunningTask(
          decryptedApiKeyPendingInvalidationObject.id,
          decryptedApiKeyPendingInvalidationObject.attributes
        );

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
      trackRunningTask(apiKeyPendingInvalidationSO.id, apiKeyPendingInvalidationSO.attributes);

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
        apiKeyIds: allApiKeyIdStrings,
        savedObjectTypeToQuery: type,
        savedObjectsClient,
      })
    );
  }

  const soIdsUsedByRunningTasks = getSOIdsUsedByRunningTasks
    ? await getSOIdsUsedByRunningTasks(runningTasks, savedObjectsClient)
    : new Set<string>();
  // Keys are shared across tasks of the same type, so protect every pending SO with the same key.
  const apiKeyIdsUsedByRunningTasks = new Set(
    [...apiKeyIds, ...uiamApiKeys]
      .filter(({ id }) => soIdsUsedByRunningTasks.has(id))
      .map(({ apiKeyId }) => apiKeyId)
  );
  const isInUse = (apiKeyId: string) =>
    apiKeyIdsUsedByRunningTasks.has(apiKeyId) ||
    apiKeyIdsInUseBuckets.some((bucket) => bucket.key === apiKeyId);

  const apiKeyIdsToInvalidate: ApiKeyIdAndSOId[] = [];
  const uiamApiKeysToInvalidate: UiamApiKeyAndSOId[] = [];
  const apiKeyIdsToExclude: ApiKeyIdAndSOId[] = [];

  apiKeyIds.forEach(({ id, apiKeyId }) => {
    if (isInUse(apiKeyId)) {
      apiKeyIdsToExclude.push({ id, apiKeyId });
    } else {
      apiKeyIdsToInvalidate.push({ id, apiKeyId });
    }
  });

  uiamApiKeys.forEach(({ id, apiKeyId, uiamApiKey }) => {
    if (isInUse(apiKeyId)) {
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
