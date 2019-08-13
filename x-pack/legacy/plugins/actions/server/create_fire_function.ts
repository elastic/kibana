/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import { TaskManager } from '../../task_manager';
import { GetBasePathFunction } from './types';

interface CreateFireFunctionOptions {
  taskManager: TaskManager;
  getScopedSavedObjectsClient: (request: any) => SavedObjectsClientContract;
  getBasePath: GetBasePathFunction;
}

export interface FireOptions {
  id: string;
  params: Record<string, any>;
  spaceId: string;
  apiKeyId: string | null;
  apiKeyValue: string | null;
}

export function createFireFunction({
  getBasePath,
  getScopedSavedObjectsClient,
  taskManager,
}: CreateFireFunctionOptions) {
  return async function fire({ id, params, spaceId, apiKeyId, apiKeyValue }: FireOptions) {
    const requestHeaders: Record<string, string> = {};
    if (apiKeyId && apiKeyValue) {
      const key = Buffer.from(`${apiKeyId}:${apiKeyValue}`).toString('base64');
      requestHeaders.authorization = `ApiKey ${key}`;
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
      apiKeyId,
      apiKeyValue,
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
