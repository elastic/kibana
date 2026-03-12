/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';

const DEFAULT_SHARD_RECOVERY_MAX_RETRIES = 3;
const DEFAULT_SHARD_RECOVERY_INITIAL_DELAY_MS = 200;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface ShardRecoveryErrorShape {
  statusCode?: number;
  type?: string;
  meta?: {
    statusCode?: number;
    body?: {
      error?: {
        type?: string;
        reason?: string;
      };
    };
  };
}

export const isRetryableShardRecoveryError = (error: unknown): boolean => {
  const errorData = error as ShardRecoveryErrorShape;
  const statusCode = errorData?.statusCode;
  const metaStatusCode = errorData?.meta?.statusCode;
  const topLevelType = errorData?.type;
  const bodyType = errorData?.meta?.body?.error?.type;
  const bodyReason = errorData?.meta?.body?.error?.reason;
  const message = error instanceof Error ? error.message : String(error);

  const hasRecoveringReason = `${bodyReason ?? ''} ${message}`.includes('CurrentState[RECOVERING]');
  const isNoShardAvailable =
    topLevelType === 'no_shard_available_action_exception' ||
    bodyType === 'no_shard_available_action_exception' ||
    message.includes('no_shard_available_action_exception');
  const isIllegalShardState =
    bodyType === 'illegal_index_shard_state_exception' ||
    topLevelType === 'illegal_index_shard_state_exception';

  return (
    statusCode === 503 ||
    metaStatusCode === 503 ||
    isNoShardAvailable ||
    (isIllegalShardState && hasRecoveringReason)
  );
};

export const withShardRecoveryRetry = async <T>({
  logger,
  operation,
  action,
  maxRetries = DEFAULT_SHARD_RECOVERY_MAX_RETRIES,
  initialDelayMs = DEFAULT_SHARD_RECOVERY_INITIAL_DELAY_MS,
}: {
  logger: Logger;
  operation: string;
  action: () => Promise<T>;
  maxRetries?: number;
  initialDelayMs?: number;
}): Promise<T> => {
  let delayMs = initialDelayMs;

  for (let attempt = 1; ; attempt++) {
    try {
      return await action();
    } catch (error) {
      const shouldRetry = isRetryableShardRecoveryError(error) && attempt < maxRetries;
      if (!shouldRetry) {
        throw error;
      }
      logger.debug(
        `[inference.anonymization.retry] operation=${operation} attempt=${attempt} reason=shard_recovering`
      );
      await sleep(delayMs);
      delayMs *= 2;
    }
  }
};
