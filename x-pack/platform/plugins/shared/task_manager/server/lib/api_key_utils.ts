/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityServiceStart } from '@kbn/core/server';
import { KibanaRequest } from '@kbn/core/server';
import { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { truncate } from 'lodash';
import { TaskUserScope } from '../task';

export interface GrantAPIKeyResult {
  id: string;
  name: string;
  api_key: string;
}

const getCredentialsFromRequest = (request: KibanaRequest) => {
  const authorizationHeaderValue = request.headers.authorization;
  if (!authorizationHeaderValue || typeof authorizationHeaderValue !== 'string') {
    return null;
  }
  const [scheme] = authorizationHeaderValue.split(/\s+/);
  return authorizationHeaderValue.substring(scheme.length + 1);
};

export const isRequestApiKeyType = (request: KibanaRequest, security: SecurityServiceStart) => {
  const user = security.authc.getCurrentUser(request);
  return user?.authentication_type === 'api_key';
};

export const getApiKeyFromRequest = (request: KibanaRequest, name: string) => {
  const credentials = getCredentialsFromRequest(request);
  if (credentials) {
    const apiKey = Buffer.from(credentials, 'base64').toString().split(':');

    return {
      name,
      id: apiKey[0],
      api_key: apiKey[1],
    };
  }
  return null;
};

export const createApiKey = async (
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

  let apiKeyCreateResult: GrantAPIKeyResult | null;
  const name = truncate(`TaskManager: ${user.username}`, { length: 256 });

  if (isRequestApiKeyType(request, security)) {
    apiKeyCreateResult = getApiKeyFromRequest(request, name);
  } else {
    apiKeyCreateResult = await security.authc.apiKeys.grantAsInternalUser(request, {
      name,
      role_descriptors: {},
      metadata: { managed: true },
    });
  }

  if (!apiKeyCreateResult) {
    throw Error('Could not create API key.');
  }

  const encodedApiKey = Buffer.from(
    `${apiKeyCreateResult.id}:${apiKeyCreateResult.api_key}`
  ).toString('base64');

  return {
    apiKey: encodedApiKey,
    apiKeyId: apiKeyCreateResult.id,
  };
};

export const getApiKeyAndUserScope = async (
  request: KibanaRequest,
  canEncryptSo: boolean,
  security: SecurityServiceStart,
  spaces?: SpacesPluginStart
): Promise<{
  apiKey: string;
  userScope: TaskUserScope;
}> => {
  const { apiKey, apiKeyId } = await createApiKey(request, canEncryptSo, security);
  const space = await spaces?.spacesService.getActiveSpace(request);

  return {
    apiKey,
    userScope: {
      apiKeyId,
      spaceId: space?.id || 'default',
      // Set apiKeyCreatedByUser to true if the user passed in their own API key, since we do
      // not want to invalidate a specific API key that was not created by the task manager
      apiKeyCreatedByUser: isRequestApiKeyType(request, security),
    },
  };
};
