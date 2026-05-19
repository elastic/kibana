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
import type { ApiKeySOFields, ApiKeyStrategy, InvalidationTarget } from './api_key_strategy';
export declare class EsApiKeyStrategy implements ApiKeyStrategy {
  readonly shouldGrantUiam = false;
  readonly typeToUse = ApiKeyType.ES;
  grantApiKeys(
    taskInstances: TaskInstance[],
    request: KibanaRequest,
    security: SecurityServiceStart,
    basePath: IBasePath
  ): Promise<Map<string, ApiKeySOFields>>;
  getApiKeyForFakeRequest(taskInstance: ConcreteTaskInstance): string | undefined;
  getApiKeyIdsForInvalidation(taskInstance: ConcreteTaskInstance): InvalidationTarget[];
  markForInvalidation(
    targets: InvalidationTarget[],
    logger: Logger,
    savedObjectsClient: SavedObjectsClientContract
  ): Promise<void>;
}
