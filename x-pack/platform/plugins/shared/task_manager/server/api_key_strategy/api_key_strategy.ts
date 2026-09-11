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
import type { ApiKeyType } from '../config';
import type { ConcreteTaskInstance, TaskInstance, TaskUserScope } from '../task';
import { INVALIDATE_API_KEY_SO_NAME } from '../saved_objects';
import {
  taskManagerUiamTelemetry,
  type CredentialReason,
  type CredentialType,
} from '../otel/uiam_telemetry';

export type { ApiKeyType } from '../config';

export interface ApiKeySOFields {
  apiKey?: string;
  uiamApiKey?: string;
  userScope: TaskUserScope;
}

/** Optional flags passed to {@link ApiKeyStrategy.grantApiKeys}. */
export interface GrantApiKeysOpts {
  /** When true, grant only the Elasticsearch API key (skip UIAM). */
  onEsKey?: boolean;
  /**
   * When true, clone the caller's API key credentials instead of reusing them directly.
   * See {@link ApiKeyOptions.cloneApiKey}.
   */
  cloneApiKey?: boolean;
  /**
   * Called as soon as Task Manager creates a credential, before the complete grant operation
   * resolves. This lets callers clean up partial successes when a later grant fails.
   */
  onApiKeyCreated?: (target: InvalidationTarget) => void;
}

export interface InvalidationTarget {
  apiKeyId: string;
  uiamApiKey?: string;
}

/**
 * The credential fields {@link ApiKeyStrategy.getApiKeyIdsForInvalidation} needs, so that both a
 * stored task and a freshly granted key set that was never persisted can be passed to it.
 */
export type ApiKeyInvalidationSource = Pick<
  ConcreteTaskInstance,
  'apiKey' | 'uiamApiKey' | 'userScope'
>;

export interface ApiKeyStrategy {
  readonly shouldGrantUiam: boolean;
  readonly typeToUse: ApiKeyType;

  grantApiKeys(
    taskInstances: TaskInstance[],
    request: KibanaRequest,
    security: SecurityServiceStart,
    opts?: GrantApiKeysOpts
  ): Promise<Map<string, ApiKeySOFields>>;

  getApiKeyForFakeRequest(taskInstance: ConcreteTaskInstance): string | undefined;

  getApiKeyIdsForInvalidation(source: ApiKeyInvalidationSource): InvalidationTarget[];

  markForInvalidation(
    targets: InvalidationTarget[],
    logger: Logger,
    savedObjectsClient: SavedObjectsClientContract
  ): Promise<void>;
}

/**
 * Returns a recorder for the `kibana.task_manager.task_run.count` OTel counter that
 * only emits for user-scoped task runs — most background tasks never carry credentials
 * and would otherwise flood the `none` series.
 */
export const recordTaskRunCredentialUsage = (taskInstance: ConcreteTaskInstance) => {
  const isUserScoped =
    Boolean(taskInstance.userScope) ||
    Boolean(taskInstance.apiKey) ||
    Boolean(taskInstance.uiamApiKey);
  return (credentialType: CredentialType, credentialReason: CredentialReason): void => {
    if (isUserScoped) {
      taskManagerUiamTelemetry.recordTaskRun(credentialType, credentialReason);
    }
  };
};

export const markApiKeysForInvalidation = async (
  targets: InvalidationTarget[],
  logger: Logger,
  savedObjectsClient: SavedObjectsClientContract
): Promise<void> => {
  if (targets.length === 0) {
    return;
  }

  try {
    await savedObjectsClient.bulkCreate(
      targets.map((target) => ({
        attributes: {
          apiKeyId: target.apiKeyId,
          createdAt: new Date().toISOString(),
          ...(target.uiamApiKey ? { uiamApiKey: target.uiamApiKey } : {}),
        },
        type: INVALIDATE_API_KEY_SO_NAME,
      }))
    );
  } catch (e) {
    logger.error(`Failed to bulk mark ${targets.length} API keys for invalidation: ${e.message}`);
  }
};
