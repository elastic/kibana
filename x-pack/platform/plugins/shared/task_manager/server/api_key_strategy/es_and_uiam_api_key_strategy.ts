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
import { getUiamLogTags, pickCredential } from '@kbn/response-ops-api-keys';
import { ApiKeyType } from '../config';
import type { ConcreteTaskInstance, TaskInstance } from '../task';
import { getApiKeyAndUserScope } from '../api_keys/api_key_utils';
import { TASK_MANAGER_PLUGIN_TAG } from '../api_keys/client';
import { taskApiKeyStorage } from '../api_keys/storage';
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
import { taskManagerUiamTelemetry } from '../otel/uiam_telemetry';

const UIAM_LOGS_USAGE_TAGS = getUiamLogTags(TASK_MANAGER_PLUGIN_TAG).usage;

export class EsAndUiamApiKeyStrategy implements ApiKeyStrategy {
  public readonly typeToUse: ApiKeyType;
  private readonly security: SecurityServiceStart;
  private readonly logger: Logger;

  constructor(apiKeyType: ApiKeyType, security: SecurityServiceStart, logger: Logger) {
    this.typeToUse = apiKeyType;
    this.security = security;
    this.logger = logger;
  }

  // While tasks run with ES keys, a failed UIAM grant is logged and the task is scheduled with
  // only an ES key. Once tasks run with UIAM keys, a task without one can't authenticate the way
  // its runs expect, so the failure surfaces to the caller.
  async grantApiKeys(
    taskInstances: TaskInstance[],
    request: KibanaRequest,
    security: SecurityServiceStart,
    opts?: GrantApiKeysOpts
  ): Promise<Map<string, ApiKeySOFields>> {
    return getApiKeyAndUserScope(
      taskInstances,
      request,
      this.security,
      {
        logger: this.logger,
        uiamEnabled: this.security.authc.apiKeys.uiam != null,
        uiamRequired: this.typeToUse === ApiKeyType.UIAM,
      },
      opts
    );
  }

  getApiKeyForFakeRequest(taskInstance: ConcreteTaskInstance): string | undefined {
    const record = recordTaskRunCredentialUsage(taskInstance);
    const keys = taskApiKeyStorage.read(taskInstance);
    const preferUiam = this.typeToUse === ApiKeyType.UIAM;
    const { credentialType, apiKey, fellBack } = pickCredential(keys, preferUiam ? 'uiam' : 'es');
    const createdByUser = keys?.createdByUser === true;

    if (credentialType === 'none') {
      record('none', 'not_set');
      return undefined;
    }

    if (credentialType === 'uiam_api_key') {
      record('uiam_api_key', createdByUser ? 'user_created_key' : 'provisioned');
      if (fellBack) {
        this.logger.debug(
          'ES API key is not provided to create a fake request, falling back to UIAM API key.',
          { tags: UIAM_LOGS_USAGE_TAGS }
        );
      }
      return apiKey ?? undefined;
    }

    // Some deployments legitimately can't mint UIAM keys, so falling back to the ES key is logged
    // at debug level. Volume and reason are tracked by the UIAM fallback OTel counter instead.
    if (fellBack && createdByUser) {
      record('es_api_key', 'user_created_key');
      taskManagerUiamTelemetry.recordUiamApiKeyFallback('user_created_key');
      this.logger.debug(
        'UIAM API key is not provided to create a fake request, falling back to ES API key created by the user.',
        { tags: UIAM_LOGS_USAGE_TAGS }
      );
    } else if (fellBack) {
      record('es_api_key', 'fallback_unexpected');
      taskManagerUiamTelemetry.recordUiamApiKeyFallback('unexpected');
      this.logger.debug(
        'UIAM API key is not provided to create a fake request, falling back to regular API key.',
        { tags: UIAM_LOGS_USAGE_TAGS }
      );
    } else {
      record('es_api_key', 'config');
    }
    return apiKey ?? undefined;
  }

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
