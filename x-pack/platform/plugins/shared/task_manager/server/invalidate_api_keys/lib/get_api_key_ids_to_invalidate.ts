/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFindResponse, SavedObjectsClientContract } from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-shared';
import type { AggregationsStringTermsBucketKeys } from '@elastic/elasticsearch/lib/api/types';
import type { ApiKeyToInvalidate } from '../../saved_objects/schemas/api_key_to_invalidate';
import { TASK_SO_NAME } from '../../saved_objects';
import type { SerializedConcreteTaskInstance } from '../../task';
import { TaskStatus } from '../../task';
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

interface RunningTask {
  taskId: string;
  taskStartedAt: string;
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

export async function getApiKeyIdsToInvalidate({
  apiKeySOsPendingInvalidation,
  encryptedSavedObjectsClient,
  savedObjectsClient,
  savedObjectType,
  savedObjectTypesToQuery,
}: GetApiKeyIdsToInvalidateOpts): Promise<GetApiKeysToInvalidateResult> {
  const apiKeyIds: ApiKeyIdAndSOId[] = [];
  const uiamApiKeys: UiamApiKeyAndSOId[] = [];
  const runningTasks = new Map<string, RunningTask>();

  const trackRunningTask = (soId: string, { taskId, taskStartedAt }: ApiKeyToInvalidate) => {
    if (taskId && taskStartedAt) {
      runningTasks.set(soId, { taskId, taskStartedAt });
    }
  };

  if (encryptedSavedObjectsClient) {
    // Decrypt the apiKeyId for each pending invalidation SO
    await Promise.all(
      apiKeySOsPendingInvalidation.saved_objects.map(async (apiKeyPendingInvalidationSO) => {
        const decryptedApiKeyPendingInvalidationObject =
          await encryptedSavedObjectsClient.getDecryptedAsInternalUser<ApiKeyToInvalidate>(
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

  const soIdsUsedByRunningTasks = await getSOIdsUsedByRunningTasks(
    runningTasks,
    savedObjectsClient
  );
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

// Returns the ids of the pending invalidation SOs whose key was replaced during a task run that is
// still in progress. That run keeps using the replaced key until it finishes.
async function getSOIdsUsedByRunningTasks(
  runningTasksBySOId: Map<string, RunningTask>,
  savedObjectsClient: SavedObjectsClientContract
): Promise<Set<string>> {
  const soIds = new Set<string>();
  if (runningTasksBySOId.size === 0) {
    return soIds;
  }

  const allTaskIds = Array.from(runningTasksBySOId.values(), (runningTask) => runningTask.taskId);
  const taskIds = [...new Set(allTaskIds)];
  const { saved_objects: tasks } = await savedObjectsClient.bulkGet<
    Pick<SerializedConcreteTaskInstance, 'status' | 'startedAt' | 'retryAt'>
  >(taskIds.map((id) => ({ type: TASK_SO_NAME, id })));

  const now = Date.now();
  const runningTasks = new Map<string, string>();
  for (const task of tasks) {
    if (isSavedObjectErrorResult(task)) {
      continue;
    }
    const { id, attributes } = task;
    if (attributes.status !== TaskStatus.Running || !attributes.startedAt) {
      continue;
    }
    // A run that outlived its retryAt is presumed dead (e.g. its Kibana node crashed).
    if (!attributes.retryAt || Date.parse(attributes.retryAt) <= now) {
      continue;
    }
    runningTasks.set(id, attributes.startedAt);
  }

  for (const [soId, { taskId, taskStartedAt }] of runningTasksBySOId) {
    const startedAt = runningTasks.get(taskId);
    if (startedAt && Date.parse(startedAt) === Date.parse(taskStartedAt)) {
      soIds.add(soId);
    }
  }
  return soIds;
}
