/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Logger,
  SecurityServiceStart,
  IBasePath,
  KibanaRequest,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { HTTPAuthorizationHeader, isUiamCredential } from '@kbn/core-security-server';
import { truncate } from 'lodash';
import { getSpaceIdFromPath } from '@kbn/spaces-utils';
import { ApiKeyType } from '../config';
import type { ConcreteTaskInstance, TaskInstance } from '../task';
import { createApiKey, requestHasApiKey, getApiKeyFromRequest } from '../lib/api_key_utils';
import type { ApiKeySOFields, ApiKeyStrategy, InvalidationTarget } from './api_key_strategy';
import { markApiKeysForInvalidation } from './api_key_strategy';
import { UIAM_LOGS_CREDENTIALS_TAGS, UIAM_LOGS_GRANT_TAGS } from '../constants';

interface UiamApiKeyResult {
  apiKey: string;
  apiKeyId: string;
}

export class EsAndUiamApiKeyStrategy implements ApiKeyStrategy {
  public readonly shouldGrantUiam = true;
  public readonly typeToUse: ApiKeyType;
  private readonly security: SecurityServiceStart;
  private readonly logger: Logger;

  constructor(apiKeyType: ApiKeyType, security: SecurityServiceStart, logger: Logger) {
    this.typeToUse = apiKeyType;
    this.security = security;
    this.logger = logger;
  }

  async grantApiKeys(
    taskInstances: TaskInstance[],
    request: KibanaRequest,
    security: SecurityServiceStart,
    basePath: IBasePath
  ): Promise<Map<string, ApiKeySOFields>> {
    const esKeys = await createApiKey(taskInstances, request, security);
    const uiamKeys = await this.grantUiamApiKeys(taskInstances, request, security);

    const requestBasePath = basePath.get(request);
    const space = getSpaceIdFromPath(requestBasePath, basePath.serverBasePath);
    const apiKeyCreatedByUser = requestHasApiKey(security, request);

    const result = new Map<string, ApiKeySOFields>();
    taskInstances.forEach((task) => {
      const esKey = esKeys.get(task.id!);
      if (esKey) {
        const uiamKey = uiamKeys.get(task.id!);
        result.set(task.id!, {
          apiKey: esKey.apiKey,
          ...(uiamKey ? { uiamApiKey: uiamKey.apiKey } : {}),
          userScope: {
            apiKeyId: esKey.apiKeyId,
            ...(uiamKey ? { uiamApiKeyId: uiamKey.apiKeyId } : {}),
            spaceId: space?.spaceId || 'default',
            apiKeyCreatedByUser,
          },
        });
      }
    });

    return result;
  }

  private async grantUiamApiKeys(
    taskInstances: TaskInstance[],
    request: KibanaRequest,
    security: SecurityServiceStart
  ): Promise<Map<string, UiamApiKeyResult>> {
    const uiam = this.security.authc.apiKeys.uiam;
    const uiamKeyByTaskIdMap = new Map<string, UiamApiKeyResult>();

    if (!uiam) {
      return uiamKeyByTaskIdMap;
    }

    if (requestHasApiKey(security, request)) {
      const apiKeyResult = getApiKeyFromRequest(request);
      if (apiKeyResult && isUiamCredential(apiKeyResult.api_key)) {
        taskInstances.forEach((task) => {
          uiamKeyByTaskIdMap.set(task.id!, {
            apiKey: apiKeyResult.api_key,
            apiKeyId: apiKeyResult.id,
          });
        });
      }
      return uiamKeyByTaskIdMap;
    }

    const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request);
    if (!authorizationHeader || !isUiamCredential(authorizationHeader)) {
      this.logger.debug(
        'Request credential is not UIAM-compatible, skipping UIAM API key grant. Only ES API keys will be used.',
        { tags: UIAM_LOGS_CREDENTIALS_TAGS }
      );
      return uiamKeyByTaskIdMap;
    }

    const user = security.authc.getCurrentUser(request);
    const taskTypes = [...new Set(taskInstances.map((task) => task.taskType))];
    const uiamKeyByTaskTypeMap = new Map<string, UiamApiKeyResult>();

    for (const taskType of taskTypes) {
      const apiKeyNamePrefix = `TaskManager-UIAM: ${taskType}`;
      const apiKeyName = user ? `${apiKeyNamePrefix} - ${user.username}` : apiKeyNamePrefix;

      try {
        const uiamResult = await uiam.grant(request, {
          name: truncate(apiKeyName, { length: 256 }),
        });

        if (uiamResult) {
          uiamKeyByTaskTypeMap.set(taskType, {
            apiKey: uiamResult.api_key,
            apiKeyId: uiamResult.id,
          });
        } else {
          this.logger.error(`Failed to create UIAM API key for task type: ${taskType}`, {
            tags: UIAM_LOGS_GRANT_TAGS,
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Failed to create UIAM API key for task type: ${taskType}: ${errorMessage}`,
          { tags: UIAM_LOGS_GRANT_TAGS }
        );
      }
    }

    taskInstances.forEach((task) => {
      const uiamKeyResult = uiamKeyByTaskTypeMap.get(task.taskType);
      if (uiamKeyResult) {
        uiamKeyByTaskIdMap.set(task.id!, uiamKeyResult);
      }
    });

    return uiamKeyByTaskIdMap;
  }

  getApiKeyForFakeRequest(taskInstance: ConcreteTaskInstance): string | undefined {
    if (this.typeToUse === ApiKeyType.UIAM) {
      if (taskInstance.uiamApiKey) {
        return taskInstance.uiamApiKey;
      }
      return taskInstance.apiKey;
    }
    return taskInstance.apiKey;
  }

  getApiKeyIdsForInvalidation(taskInstance: ConcreteTaskInstance): InvalidationTarget[] {
    const { userScope, uiamApiKey } = taskInstance;
    if (!userScope || userScope.apiKeyCreatedByUser) {
      return [];
    }

    const targets: InvalidationTarget[] = [{ apiKeyId: userScope.apiKeyId }];

    if (userScope.uiamApiKeyId && uiamApiKey) {
      targets.push({ apiKeyId: userScope.uiamApiKeyId, uiamApiKey });
    }

    return targets;
  }

  async markForInvalidation(
    targets: InvalidationTarget[],
    logger: Logger,
    savedObjectsClient: SavedObjectsClientContract
  ): Promise<void> {
    return markApiKeysForInvalidation(targets, logger, savedObjectsClient);
  }
}
