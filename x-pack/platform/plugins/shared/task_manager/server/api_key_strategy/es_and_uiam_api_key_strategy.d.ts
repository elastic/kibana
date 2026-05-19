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
import type { ApiKeyType } from '../config';
import type { ConcreteTaskInstance, TaskInstance } from '../task';
import type {
  ApiKeySOFields,
  ApiKeyStrategy,
  GrantApiKeysOpts,
  InvalidationTarget,
} from './api_key_strategy';
export declare class EsAndUiamApiKeyStrategy implements ApiKeyStrategy {
  readonly shouldGrantUiam = true;
  readonly typeToUse: ApiKeyType;
  private readonly security;
  private readonly logger;
  constructor(apiKeyType: ApiKeyType, security: SecurityServiceStart, logger: Logger);
  grantApiKeys(
    taskInstances: TaskInstance[],
    request: KibanaRequest,
    security: SecurityServiceStart,
    basePath: IBasePath,
    opts?: GrantApiKeysOpts
  ): Promise<Map<string, ApiKeySOFields>>;
  private grantUiamApiKeys;
  getApiKeyForFakeRequest(taskInstance: ConcreteTaskInstance): string | undefined;
  getApiKeyIdsForInvalidation(taskInstance: ConcreteTaskInstance): InvalidationTarget[];
  markForInvalidation(
    targets: InvalidationTarget[],
    logger: Logger,
    savedObjectsClient: SavedObjectsClientContract
  ): Promise<void>;
}
