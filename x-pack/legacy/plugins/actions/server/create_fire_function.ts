/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import { TaskManager } from '../../task_manager';

interface CreateFireFunctionOptions {
  taskManager: TaskManager;
  internalSavedObjectsRepository: SavedObjectsClientContract;
  spaceIdToNamespace: (spaceId: string) => string;
}

export interface FireOptions {
  id: string;
  params: Record<string, any>;
  spaceId: string;
}

export function createFireFunction({
  taskManager,
  internalSavedObjectsRepository,
  spaceIdToNamespace,
}: CreateFireFunctionOptions) {
  return async function fire({ id, params, spaceId }: FireOptions) {
    const namespace = spaceIdToNamespace(spaceId);
    const actionSavedObject = await internalSavedObjectsRepository.get('action', id, { namespace });
    await taskManager.schedule({
      taskType: `actions:${actionSavedObject.attributes.actionTypeId}`,
      params: {
        id,
        spaceId,
        actionTypeParams: params,
      },
      state: {},
      scope: ['actions'],
    });
  };
}
