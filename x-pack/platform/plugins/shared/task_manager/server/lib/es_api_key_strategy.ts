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
import { ApiKeyType } from '../config';
import type { ConcreteTaskInstance, TaskInstance } from '../task';
import { getApiKeyAndUserScope } from './api_key_utils';
import type { ApiKeySOFields, ApiKeyStrategy, InvalidationTarget } from './api_key_strategy';
import { markApiKeysForInvalidation } from './api_key_strategy';

export class EsApiKeyStrategy implements ApiKeyStrategy {
  public readonly shouldGrantUiam = false;
  public readonly typeToUse = ApiKeyType.ES;

  async grantApiKeys(
    taskInstances: TaskInstance[],
    request: KibanaRequest,
    security: SecurityServiceStart,
    basePath: IBasePath
  ): Promise<Map<string, ApiKeySOFields>> {
    return getApiKeyAndUserScope(taskInstances, request, security, basePath);
  }

  getApiKeyForFakeRequest(taskInstance: ConcreteTaskInstance): string | undefined {
    return taskInstance.apiKey;
  }

  getApiKeyIdsForInvalidation(taskInstance: ConcreteTaskInstance): InvalidationTarget[] {
    const { userScope } = taskInstance;
    if (!userScope || userScope.apiKeyCreatedByUser) {
      return [];
    }
    return [{ apiKeyId: userScope.apiKeyId }];
  }

  async markForInvalidation(
    targets: InvalidationTarget[],
    logger: Logger,
    savedObjectsClient: SavedObjectsClientContract
  ): Promise<void> {
    return markApiKeysForInvalidation(targets, logger, savedObjectsClient);
  }
}
