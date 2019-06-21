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
}

interface FireOptions {
  id: string;
  params: Record<string, any>;
  namespace?: string;
  basePath: string;
}

export function createFireFunction({
  taskManager,
  internalSavedObjectsRepository,
}: CreateFireFunctionOptions) {
  return async function fire({ id, params, namespace, basePath }: FireOptions) {
    const actionSavedObject = await internalSavedObjectsRepository.get('action', id, { namespace });
    await taskManager.schedule({
      taskType: `actions:${actionSavedObject.attributes.actionTypeId}`,
      params: {
        id,
        basePath,
        namespace,
        actionTypeParams: params,
      },
      state: {},
      scope: ['actions'],
    });
  };
}
