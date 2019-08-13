/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import { TaskManager } from '../../task_manager';
import { SpacesPlugin } from '../../spaces';

interface CreateExecuteFunctionOptions {
  taskManager: TaskManager;
  internalSavedObjectsRepository: SavedObjectsClientContract;
  spaceIdToNamespace: SpacesPlugin['spaceIdToNamespace'];
}

export interface ExecuteOptions {
  id: string;
  params: Record<string, any>;
  spaceId: string;
}

export function createExecuteFunction({
  taskManager,
  internalSavedObjectsRepository,
  spaceIdToNamespace,
}: CreateExecuteFunctionOptions) {
  return async function execute({ id, params, spaceId }: ExecuteOptions) {
    const namespace = spaceIdToNamespace(spaceId);
    const actionSavedObject = await internalSavedObjectsRepository.get('action', id, { namespace });
    await taskManager.schedule({
      taskType: `actions:${actionSavedObject.attributes.actionTypeId}`,
      params: {
        id,
        spaceId,
        params,
      },
      state: {},
      scope: ['actions'],
    });
  };
}
