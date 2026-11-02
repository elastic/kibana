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
import {
  getApiKeyInvalidationTargets,
  getUiamApiKeySecret,
} from '@kbn/response-ops-scoped-api-keys';
import { ApiKeyType } from '../config';
import type { ConcreteTaskInstance, TaskInstance } from '../task';
import type {
  ApiKeyInvalidationSource,
  ApiKeySOFields,
  ApiKeyStrategy,
  GrantApiKeysOpts,
  InvalidationTarget,
} from './api_key_strategy';
import { markApiKeysForInvalidation, recordTaskRunCredentialUsage } from './api_key_strategy';
import { grantTaskApiKeys } from './grant_task_api_keys';

export class EsApiKeyStrategy implements ApiKeyStrategy {
  public readonly shouldGrantUiam = false;
  public readonly typeToUse = ApiKeyType.ES;
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async grantApiKeys(
    taskInstances: TaskInstance[],
    request: KibanaRequest,
    security: SecurityServiceStart,
    opts?: GrantApiKeysOpts
  ): Promise<Map<string, ApiKeySOFields>> {
    return grantTaskApiKeys({
      taskInstances,
      request,
      security,
      logger: this.logger,
      uiamEnabled: false,
      uiamRequired: false,
      opts,
    });
  }

  getApiKeyForFakeRequest(taskInstance: ConcreteTaskInstance): string | undefined {
    const { userScope, apiKey, uiamApiKey } = taskInstance;
    const record = recordTaskRunCredentialUsage(taskInstance);
    if (apiKey) {
      record('es_api_key', 'config');
      return apiKey;
    }
    // A task scheduled while UIAM was enabled may persist only a UIAM key.
    if (uiamApiKey) {
      record('uiam_api_key', userScope?.apiKeyCreatedByUser ? 'user_created_key' : 'provisioned');
      return getUiamApiKeySecret(uiamApiKey);
    }
    record('none', 'not_set');
    return apiKey;
  }

  getApiKeyIdsForInvalidation(source: ApiKeyInvalidationSource): InvalidationTarget[] {
    const { userScope, uiamApiKey, apiKey } = source;
    if (!userScope) {
      return [];
    }

    // A deployment may have previously run with `EsAndUiamApiKeyStrategy` and persisted a UIAM
    // key on existing tasks. Still emit it so falling back to this strategy does not orphan it.
    return getApiKeyInvalidationTargets({
      createdByUser: userScope.apiKeyCreatedByUser,
      esApiKeyId: apiKey ? userScope.apiKeyId : undefined,
      uiamApiKeyId: userScope.uiamApiKeyId,
      uiamApiKey,
    });
  }

  async markForInvalidation(
    targets: InvalidationTarget[],
    logger: Logger,
    savedObjectsClient: SavedObjectsClientContract
  ): Promise<void> {
    return markApiKeysForInvalidation(targets, logger, savedObjectsClient);
  }
}
