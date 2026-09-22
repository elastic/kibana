/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AuthenticatedUser,
  Logger,
  SecurityServiceStart,
  KibanaRequest,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { HTTPAuthorizationHeader, isUiamCredential } from '@kbn/core-security-server';
import { truncate } from 'lodash';
import { ApiKeyType } from '../config';
import type { ConcreteTaskInstance, TaskInstance } from '../task';
import {
  createApiKey,
  getApiKeyFromRequest,
  getUiamApiKeySecret,
  hasApiKey,
  shouldCloneApiKeyFromRequest,
} from '../lib/api_key_utils';
import type {
  ApiKeyInvalidationSource,
  ApiKeySOFields,
  ApiKeyStrategy,
  GrantApiKeysOpts,
  InvalidationTarget,
} from './api_key_strategy';
import { markApiKeysForInvalidation, recordTaskRunCredentialUsage } from './api_key_strategy';
import {
  UIAM_LOGS_CREDENTIALS_TAGS,
  UIAM_LOGS_GRANT_TAGS,
  UIAM_LOGS_USAGE_TAGS,
} from '../constants';
import { taskManagerUiamTelemetry } from '../otel/uiam_telemetry';

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
    opts?: GrantApiKeysOpts
  ): Promise<Map<string, ApiKeySOFields>> {
    // Resolve identity once and thread it through every consumer below.
    // `apiKeyCreatedByUser` is derived from whether the incoming request is
    // authenticated with an API key (ES or UIAM). It is stored on `userScope`
    // and is used by `getApiKeyIdsForInvalidation` to short-circuit invalidation
    // of BOTH the ES and UIAM keys associated with this task.
    //
    // Invariant: when this flag is true, the same flag must govern invalidation
    // for every credential (ES and UIAM) that this strategy persists on the task.
    // This is safe today because we only attach a UIAM key when the request is
    // either UIAM-authenticated (reused as-is) or credential-less (granted anew),
    // and in both cases `apiKeyCreatedByUser` correctly reflects ownership for
    // both credentials. If future changes allow the ES and UIAM credentials to
    // have different ownership (e.g., mint a new UIAM key while reusing a
    // caller-supplied ES key), this invariant breaks and both fields must become
    // independent flags on `userScope` (e.g., `esApiKeyCreatedByUser` /
    // `uiamApiKeyCreatedByUser`) with matching per-credential checks in
    // `getApiKeyIdsForInvalidation`.
    const user = security.authc.getCurrentUser(request);
    const cloneApiKey = shouldCloneApiKeyFromRequest(security, request, opts, user);
    // When cloning, both the ES and UIAM credentials are freshly minted/Task-Manager-owned, so
    // apiKeyCreatedByUser must be false (the caller's transient key is not reused).
    const apiKeyCreatedByUser = hasApiKey(user, request) && !cloneApiKey;

    // UIAM's authoritative verdict on whether the request's API key is an external
    // (user-created Cloud) key, reported by the UIAM authentication provider on the current
    // user. `internal === false` is the only trustworthy "external" signal: the flag is absent
    // for session tokens and for fake requests, both of which keep the internal-key treatment
    // (fail closed). Persisted on `userScope` so task runs can withhold the UIAM shared
    // secret, which UIAM rejects for external keys.
    const uiamApiKeyExternal = user?.api_key?.internal === false ? true : undefined;

    // Shared shape for the saved-object `userScope`, kept in one place so the
    // clone-UIAM and ES paths below cannot drift apart.
    const toUserScope = (apiKeyId: string, uiamApiKeyId?: string) => ({
      apiKeyId,
      ...(uiamApiKeyId ? { uiamApiKeyId } : {}),
      spaceId: request.spaceId,
      apiKeyCreatedByUser,
      ...(apiKeyCreatedByUser && uiamApiKeyExternal ? { uiamApiKeyExternal } : {}),
      userProfileId: user?.profile_uid,
      userName: user?.username,
    });

    // When cloning a UIAM-authenticated request there is no Elasticsearch API key to clone:
    // `cloneAsInternalUser` hits the native ES clone endpoint, which rejects raw `essu_`
    // credentials. Persist a single freshly granted UIAM key and skip the ES clone path
    // entirely. Non-clone requests keep the existing ES (+ optional UIAM) behavior.
    const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request);
    const isUiamRequest = !!authorizationHeader && isUiamCredential(authorizationHeader);
    const cloneUiamRequest = isUiamRequest && cloneApiKey && opts?.onEsKey !== true;

    if (cloneUiamRequest) {
      const uiamOnlyKeys = await this.grantUiamApiKeys(
        taskInstances,
        request,
        user,
        apiKeyCreatedByUser,
        isUiamRequest,
        opts?.onApiKeyCreated
      );

      const uiamOnlyResult = new Map<string, ApiKeySOFields>();
      taskInstances.forEach((task) => {
        const uiamKey = uiamOnlyKeys.get(task.id!);
        // Fail loud, matching the ES path (`createApiKey` throws). A missing key here
        // would otherwise schedule a task that can never authenticate at run time.
        if (!uiamKey) {
          throw new Error(`Failed to grant UIAM API key for cloned task "${task.id}"`);
        }
        uiamOnlyResult.set(task.id!, {
          uiamApiKey: uiamKey.apiKey,
          userScope: toUserScope(uiamKey.apiKeyId, uiamKey.apiKeyId),
        });
      });

      return uiamOnlyResult;
    }

    // A raw `essu_` credential on a non-clone request is a user-created Cloud API key
    // (obtained from the Elastic Cloud UI). It carries no key id and has no Elasticsearch
    // counterpart, so persist it as-is (UIAM-only) and leave lifecycle management (rotation,
    // deletion) to the user — `apiKeyCreatedByUser: true` already short-circuits
    // `getApiKeyIdsForInvalidation` for both credentials.
    if (isUiamRequest && apiKeyCreatedByUser && opts?.onEsKey !== true) {
      const credentials = getApiKeyFromRequest(request);
      if (!credentials?.api_key) {
        throw new Error('Could not extract API key from user request header.');
      }

      const userUiamResult = new Map<string, ApiKeySOFields>();
      taskInstances.forEach((task) => {
        userUiamResult.set(task.id!, {
          uiamApiKey: credentials.api_key,
          // User-created keys carry no key id. An empty `apiKeyId` satisfies the task SO
          // schema (required across all model versions) and is already treated as "no id"
          // by consumers (`classifyTaskForUiamProvisioning` skips it, and invalidation is
          // skipped entirely for user-created keys). `uiamApiKeyExternal` (from
          // `toUserScope`) carries UIAM's verdict for the run-time credential treatment.
          userScope: toUserScope(''),
        });
      });

      return userUiamResult;
    }

    const esKeys = await createApiKey(taskInstances, request, security, opts, {
      user,
      apiKeyCreatedByUser,
    });
    const uiamKeys =
      opts?.onEsKey === true
        ? new Map<string, UiamApiKeyResult>()
        : await this.grantUiamApiKeys(
            taskInstances,
            request,
            user,
            apiKeyCreatedByUser,
            isUiamRequest,
            opts?.onApiKeyCreated
          );

    const result = new Map<string, ApiKeySOFields>();
    taskInstances.forEach((task) => {
      const esKey = esKeys.get(task.id!);
      if (esKey) {
        const uiamKey = uiamKeys.get(task.id!);
        result.set(task.id!, {
          apiKey: esKey.apiKey,
          ...(uiamKey ? { uiamApiKey: uiamKey.apiKey } : {}),
          userScope: toUserScope(esKey.apiKeyId, uiamKey?.apiKeyId),
        });
      }
    });

    return result;
  }

  private async grantUiamApiKeys(
    taskInstances: TaskInstance[],
    request: KibanaRequest,
    user: AuthenticatedUser | null,
    apiKeyCreatedByUser: boolean,
    isUiamRequest: boolean,
    onApiKeyCreated?: GrantApiKeysOpts['onApiKeyCreated']
  ): Promise<Map<string, UiamApiKeyResult>> {
    const uiam = this.security.authc.apiKeys.uiam;
    const uiamKeyByTaskIdMap = new Map<string, UiamApiKeyResult>();

    if (!uiam) {
      return uiamKeyByTaskIdMap;
    }

    if (apiKeyCreatedByUser) {
      const apiKeyResult = getApiKeyFromRequest(request);
      // Raw user-created UIAM keys (no id) are persisted UIAM-only in `grantApiKeys` and
      // never reach this path; here only `base64(id:key)`-encoded UIAM credentials qualify.
      const { id, api_key: apiKey } = apiKeyResult ?? {};
      if (id && apiKey && isUiamCredential(apiKey)) {
        taskInstances.forEach((task) => {
          uiamKeyByTaskIdMap.set(task.id!, {
            apiKey,
            apiKeyId: id,
          });
        });
      }
      return uiamKeyByTaskIdMap;
    }

    if (!isUiamRequest) {
      this.logger.debug(
        'Request credential is not UIAM-compatible, skipping UIAM API key grant. Only ES API keys will be used.',
        { tags: UIAM_LOGS_CREDENTIALS_TAGS }
      );
      return uiamKeyByTaskIdMap;
    }

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
          onApiKeyCreated?.({ apiKeyId: uiamResult.id, uiamApiKey: uiamResult.api_key });
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
    // `apiKeyCreatedByUser` gates invalidation for BOTH the ES and UIAM keys.
    // See the invariant documented in `grantApiKeys`: both credentials are
    // currently persisted with the same ownership, so a single flag is
    // sufficient. Revisit if ES and UIAM credentials ever diverge in ownership.
    if (!userScope || userScope.apiKeyCreatedByUser) {
      return [];
    }

    const targets: InvalidationTarget[] = [];

    // Skip the ES invalidation target when no ES key material (`apiKey`) was persisted.
    // UIAM-only tasks have only a UIAM key; their `userScope.apiKeyId` actually holds the
    // UIAM key id (mirrored for the in-use guard query), so a bare `{ apiKeyId }` target
    // would be sent to ES-native invalidation, which cannot revoke a UIAM key. The UIAM
    // key is invalidated below via the `uiamApiKeyId` + `uiamApiKey` target.
    if (apiKey) {
      targets.push({ apiKeyId: userScope.apiKeyId });
    }

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
