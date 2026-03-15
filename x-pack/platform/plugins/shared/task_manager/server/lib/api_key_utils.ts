/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, Logger, SecurityServiceStart, IBasePath } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core/server';
import { truncate } from 'lodash';
import { getSpaceIdFromPath } from '@kbn/spaces-utils';
import { isUiamCredential } from '@kbn/core-security-server';
import type { TaskInstance, TaskUserScope } from '../task';

export interface APIKeyResult {
  id: string;
  api_key: string;
}

/** ES API key only (header or system-created without UIAM) */
export interface EncodedApiKeyResultEsOnly {
  apiKey: string;
  apiKeyId: string;
}

/** UIAM API key only (header with UIAM credential) */
export interface EncodedApiKeyResultUiamOnly {
  uiamApiKey: string;
  uiamApiKeyId: string;
}

/** Both ES and UIAM API keys (system-created when shouldGrantUiam) */
export interface EncodedApiKeyResultBoth {
  apiKey: string;
  apiKeyId: string;
  uiamApiKey: string;
  uiamApiKeyId: string;
}

export type EncodedApiKeyResult =
  | EncodedApiKeyResultEsOnly
  | EncodedApiKeyResultUiamOnly
  | EncodedApiKeyResultBoth;

/** ES API key only */
export interface ApiKeyAndUserScopeEsOnly {
  apiKey: string;
  userScope: TaskUserScope;
}

/** UIAM API key only */
export interface ApiKeyAndUserScopeUiamOnly {
  uiamApiKey: string;
  userScope: TaskUserScope;
}

/** Both ES and UIAM API keys */
export interface ApiKeyAndUserScopeBoth {
  apiKey: string;
  uiamApiKey: string;
  userScope: TaskUserScope;
}

/** At least one of apiKey or uiamApiKey is always present */
export type ApiKeyAndUserScope =
  | ApiKeyAndUserScopeEsOnly
  | ApiKeyAndUserScopeUiamOnly
  | ApiKeyAndUserScopeBoth;

