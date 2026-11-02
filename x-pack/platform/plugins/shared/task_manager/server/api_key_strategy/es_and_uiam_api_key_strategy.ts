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
import { UIAM_LOGS_USAGE_TAGS } from '../constants';
import { taskManagerUiamTelemetry } from '../otel/uiam_telemetry';

export class EsAndUiamApiKeyStrategy implements ApiKeyStrategy {
  public readonly shouldGrantUiam = true;
  public readonly typeToUse: ApiKeyType;
  private readonly logger: Logger;

  constructor(apiKeyType: ApiKeyType, _security: SecurityServiceStart, logger: Logger) {
    this.typeToUse = apiKeyType;
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
      uiamEnabled: true,
      // Once tasks run with UIAM keys, a task scheduled without one cannot authenticate the way
      // its runs expect, so a failed UIAM grant fails the scheduling call.
      uiamRequired: this.typeToUse === ApiKeyType.UIAM,
      opts,
    });
  }

  getApiKeyForFakeRequest(taskInstance: ConcreteTaskInstance): string | undefined {
    const { userScope, apiKey, uiamApiKey } = taskInstance;
    const record = recordTaskRunCredentialUsage(taskInstance);

    if (this.typeToUse === ApiKeyType.UIAM) {
      if (uiamApiKey) {
        record('uiam_api_key', userScope?.apiKeyCreatedByUser ? 'user_created_key' : 'provisioned');
        return getUiamApiKeySecret(uiamApiKey);
      }

      // No UIAM key available even though the strategy is configured to use UIAM.
      // Fall back to the ES API key so the task can still run. Some deployments
      // legitimately cannot mint UIAM keys, so this fallback is expected in the
      // wild and is logged at debug level to avoid noise. Volume and reason are
      // tracked via the `kibana.task_manager.task_run.uiam_api_key_fallback.count`
      // OTel counter instead, which is broken down per project.
      // Mirrors the alerting rule loader behavior (see PR #264434).
      if (apiKey) {
        if (userScope?.apiKeyCreatedByUser) {
          record('es_api_key', 'user_created_key');
          taskManagerUiamTelemetry.recordUiamApiKeyFallback('user_created_key');
          this.logger.debug(
            'UIAM API key is not provided to create a fake request, falling back to ES API key created by the user.',
            { tags: UIAM_LOGS_USAGE_TAGS }
          );
        } else {
          record('es_api_key', 'fallback_unexpected');
          taskManagerUiamTelemetry.recordUiamApiKeyFallback('unexpected');
          this.logger.debug(
            'UIAM API key is not provided to create a fake request, falling back to regular API key.',
            { tags: UIAM_LOGS_USAGE_TAGS }
          );
        }
      } else {
        record('none', 'not_set');
      }
      return apiKey;
    }

    // A cloned UIAM request persists only a UIAM key (no ES `apiKey`) even when the
    // strategy's `typeToUse` is ES (`grant_uiam_api_keys=true` while `api_key_type`
    // defaults to `es`). Fall back to the UIAM key so the task can still authenticate
    // at run time instead of yielding an undefined credential.
    if (!apiKey && uiamApiKey) {
      record('uiam_api_key', userScope?.apiKeyCreatedByUser ? 'user_created_key' : 'provisioned');
      this.logger.debug(
        'ES API key is not provided to create a fake request, falling back to UIAM API key.',
        { tags: UIAM_LOGS_USAGE_TAGS }
      );
      return getUiamApiKeySecret(uiamApiKey);
    }

    if (apiKey) {
      record('es_api_key', 'config');
    } else {
      record('none', 'not_set');
    }
    return apiKey;
  }

  getApiKeyIdsForInvalidation(source: ApiKeyInvalidationSource): InvalidationTarget[] {
    const { userScope, uiamApiKey, apiKey } = source;
    if (!userScope) {
      return [];
    }

    return getApiKeyInvalidationTargets({
      createdByUser: userScope.apiKeyCreatedByUser,
      // UIAM-only tasks mirror their UIAM key id in `userScope.apiKeyId`, and ES-native
      // invalidation cannot revoke a UIAM key, so only emit an ES target for a stored ES key.
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
