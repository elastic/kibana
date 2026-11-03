/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, Logger, SecurityServiceStart } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core/server';
import type { ApiKeys, CreateOptions, RequestApiKey } from '@kbn/response-ops-api-keys';
import { ApiKeysClient, encodeApiKey } from '@kbn/response-ops-api-keys';
import { truncate } from 'lodash';
import type { TaskInstance } from '../task';
import type { ApiKeySOFields, GrantApiKeysOpts } from './strategy/api_key_strategy';

interface TaskApiKeys {
  /** `base64(id:secret)` Elasticsearch API key. */
  apiKey?: string;
  apiKeyId: string;
  /** Raw `essu_` UIAM API key. */
  uiamApiKey?: string;
  uiamApiKeyId?: string;
}

export interface GrantTaskApiKeysOptions {
  logger: Logger;
  /** Also grant (or reuse) a UIAM key. */
  uiamEnabled: boolean;
  /** Fail instead of logging when a UIAM key can't be granted. */
  uiamRequired: boolean;
}

export const isRequestApiKeyType = (user: AuthenticatedUser | null) => {
  return user?.authentication_type === 'api_key';
};

export const hasApiKey = (user: AuthenticatedUser | null, request: KibanaRequest) => {
  return request.isFakeRequest || (user != null && isRequestApiKeyType(user));
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

const keyName = (prefix: string, user: AuthenticatedUser | null) =>
  truncate(user ? `${prefix} - ${user.username}` : prefix, { length: 256 });

/** The caller passed in their own API key, so the task reuses it as-is. */
const reuseRequestApiKey = (
  requestKey: RequestApiKey | null,
  uiamEnabled: boolean
): TaskApiKeys => {
  if (!requestKey || requestKey.type === 'invalid') {
    throw Error('Could not extract API key from user request header.');
  }

  const { id, secret } = requestKey;
  // A user-created Cloud API key is a raw `essu_` secret with no key id and no Elasticsearch
  // counterpart. Invalidation is skipped for user-created keys, so the empty id is never used.
  if (!id) {
    if (!uiamEnabled) {
      throw Error(
        'Cannot use a user-provided Cloud (UIAM) API key to schedule tasks in this environment; an Elasticsearch API key is required.'
      );
    }
    return { apiKeyId: '', uiamApiKey: secret };
  }

  const apiKey = encodeApiKey(id, secret);
  return requestKey.type === 'uiam' && uiamEnabled
    ? { apiKey, apiKeyId: id, uiamApiKey: secret, uiamApiKeyId: id }
    : { apiKey, apiKeyId: id };
};

const grantForTaskType = async (
  client: ApiKeysClient,
  request: KibanaRequest,
  createOptions: CreateOptions,
  clone: boolean
): Promise<ApiKeys> => {
  const keys = clone
    ? await client.clone(request, createOptions)
    : await client.grant(request, createOptions);
  if (!keys) {
    throw Error('Could not create API key.');
  }
  return keys;
};

/**
 * Grants, clones, or reuses the API keys each task runs with, and builds the task's `userScope`.
 * Granted and cloned keys are created once per task type, since key names include the type.
 */
export const getApiKeyAndUserScope = async (
  taskInstances: TaskInstance[],
  request: KibanaRequest,
  security: SecurityServiceStart,
  { logger, uiamEnabled, uiamRequired }: GrantTaskApiKeysOptions,
  options?: GrantApiKeysOpts
): Promise<Map<string, ApiKeySOFields>> => {
  if (!(await security.authc.apiKeys.areAPIKeysEnabled())) {
    throw Error('API keys are not enabled, cannot create API key.');
  }

  const user = security.authc.getCurrentUser(request);
  const cloneApiKey = shouldCloneApiKeyFromRequest(security, request, options, user);
  // `apiKeyCreatedByUser` gates invalidation of both the ES and UIAM keys, so both must share
  // ownership: reused together from the request, or freshly created together by Task Manager.
  const apiKeyCreatedByUser = hasApiKey(user, request) && !cloneApiKey;
  // `internal === false` is UIAM's verdict that the request's key is a user-created Cloud key.
  // Task runs withhold the UIAM shared secret for these keys, which UIAM rejects otherwise.
  const uiamApiKeyExternal =
    apiKeyCreatedByUser && user?.api_key?.internal === false ? true : undefined;
  const client = new ApiKeysClient({ security, logger, pluginTag: 'task-manager', uiamEnabled });

  const keysByTaskType = new Map<string, TaskApiKeys>();
  if (apiKeyCreatedByUser) {
    const keys = reuseRequestApiKey(client.fromRequest(request), uiamEnabled);
    taskInstances.forEach((task) => keysByTaskType.set(task.taskType, keys));
  } else {
    // A UIAM service account can't be cloned by Elasticsearch; `grant` gives it a UIAM key only.
    const principal = security.authc.getPrincipal(request);
    const clone =
      cloneApiKey && !(principal?.type === 'service_account' && principal.variant === 'uiam');

    for (const taskType of new Set(taskInstances.map((task) => task.taskType))) {
      const { es, uiam } = await grantForTaskType(
        client,
        request,
        {
          name: keyName(`TaskManager: ${taskType}`, user),
          uiamName: keyName(`TaskManager-UIAM: ${taskType}`, user),
          metadata: { managed: true },
          subject: `task type: ${taskType}`,
          uiam: uiamRequired ? 'required' : 'optional',
          missingUiamCredentialsLogLevel: 'debug',
          ...(options?.refreshApiKey === false ? { refresh: false } : {}),
        },
        clone
      );
      if (uiam) {
        options?.onApiKeyCreated?.({ apiKeyId: uiam.id, uiamApiKey: uiam.api_key });
      }
      if (es) {
        options?.onApiKeyCreated?.({ apiKeyId: es.id });
      }

      const apiKeyId = es?.id ?? uiam?.id;
      if (apiKeyId) {
        keysByTaskType.set(taskType, {
          apiKeyId,
          ...(es ? { apiKey: encodeApiKey(es.id, es.api_key) } : {}),
          ...(uiam ? { uiamApiKey: uiam.api_key, uiamApiKeyId: uiam.id } : {}),
        });
      }
    }
  }

  const result = new Map<string, ApiKeySOFields>();
  taskInstances.forEach((task) => {
    const keys = keysByTaskType.get(task.taskType);
    // Without any key the task could never authenticate at run time.
    if (!keys) {
      throw new Error(`Failed to grant UIAM API key for task "${task.id}"`);
    }
    const { apiKey, apiKeyId, uiamApiKey, uiamApiKeyId } = keys;
    result.set(task.id!, {
      ...(apiKey ? { apiKey } : {}),
      ...(uiamApiKey ? { uiamApiKey } : {}),
      userScope: {
        apiKeyId,
        ...(uiamApiKeyId ? { uiamApiKeyId } : {}),
        spaceId: request.spaceId,
        apiKeyCreatedByUser,
        ...(uiamApiKeyExternal ? { uiamApiKeyExternal } : {}),
        userProfileId: user?.profile_uid,
        userName: user?.username,
      },
    });
  });

  return result;
};