export interface CreateApiKeyOptions {
  shouldGrantUiam: boolean;
  logger?: Logger;
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

export const requestHasApiKey = (security: SecurityServiceStart, request: KibanaRequest) => {
  const user = security.authc.getCurrentUser(request);
  return (user && isRequestApiKeyType(user)) || request.isFakeRequest;
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

const invalidateUiamApiKey = async (
  security: SecurityServiceStart,
  request: KibanaRequest,
  uiamApiKeyId: string,
  logger?: Logger
) => {
  const result = await security.authc.apiKeys.uiam?.invalidate(request, { id: uiamApiKeyId });
  if (result && result.error_count > 0 && logger) {
    const details = result.error_details?.length ? `: ${JSON.stringify(result.error_details)}` : '';
    logger.error(
      `Failed to invalidate UIAM API key ${uiamApiKeyId} (error_count=${result.error_count})${details}`
    );
  }
};

export const createApiKey = async (
  taskInstances: TaskInstance[],
  request: KibanaRequest,
  security: SecurityServiceStart,
  options: CreateApiKeyOptions
): Promise<Map<string, EncodedApiKeyResult>> => {
  if (!(await security.authc.apiKeys.areAPIKeysEnabled())) {
    throw Error('API keys are not enabled, cannot create API key.');
  }

  const { shouldGrantUiam, logger } = options;
  const user = security.authc.getCurrentUser(request);

  const apiKeyByTaskIdMap = new Map<string, EncodedApiKeyResult>();

  // If the user passed in their own API key or the request is a fake request, use the API key from the request
  if (requestHasApiKey(security, request)) {
    const apiKeyCreateResult = getApiKeyFromRequest(request);

    if (!apiKeyCreateResult) {
      throw Error(
        `Could not extract API key from ${request.isFakeRequest ? 'fake' : 'user'} request header.`
      );
    }

    const { id, api_key: apiKey } = apiKeyCreateResult;
    const isUiam = shouldGrantUiam && isUiamCredential(apiKey);

    taskInstances.forEach((task) => {
      if (isUiam) {
        apiKeyByTaskIdMap.set(task.id!, {
          uiamApiKey: Buffer.from(`${id}:${apiKey}`).toString('base64'),
          uiamApiKeyId: id,
        });
      } else {
        apiKeyByTaskIdMap.set(task.id!, {
          apiKey: Buffer.from(`${id}:${apiKey}`).toString('base64'),
          apiKeyId: id,
        });
      }
    });

    return apiKeyByTaskIdMap;
  }

  // System-created keys: when shouldGrantUiam we grant both ES and UIAM per task type
  const taskTypes = [...new Set(taskInstances.map((task) => task.taskType))];
  const apiKeyByTaskTypeMap = new Map<string, EncodedApiKeyResult>();

  for (const taskType of taskTypes) {
    const apiKeyNamePrefix = `TaskManager: ${taskType}`;
    const apiKeyName = user ? `${apiKeyNamePrefix} - ${user.username}` : apiKeyNamePrefix;

    let uiamResult: APIKeyResult | null = null;
    if (shouldGrantUiam && security.authc.apiKeys.uiam) {
      uiamResult = await security.authc.apiKeys.uiam.grant(request, {
        name: truncate(`uiam - ${apiKeyName}`, { length: 256 }),
      });
      if (!uiamResult) {
        logger?.error(`Failed to create UIAM API key for task type ${taskType}`);
      }
    }

    const apiKeyCreateResult = await security.authc.apiKeys.grantAsInternalUser(request, {
      name: truncate(apiKeyName, { length: 256 }),
      role_descriptors: {},
      metadata: { managed: true },
    });

    if (!apiKeyCreateResult) {
      if (uiamResult) {
        await invalidateUiamApiKey(security, request, uiamResult.id, logger);
      }
      throw Error('Could not create API key.');
    }

    try {
      const { id, api_key: apiKey } = apiKeyCreateResult;
      const encoded: EncodedApiKeyResult = uiamResult
        ? {
            apiKey: Buffer.from(`${id}:${apiKey}`).toString('base64'),
            apiKeyId: id,
            uiamApiKey: Buffer.from(`${uiamResult.id}:${uiamResult.api_key}`).toString('base64'),
            uiamApiKeyId: uiamResult.id,
          }
        : {
            apiKey: Buffer.from(`${id}:${apiKey}`).toString('base64'),
            apiKeyId: id,
          };
      apiKeyByTaskTypeMap.set(taskType, encoded);
    } catch (err) {
      if (uiamResult) {
        await invalidateUiamApiKey(security, request, uiamResult.id, logger);
      }
      throw err;
    }
  }

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
  security: SecurityServiceStart,
  basePath: IBasePath,
  options: CreateApiKeyOptions
): Promise<Map<string, ApiKeyAndUserScope>> => {
  const apiKeyByTaskIdMap = await createApiKey(taskInstances, request, security, options);

  const requestBasePath = basePath.get(request);
  const space = getSpaceIdFromPath(requestBasePath, basePath.serverBasePath);

  const apiKeyAndUserScopeByTaskId = new Map<string, ApiKeyAndUserScope>();

  taskInstances.forEach((task) => {
    const encoded = apiKeyByTaskIdMap.get(task.id!);
    if (!encoded) return;

    const hasEs = 'apiKey' in encoded && encoded.apiKey;
    const hasUiam = 'uiamApiKey' in encoded && encoded.uiamApiKey;
    if (!hasEs && !hasUiam) {
      throw new Error(`Invalid encoded API key result: ${JSON.stringify(encoded)}`);
    }

    const spaceId = space?.spaceId || 'default';
    let entry: ApiKeyAndUserScope;
    if (hasEs && hasUiam) {
      const userScope: TaskUserScope = {
        apiKeyId: encoded.apiKeyId,
        uiamApiKeyId: encoded.uiamApiKeyId,
        spaceId,
        apiKeyCreatedByUser: false,
      };
      entry = { apiKey: encoded.apiKey, uiamApiKey: encoded.uiamApiKey, userScope };
    } else if (hasUiam) {
      const userScope: TaskUserScope = {
        uiamApiKeyId: encoded.uiamApiKeyId,
        spaceId,
        apiKeyCreatedByUser: requestHasApiKey(security, request),
      };
      entry = { uiamApiKey: encoded.uiamApiKey, userScope };
    } else {
      const esOnly = encoded as EncodedApiKeyResultEsOnly;
      const userScope: TaskUserScope = {
        apiKeyId: esOnly.apiKeyId,
        spaceId,
        apiKeyCreatedByUser: requestHasApiKey(security, request),
      };
      entry = { apiKey: esOnly.apiKey, userScope };
    }
    apiKeyAndUserScopeByTaskId.set(task.id!, entry);
  });

  return apiKeyAndUserScopeByTaskId;
};
