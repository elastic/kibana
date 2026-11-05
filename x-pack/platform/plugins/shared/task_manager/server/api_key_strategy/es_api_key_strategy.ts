/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Logger,
  SecurityServiceStart,
  KibanaRequest,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { ApiKeyType } from '../config';
import type { ConcreteTaskInstance, TaskInstance } from '../task';
import { getApiKeyAndUserScope } from '../api_keys/api_key_utils';
import type {
  ApiKeyInvalidationSource,
  ApiKeySOFields,
  ApiKeyStrategy,
  GrantApiKeysOpts,
  InvalidationTarget,
} from './api_key_strategy';
import {
  getTaskInvalidationTargets,
  markApiKeysForInvalidation,
  recordTaskRunCredentialUsage,
} from './api_key_strategy';

export class EsApiKeyStrategy implements ApiKeyStrategy {
  public readonly typeToUse = ApiKeyType.ES;

  constructor(private readonly logger: Logger) {}

  async grantApiKeys(
    taskInstances: TaskInstance[],
    request: KibanaRequest,
    security: SecurityServiceStart,
    opts?: GrantApiKeysOpts
  ): Promise<Map<string, ApiKeySOFields>> {
    return getApiKeyAndUserScope(
      taskInstances,
      request,
      security,
      { logger: this.logger, uiamEnabled: false, uiamRequired: false },
      opts
    );
  }

  getApiKeyForFakeRequest(taskInstance: ConcreteTaskInstance): string | undefined {
    const record = recordTaskRunCredentialUsage(taskInstance);
    if (taskInstance.apiKey) {
      record('es_api_key', 'config');
    } else {
      record('none', 'not_set');
    }
    return taskInstance.apiKey;
  }

  // UIAM keys left on tasks by an earlier ES and UIAM configuration are still invalidated, so a
  // rollback doesn't orphan them.
  getApiKeyIdsForInvalidation(source: ApiKeyInvalidationSource): InvalidationTarget[] {
    return getTaskInvalidationTargets(source);
  }

  async markForInvalidation(
    targets: InvalidationTarget[],
    logger: Logger,
    savedObjectsClient: SavedObjectsClientContract
  ): Promise<void> {
    return markApiKeysForInvalidation(targets, logger, savedObjectsClient);
  }
}
