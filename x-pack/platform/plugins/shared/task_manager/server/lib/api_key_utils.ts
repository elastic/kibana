/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, SecurityServiceStart } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { truncate } from 'lodash';
import type { TaskInstance, TaskUserScope } from '../task';

export interface APIKeyResult {
  id: string;
  api_key: string;
}

export interface EncodedApiKeyResult {
  apiKey: string;
  apiKeyId: string;
}

export interface ApiKeyAndUserScope {
  apiKey: string;
  userScope: TaskUserScope;
}

const getCredentialsFromRequest = (request: KibanaRequest) => {
  const authorizationHeaderValue = request.headers.authorization;
  if (!authorizationHeaderValue || typeof authorizationHeaderValue !== 'string') {
    return null;
  }
  const [scheme] = authorizationHeaderValue.split(/\s+/);
  return authorizationHeaderValue.substring(scheme.length + 1);
};

export const isRequestApiKeyType = (user: AuthenticatedUser | null) => {
  return user?.authentication_type === 'api_key';
};

export const getApiKeyFromRequest = (request: KibanaRequest) => {
  const credentials = getCredentialsFromRequest(request);
  if (credentials) {
    const apiKey = Buffer.from(credentials, 'base64').toString().split(':');

    return {
      id: apiKey[0],
      api_key: apiKey[1],
    };
  }
  return null;
};

export const createApiKey = async (
  taskInstances: TaskInstance[],
  request: KibanaRequest,
  canEncryptSo: boolean,
  security: SecurityServiceStart
) => {
  if (!canEncryptSo) {
    throw Error(
      'Unable to create API keys because the Encrypted Saved Objects plugin has not been registered or is missing encryption key.'
    );
  }

  if (!(await security.authc.apiKeys.areAPIKeysEnabled())) {
    throw Error('API keys are not enabled, cannot create API key.');
  }

  const user = security.authc.getCurrentUser(request);
  if (!user) {
    throw Error('Cannot authenticate current user.');
  }

  const apiKeyByTaskIdMap = new Map<string, EncodedApiKeyResult>();

  // If the user passed in their own API key, simply return it
  if (isRequestApiKeyType(user)) {
    const apiKeyCreateResult = getApiKeyFromRequest(request);

    if (!apiKeyCreateResult) {
      throw Error('Could not create API key.');
    }

    const { id, api_key: apiKey } = apiKeyCreateResult;

    taskInstances.forEach((task) => {
      apiKeyByTaskIdMap.set(task.id!, {
        apiKey: Buffer.from(`${id}:${apiKey}`).toString('base64'),
        apiKeyId: apiKeyCreateResult.id,
      });
    });

    return apiKeyByTaskIdMap;
  }
  // If the user did not pass in their own API key, we need to create 1 key per task
  // type (due to naming requirements).
  const taskTypes = [...new Set(taskInstances.map((task) => task.taskType))];
  const apiKeyByTaskTypeMap = new Map<string, EncodedApiKeyResult>();

  for (const taskType of taskTypes) {
    const apiKeyCreateResult = await security.authc.apiKeys.grantAsInternalUser(request, {
      name: truncate(`TaskManager: ${taskType} - ${user.username}`, { length: 256 }),
      role_descriptors: {},
      metadata: { managed: true },
    });

    if (!apiKeyCreateResult) {
      throw Error('Could not create API key.');
    }

    const { id, api_key: apiKey } = apiKeyCreateResult;

    apiKeyByTaskTypeMap.set(taskType, {
      apiKey: Buffer.from(`${id}:${apiKey}`).toString('base64'),
      apiKeyId: apiKeyCreateResult.id,
    });
  }

  // Assign each of the created API keys to the task ID
  taskInstances.forEach((task) => {
    const encodedApiKeyResult = apiKeyByTaskTypeMap.get(task.taskType);
    if (encodedApiKeyResult) {
      apiKeyByTaskIdMap.set(task.id!, encodedApiKeyResult);
    }
  });

  return apiKeyByTaskIdMap;
};

export const getApiKeyAndUserScope = async (
  taskInstances: TaskInstance[],
  request: KibanaRequest,
  canEncryptSo: boolean,
  security: SecurityServiceStart,
  spaces?: SpacesPluginStart
): Promise<Map<string, ApiKeyAndUserScope>> => {
  const apiKeyByTaskIdMap = await createApiKey(taskInstances, request, canEncryptSo, security);
  const space = await spaces?.spacesService.getActiveSpace(request);
  const user = security.authc.getCurrentUser(request);

  const apiKeyAndUserScopeByTaskId = new Map<string, ApiKeyAndUserScope>();

  taskInstances.forEach((task) => {
    const encodedApiKeyResult = apiKeyByTaskIdMap.get(task.id!);
    if (encodedApiKeyResult) {
      apiKeyAndUserScopeByTaskId.set(task.id!, {
        apiKey: encodedApiKeyResult.apiKey,
        userScope: {
          apiKeyId: encodedApiKeyResult.apiKeyId,
          spaceId: space?.id || 'default',
          // Set apiKeyCreatedByUser to true if the user passed in their own API key, since we do
          // not want to invalidate a specific API key that was not created by the task manager
          apiKeyCreatedByUser: isRequestApiKeyType(user),
        },
      });
    }
  });

  return apiKeyAndUserScopeByTaskId;
};
