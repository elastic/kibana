/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, SecurityServiceStart } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core/server';
import { isUiamCredential } from '@kbn/core-security-server';
import { truncate } from 'lodash';
import type { TaskInstance, TaskUserScope } from '../task';
import type { GrantApiKeysOpts } from '../api_key_strategy/api_key_strategy';

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

export interface RequestApiKeyCredentials {
  /** Key id; absent for user-created Cloud (UIAM) API keys, which are raw `essu_` secrets. */
  id?: string;
  api_key?: string;
}

const getCredentialsFromRequest = (request: KibanaRequest) => {
  const authorizationHeaderValue = request.headers.authorization;
  if (!authorizationHeaderValue || typeof authorizationHeaderValue !== 'string') {
    return null;
  }
  const [scheme] = authorizationHeaderValue.split(/\s+/);
  return authorizationHeaderValue.substring(scheme.length + 1);
};

/**
 * Normalizes a stored task `uiamApiKey` into the credential UIAM expects on the wire.
 *
 * Two writers persist this attribute in different shapes:
 * - the grant path (`EsAndUiamApiKeyStrategy.grantApiKeys`) stores the raw `essu_…` secret;
 * - the UIAM provisioning (convert) path stores `base64(<id>:<secret>)`, mirroring how ES API
 *   keys are encoded.
 *
 * Only the raw secret authenticates. Presenting the base64 envelope makes Elasticsearch parse it
 * as a native `id:api_key` pair and look the id up in its own key store, which fails with a
 * generic authentication error without the cloud realm — and therefore UIAM — ever being reached.
 * A value in neither shape is returned untouched, so behavior for it is unchanged.
 */
export const getUiamApiKeySecret = (storedUiamApiKey: string): string => {
  if (isUiamCredential(storedUiamApiKey)) {
    return storedUiamApiKey;
  }

  const [, secret] = Buffer.from(storedUiamApiKey, 'base64').toString().split(':');

  return secret && isUiamCredential(secret) ? secret : storedUiamApiKey;
};

export const isRequestApiKeyType = (user: AuthenticatedUser | null) => {
  return user?.authentication_type === 'api_key';
};

export const hasApiKey = (user: AuthenticatedUser | null, request: KibanaRequest) => {
  return request.isFakeRequest || (user != null && isRequestApiKeyType(user));
};

export const requestHasApiKey = (security: SecurityServiceStart, request: KibanaRequest) => {
  const user = security.authc.getCurrentUser(request);
  return hasApiKey(user, request);
};

export const getApiKeyFromRequest = (request: KibanaRequest): RequestApiKeyCredentials | null => {
  const credentials = getCredentialsFromRequest(request);
  if (credentials) {
    // A user-created Cloud API key (obtained from the Elastic Cloud UI) is a raw `essu_`
    // secret with no key id and no base64 encoding, unlike framework-granted UIAM keys
    // and Elasticsearch API keys, which are encoded as `base64(id:key)`.
    if (isUiamCredential(credentials)) {
      return { api_key: credentials };
    }

    const apiKey = Buffer.from(credentials, 'base64').toString().split(':');

    return {
      id: apiKey[0],
      api_key: apiKey[1],
    };
  }
  return null;
};

export const shouldCloneApiKeyFromRequest = (
  security: SecurityServiceStart,
  request: KibanaRequest,
  options?: GrantApiKeysOpts,
  user: AuthenticatedUser | null = security.authc.getCurrentUser(request)
) => {
  const requestCarriesApiKey = (user && isRequestApiKeyType(user)) || request.isFakeRequest;

  return requestCarriesApiKey && (options?.cloneApiKey === true || request.isFakeRequest);
};

const grantApiKeysForTaskTypes = async ({
  taskInstances,
  user,
  createKey,
  onApiKeyCreated,
}: {
  taskInstances: TaskInstance[];
  user: AuthenticatedUser | null;
  createKey: (params: { name: string }) => Promise<{ id: string; api_key: string } | null>;
  onApiKeyCreated?: GrantApiKeysOpts['onApiKeyCreated'];
}) => {
  const taskTypes = [...new Set(taskInstances.map((task) => task.taskType))];
  const apiKeyByTaskTypeMap = new Map<string, EncodedApiKeyResult>();

  for (const taskType of taskTypes) {
    const apiKeyNamePrefix = `TaskManager: ${taskType}`;
    const apiKeyName = user ? `${apiKeyNamePrefix} - ${user.username}` : apiKeyNamePrefix;
    const apiKeyCreateResult = await createKey({
      name: truncate(apiKeyName, { length: 256 }),
    });

    if (!apiKeyCreateResult) {
      throw Error('Could not create API key.');
    }

    const { id, api_key: apiKey } = apiKeyCreateResult;
    onApiKeyCreated?.({ apiKeyId: id });

    apiKeyByTaskTypeMap.set(taskType, {
      apiKey: Buffer.from(`${id}:${apiKey}`).toString('base64'),
      apiKeyId: apiKeyCreateResult.id,
    });
  }

  const apiKeyByTaskIdMap = new Map<string, EncodedApiKeyResult>();

  taskInstances.forEach((task) => {
    const encodedApiKeyResult = apiKeyByTaskTypeMap.get(task.taskType);
    if (encodedApiKeyResult) {
      apiKeyByTaskIdMap.set(task.id!, encodedApiKeyResult);
    }
  });

  return apiKeyByTaskIdMap;
};

