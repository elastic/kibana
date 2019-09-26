/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import { TaskManager } from '../../task_manager';
import { GetBasePathFunction } from './types';

interface CreateExecuteFunctionOptions {
  isSecurityEnabled: boolean;
  taskManager: TaskManager;
  getScopedSavedObjectsClient: (request: any) => SavedObjectsClientContract;
  getBasePath: GetBasePathFunction;
}

export interface ExecuteOptions {
  id: string;
  params: Record<string, any>;
  spaceId: string;
  apiKey?: string;
}

export function createExecuteFunction({
  getBasePath,
  taskManager,
  isSecurityEnabled,
  getScopedSavedObjectsClient,
}: CreateExecuteFunctionOptions) {
  return async function execute({ id, params, spaceId, apiKey }: ExecuteOptions) {
    const requestHeaders: Record<string, string> = {};

    if (isSecurityEnabled && !apiKey) {
      throw new Error('API key is required. The attribute "apiKey" is missing.');
    } else if (isSecurityEnabled) {
      requestHeaders.authorization = `ApiKey ${apiKey}`;
    }

    // Since we're using API keys and accessing elasticsearch can only be done
    // via a request, we're faking one with the proper authorization headers.
    const fakeRequest: any = {
      headers: requestHeaders,
      getBasePath: () => getBasePath(spaceId),
    };

    const savedObjectsClient = getScopedSavedObjectsClient(fakeRequest);
    const actionSavedObject = await savedObjectsClient.get('action', id);
    const actionTaskParamsRecord = await savedObjectsClient.create('action_task_params', {
      actionId: id,
      params,
      apiKey,
    });

    await taskManager.schedule({
      taskType: `actions:${actionSavedObject.attributes.actionTypeId}`,
      params: {
        spaceId,
        actionTaskParamsId: actionTaskParamsRecord.id,
      },
      state: {},
      scope: ['actions'],
    });
  };
}
