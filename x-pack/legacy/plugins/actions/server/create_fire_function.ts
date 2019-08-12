/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import { TaskManager } from '../../task_manager';
import { SpacesPlugin } from '../../spaces';

interface CreateFireFunctionOptions {
  taskManager: TaskManager;
  spaceIdToNamespace: SpacesPlugin['spaceIdToNamespace'];
  getScopedSavedObjectsClient: (request: any) => SavedObjectsClientContract;
  getBasePath: SpacesPlugin['getBasePath'];
}

export interface FireOptions {
  id: string;
  params: Record<string, any>;
  spaceId: string;
  apiKeyId: string | null;
  generatedApiKey: string | null;
}

export function createFireFunction({
  getBasePath,
  getScopedSavedObjectsClient,
  taskManager,
  spaceIdToNamespace,
}: CreateFireFunctionOptions) {
  return async function fire({ id, params, spaceId, apiKeyId, generatedApiKey }: FireOptions) {
    const requestHeaders: Record<string, string> = {};
    if (apiKeyId && generatedApiKey) {
      const key = Buffer.from(`${apiKeyId}:${generatedApiKey}`).toString('base64');
      requestHeaders.authorization = `ApiKey ${key}`;
    }

    // Since we're using API keys and accessing elasticsearch can only be done
    // via a request, we're faking one with the proper authorization headers.
    const fakeRequest: any = {
      headers: requestHeaders,
      getBasePath: () => getBasePath(spaceId),
    };

    const namespace = spaceIdToNamespace(spaceId);
    const savedObjectsClient = getScopedSavedObjectsClient(fakeRequest);
    const actionSavedObject = await savedObjectsClient.get('action', id, { namespace });
    const firedActionRecord = await savedObjectsClient.create('fired_action', {
      actionId: id,
      params,
      apiKeyId,
      generatedApiKey,
    });
    await taskManager.schedule({
      taskType: `actions:${actionSavedObject.attributes.actionTypeId}`,
      params: {
        spaceId,
        firedActionId: firedActionRecord.id,
      },
      state: {},
      scope: ['actions'],
    });
  };
}