export const createApiKey = async (
  taskInstances: TaskInstance[],
  request: KibanaRequest,
  security: SecurityServiceStart,
  options?: GrantApiKeysOpts,
  preResolved?: {
    user: AuthenticatedUser | null;
    apiKeyCreatedByUser: boolean;
  }
) => {
  if (!(await security.authc.apiKeys.areAPIKeysEnabled())) {
    throw Error('API keys are not enabled, cannot create API key.');
  }

  const user = preResolved?.user ?? security.authc.getCurrentUser(request);
  const apiKeyCreatedByUser = preResolved?.apiKeyCreatedByUser ?? hasApiKey(user, request);

  const apiKeyByTaskIdMap = new Map<string, EncodedApiKeyResult>();
  const cloneApiKey = shouldCloneApiKeyFromRequest(security, request, options, user);

  if (cloneApiKey) {
    return grantApiKeysForTaskTypes({
      taskInstances,
      user,
      onApiKeyCreated: options?.onApiKeyCreated,
      createKey: ({ name }) =>
        security.authc.apiKeys.cloneAsInternalUser(request, {
          name,
          metadata: { managed: true },
        }),
    });
  }

  // The user passed in their own API key, so reuse it directly (fake requests always clone above).
  if (apiKeyCreatedByUser) {
    const apiKeyCreateResult = getApiKeyFromRequest(request);

    if (!apiKeyCreateResult) {
      throw Error('Could not extract API key from user request header.');
    }

    const { id, api_key: apiKey } = apiKeyCreateResult;

    // A raw user-created Cloud (UIAM) API key has no key id and no Elasticsearch counterpart,
    // so it cannot be persisted as an ES API key. In serverless deployments
    // `EsAndUiamApiKeyStrategy` persists it UIAM-only before reaching this path.
    if (!id) {
      throw Error(
        'Cannot use a user-provided Cloud (UIAM) API key to schedule tasks in this environment; an Elasticsearch API key is required.'
      );
    }

    taskInstances.forEach((task) => {
      apiKeyByTaskIdMap.set(task.id!, {
        apiKey: Buffer.from(`${id}:${apiKey}`).toString('base64'),
        apiKeyId: id,
      });
    });

    return apiKeyByTaskIdMap;
  }
  // If the user did not pass in their own API key, we need to create 1 key per task
  // type (due to naming requirements).
  return grantApiKeysForTaskTypes({
    taskInstances,
    user,
    onApiKeyCreated: options?.onApiKeyCreated,
    createKey: async ({ name }) =>
      security.authc.apiKeys.grantAsInternalUser(request, {
        name,
        role_descriptors: {},
        metadata: { managed: true },
      }),
  });
};

export const getApiKeyAndUserScope = async (
  taskInstances: TaskInstance[],
  request: KibanaRequest,
  security: SecurityServiceStart,
  options?: GrantApiKeysOpts
): Promise<Map<string, ApiKeyAndUserScope>> => {
  const user = security.authc.getCurrentUser(request);
  const cloneApiKey = shouldCloneApiKeyFromRequest(security, request, options, user);
  // When cloning, the resulting key is owned by Task Manager (not the caller), so it must not be
  // treated as user-created and must be invalidated on task removal.
  const apiKeyCreatedByUser = hasApiKey(user, request) && !cloneApiKey;

  const apiKeyByTaskIdMap = await createApiKey(taskInstances, request, security, options, {
    user,
    apiKeyCreatedByUser,
  });

  const apiKeyAndUserScopeByTaskId = new Map<string, ApiKeyAndUserScope>();

  taskInstances.forEach((task) => {
    const encodedApiKeyResult = apiKeyByTaskIdMap.get(task.id!);
    if (encodedApiKeyResult) {
      apiKeyAndUserScopeByTaskId.set(task.id!, {
        apiKey: encodedApiKeyResult.apiKey,
        userScope: {
          apiKeyId: encodedApiKeyResult.apiKeyId,
          spaceId: request.spaceId,
          // Set apiKeyCreatedByUser to true if the request includes its own API key, since we do
          // not want to invalidate a specific API key that was not created by the task manager.
          // Cloned and granted keys are owned by Task Manager and invalidated on task removal.
          apiKeyCreatedByUser,
          userProfileId: user?.profile_uid,
          userName: user?.username,
        },
      });
    }
  });

  return apiKeyAndUserScopeByTaskId;
};
