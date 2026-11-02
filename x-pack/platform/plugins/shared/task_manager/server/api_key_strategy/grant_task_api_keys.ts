/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AuthenticatedUser,
  KibanaRequest,
  Logger,
  SecurityServiceStart,
} from '@kbn/core/server';
import {
  encodeApiKey,
  resolveScopedApiKeys,
  type ScopedApiKeyNames,
  type ScopedCredentials,
} from '@kbn/response-ops-scoped-api-keys';
import { truncate } from 'lodash';
import type { TaskInstance } from '../task';
import { UIAM_LOGS_CREDENTIALS_TAGS, UIAM_LOGS_GRANT_TAGS } from '../constants';
import type { ApiKeySOFields, GrantApiKeysOpts } from './api_key_strategy';

interface GrantTaskApiKeysParams {
  taskInstances: TaskInstance[];
  request: KibanaRequest;
  security: SecurityServiceStart;
  logger: Logger;
  uiamEnabled: boolean;
  uiamRequired: boolean;
  opts?: GrantApiKeysOpts;
}

const toApiKeySOFields = (
  { es, uiam, createdByUser, uiamExternal }: ScopedCredentials,
  request: KibanaRequest,
  user: AuthenticatedUser | null
): ApiKeySOFields => ({
  ...(es ? { apiKey: encodeApiKey(es.id, es.secret) } : {}),
  ...(uiam ? { uiamApiKey: uiam.secret } : {}),
  userScope: {
    // A UIAM-only task mirrors its UIAM key id here for the in-use guard; a user-created Cloud
    // key has no id, and the empty value satisfies the task SO schema.
    apiKeyId: es?.id ?? uiam?.id ?? '',
    ...(uiam?.id ? { uiamApiKeyId: uiam.id } : {}),
    spaceId: request.spaceId,
    apiKeyCreatedByUser: createdByUser,
    ...(uiamExternal ? { uiamApiKeyExternal: true } : {}),
    userProfileId: user?.profile_uid,
    userName: user?.username,
  },
});

/** Resolves the API keys for a batch of tasks, one key set per task type. */
export const grantTaskApiKeys = async ({
  taskInstances,
  request,
  security,
  logger,
  uiamEnabled,
  uiamRequired,
  opts,
}: GrantTaskApiKeysParams): Promise<Map<string, ApiKeySOFields>> => {
  if (!(await security.authc.apiKeys.areAPIKeysEnabled())) {
    throw Error('API keys are not enabled, cannot create API key.');
  }

  const user = security.authc.getCurrentUser(request);
  const userSuffix = user ? ` - ${user.username}` : '';
  const names = new Map<string, ScopedApiKeyNames>();
  for (const { taskType } of taskInstances) {
    names.set(taskType, {
      es: truncate(`TaskManager: ${taskType}${userSuffix}`, { length: 256 }),
      uiam: truncate(`TaskManager-UIAM: ${taskType}${userSuffix}`, { length: 256 }),
    });
  }

  const resolved = await resolveScopedApiKeys(
    request,
    { security, logger },
    {
      names,
      clone: opts?.cloneApiKey === true,
      uiamEnabled: uiamEnabled && opts?.onEsKey !== true,
      uiamRequired,
      refresh: opts?.refreshApiKey === false ? false : undefined,
      metadata: { managed: true },
      onKeyCreated: opts?.onApiKeyCreated,
      logTags: { credentials: UIAM_LOGS_CREDENTIALS_TAGS, grant: UIAM_LOGS_GRANT_TAGS },
    }
  );
  if (!resolved.enabled) {
    throw Error('Could not create API key.');
  }

  const fieldsByTaskId = new Map<string, ApiKeySOFields>();
  for (const task of taskInstances) {
    const credentials = resolved.credentials.get(task.taskType);
    if (task.id && credentials) {
      fieldsByTaskId.set(task.id, toApiKeySOFields(credentials, request, user));
    }
  }
  return fieldsByTaskId;
};
