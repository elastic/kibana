/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, KibanaRequest, SecurityServiceStart } from '@kbn/core/server';
import type { ApiKeys } from '@kbn/response-ops-api-keys';
import { truncate } from 'lodash';
import type { TaskInstance } from '../task';
import type { ApiKeySOFields, GrantApiKeysOpts } from '../api_key_strategy/api_key_strategy';
import type { TaskManagerApiKeysOptions } from './client';
import { createTaskManagerApiKeysClient } from './client';
import { taskApiKeyStorage } from './storage';

const keyName = (prefix: string, user: AuthenticatedUser | null) =>
  truncate(user ? `${prefix} - ${user.username}` : prefix, { length: 256 });

/**
 * Reuses, clones or grants the API keys each task runs with, and builds the task's `userScope`.
 * Keys are created once per task type, since key names include the type. A fake request is
 * always cloned, since its key belongs to whatever scheduled the task.
 */
export const getApiKeyAndUserScope = async (
  taskInstances: TaskInstance[],
  request: KibanaRequest,
  security: SecurityServiceStart,
  apiKeysOptions: TaskManagerApiKeysOptions,
  options?: GrantApiKeysOpts
): Promise<Map<string, ApiKeySOFields>> => {
  if (!(await security.authc.apiKeys.areAPIKeysEnabled())) {
    throw Error('API keys are not enabled, cannot create API key.');
  }

  const user = security.authc.getCurrentUser(request);
  const client = createTaskManagerApiKeysClient(security, apiKeysOptions);

  const keysByTaskType = new Map<string, ApiKeys>();
  for (const taskType of new Set(taskInstances.map((task) => task.taskType))) {
    const keys = await client.resolve(request, {
      name: keyName(`TaskManager: ${taskType}`, user),
      uiamName: keyName(`TaskManager-UIAM: ${taskType}`, user),
      subject: `task type: ${taskType}`,
      clone: options?.cloneApiKey === true || request.isFakeRequest,
      esOnly: options?.onEsKey === true,
      ...(options?.refreshApiKey === false ? { refresh: false } : {}),
      onKeyCreated: (type, { id, api_key: secret }) =>
        options?.onApiKeyCreated?.(
          type === 'uiam' ? { apiKeyId: id, uiamApiKey: secret } : { apiKeyId: id }
        ),
    });
    if (!keys) {
      throw Error('Could not create API key.');
    }
    keysByTaskType.set(taskType, keys);
  }

  const result = new Map<string, ApiKeySOFields>();
  taskInstances.forEach((task) => {
    const keys = keysByTaskType.get(task.taskType);
    if (!keys) {
      return;
    }
    const {
      apiKey,
      uiamApiKey,
      userScope = { apiKeyId: '', apiKeyCreatedByUser: keys.createdByUser },
    } = taskApiKeyStorage.write(keys);
    result.set(task.id!, {
      ...(apiKey ? { apiKey } : {}),
      ...(uiamApiKey ? { uiamApiKey } : {}),
      userScope: {
        ...userScope,
        spaceId: request.spaceId,
        userProfileId: user?.profile_uid,
        userName: user?.username,
      },
    });
  });

  return result;
};
