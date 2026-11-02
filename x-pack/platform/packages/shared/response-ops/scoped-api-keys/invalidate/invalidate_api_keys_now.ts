/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { InvalidateAPIKeyResult } from '@kbn/security-plugin-types-server';
import type { ApiKeyInvalidationTarget } from './get_api_key_invalidation_targets';
import { invalidateAPIKeys, invalidateUiamAPIKeys } from './invalidate_api_keys';

export interface InvalidateApiKeysNowDeps {
  security: SecurityServiceStart;
  logger: Logger;
}

export interface InvalidateApiKeysNowOpts {
  /** Names the object that owned the keys in log messages, e.g. `alerting rule : my-rule`. */
  logContext: string;
  logTags?: string[];
}

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));
const errorMeta = (err: unknown, tags?: string[]) => ({
  tags,
  error: { stack_trace: err instanceof Error ? err.stack : undefined },
});
const errorReasons = (result: InvalidateAPIKeyResult) =>
  result.error_details?.map(({ reason }) => reason).join(', ');

const invalidateEsApiKeysNow = async (
  targets: ApiKeyInvalidationTarget[],
  { security, logger }: InvalidateApiKeysNowDeps,
  { logContext }: InvalidateApiKeysNowOpts
): Promise<ApiKeyInvalidationTarget[]> => {
  if (targets.length === 0) {
    return [];
  }

  try {
    // As the internal user, so this does not depend on the caller having `manage_api_key`.
    const response = await invalidateAPIKeys(
      { ids: targets.map(({ apiKeyId }) => apiKeyId) },
      (params) => security.authc.apiKeys.invalidateAsInternalUser(params)
    );
    if (!response.apiKeysEnabled) {
      return [];
    }

    const { result } = response;
    if (result.error_count > 0) {
      logger.error(
        `Failed to synchronously invalidate ES API key for ${logContext}: ${errorReasons(result)}`
      );
    }

    // A key granted with refresh=false can be missing from Elasticsearch search results.
    const handled = new Set([
      ...result.invalidated_api_keys,
      ...result.previously_invalidated_api_keys,
    ]);
    const missed = targets.filter(({ apiKeyId }) => !handled.has(apiKeyId));
    if (missed.length > 0) {
      logger.warn(`Synchronous ES API key invalidation found no key for ${logContext}.`);
    }
    return missed;
  } catch (err) {
    logger.error(
      `Failed to synchronously invalidate ES API key for ${logContext}: ${errorMessage(err)}`,
      errorMeta(err)
    );
    return targets;
  }
};

const invalidateUiamApiKeyNow = async (
  { apiKeyId, uiamApiKey }: ApiKeyInvalidationTarget & { uiamApiKey: string },
  { security, logger }: InvalidateApiKeysNowDeps,
  { logContext, logTags }: InvalidateApiKeysNowOpts
): Promise<boolean> => {
  const { uiam } = security.authc.apiKeys;
  try {
    const response = await invalidateUiamAPIKeys(
      { apiKeyId, uiamApiKey },
      uiam ? (request, params) => uiam.invalidate(request, params) : undefined
    );
    if (response.apiKeysEnabled && response.result.error_count > 0) {
      logger.error(
        `Failed to synchronously invalidate UIAM API key for ${logContext}: ${errorReasons(
          response.result
        )}`,
        { tags: logTags }
      );
    }
    return true;
  } catch (err) {
    logger.error(
      `Failed to synchronously invalidate UIAM API key for ${logContext}: ${errorMessage(err)}`,
      errorMeta(err, logTags)
    );
    return false;
  }
};

/**
 * Invalidates API keys immediately instead of queueing them. Never throws; returns the targets
 * that could not be invalidated so the caller can queue or log them.
 */
export const invalidateApiKeysNow = async (
  deps: InvalidateApiKeysNowDeps,
  targets: ApiKeyInvalidationTarget[],
  opts: InvalidateApiKeysNowOpts
): Promise<ApiKeyInvalidationTarget[]> => {
  const uiamTargets = targets.filter(
    (target): target is ApiKeyInvalidationTarget & { uiamApiKey: string } => !!target.uiamApiKey
  );
  const esTargets = targets.filter(({ uiamApiKey }) => !uiamApiKey);

  const [esFailed, uiamResults] = await Promise.all([
    invalidateEsApiKeysNow(esTargets, deps, opts),
    Promise.all(uiamTargets.map((target) => invalidateUiamApiKeyNow(target, deps, opts))),
  ]);

  return [...esFailed, ...uiamTargets.filter((_, index) => !uiamResults[index])];
};
