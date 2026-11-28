/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core/server';
import type { ApiKeyToInvalidate } from '../../saved_objects/schemas/api_key_to_invalidate';
import { TASK_SO_NAME } from '../../saved_objects';
import type { SerializedConcreteTaskInstance } from '../../task';
import { TaskStatus } from '../../task';
import { PAGE_SIZE } from './constants';
import { getFindFilter } from './get_find_filter';

const BULK_GET_SIZE = 100;

interface RunningTaskMarker {
  apiKeyId: string;
  taskId: string;
  taskStartedAt: string;
}

/** Returns startedAt for each task that is still in the run a replaced key belongs to. */
export async function getLiveRunStartedAtByTaskId(
  taskIds: string[],
  savedObjectsClient: SavedObjectsClientContract
): Promise<Map<string, string>> {
  const startedAtByTaskId = new Map<string, string>();
  const uniqueTaskIds = [...new Set(taskIds)];
  if (uniqueTaskIds.length === 0) {
    return startedAtByTaskId;
  }

  const now = Date.now();
  for (let offset = 0; offset < uniqueTaskIds.length; offset += BULK_GET_SIZE) {
    const chunk = uniqueTaskIds.slice(offset, offset + BULK_GET_SIZE);
    const { saved_objects: tasks } = await savedObjectsClient.bulkGet<
      Pick<SerializedConcreteTaskInstance, 'status' | 'startedAt' | 'retryAt'>
    >(chunk.map((id) => ({ type: TASK_SO_NAME, id })));

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
      startedAtByTaskId.set(id, attributes.startedAt);
    }
  }

  return startedAtByTaskId;
}

const markersFromSavedObjects = (
  savedObjects: Array<{ attributes: ApiKeyToInvalidate }>
): RunningTaskMarker[] => {
  const markers: RunningTaskMarker[] = [];
  for (const savedObject of savedObjects) {
    const { apiKeyId, taskId, taskStartedAt } = savedObject.attributes;
    if (apiKeyId && taskId && taskStartedAt) {
      markers.push({ apiKeyId, taskId, taskStartedAt });
    }
  }
  return markers;
};

interface CollectProtectedApiKeyIdsOpts {
  firstPageSavedObjects: Array<{ attributes: ApiKeyToInvalidate }>;
  total: number;
  removalDelay: string;
  savedObjectsClient: SavedObjectsClientContract;
  savedObjectType: string;
}

/** Returns apiKeyIds referenced by a task run that is still in progress, across every pending page. */
export async function collectApiKeyIdsProtectedByRunningTasks({
  firstPageSavedObjects,
  total,
  removalDelay,
  savedObjectsClient,
  savedObjectType,
}: CollectProtectedApiKeyIdsOpts): Promise<Set<string>> {
  const markers = markersFromSavedObjects(firstPageSavedObjects);
  const filter = getFindFilter({ removalDelay, savedObjectType });

  for (let page = 2; (page - 1) * PAGE_SIZE < total; page++) {
    const pageResult = await savedObjectsClient.find<ApiKeyToInvalidate>({
      type: savedObjectType,
      page,
      sortField: 'createdAt',
      sortOrder: 'asc',
      perPage: PAGE_SIZE,
      ...(filter.length > 0 ? { filter } : {}),
    });
    markers.push(...markersFromSavedObjects(pageResult.saved_objects));
  }

  const startedAtByTaskId = await getLiveRunStartedAtByTaskId(
    markers.map((marker) => marker.taskId),
    savedObjectsClient
  );
  const protectedApiKeyIds = new Set<string>();
  for (const marker of markers) {
    const startedAt = startedAtByTaskId.get(marker.taskId);
    if (startedAt && Date.parse(startedAt) === Date.parse(marker.taskStartedAt)) {
      protectedApiKeyIds.add(marker.apiKeyId);
    }
  }
  return protectedApiKeyIds;
}
