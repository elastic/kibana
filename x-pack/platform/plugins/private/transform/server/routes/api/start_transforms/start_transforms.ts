/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import type {
  StartTransformsRequestSchema,
  StartTransformsResponseSchema,
} from '../../api_schemas/start_transforms';
import { TRANSFORM_ACTIONS } from '../../../../common/types/transform';

import { isRequestTimeout, fillResultsWithTimeouts } from '../../utils/error_utils';

const ENCRYPTION_KEY_NOT_YET_AVAILABLE_ERROR = 'encryption_key_not_yet_available_exception';
const START_TRANSFORM_RETRY_DELAYS_MS = [1000, 2000, 5000];

const delay = async (delayMs: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
};

const containsErrorType = (value: unknown, errorType: string): boolean => {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  if ('type' in value && value.type === errorType) {
    return true;
  }

  return Object.values(value).some((nestedValue) => {
    if (Array.isArray(nestedValue)) {
      return nestedValue.some((item) => containsErrorType(item, errorType));
    }

    return containsErrorType(nestedValue, errorType);
  });
};

const isEncryptionKeyNotYetAvailableError = (error: unknown): boolean => {
  return containsErrorType(
    (error as { meta?: { body?: unknown } })?.meta?.body,
    ENCRYPTION_KEY_NOT_YET_AVAILABLE_ERROR
  );
};

const startTransformWithRetry = async (
  transformId: string,
  esClient: ElasticsearchClient,
  retryDelaysMs: number[]
): Promise<void> => {
  for (let attempt = 0; ; attempt++) {
    try {
      await esClient.transform.startTransform({
        transform_id: transformId,
      });
      return;
    } catch (error) {
      const shouldRetry =
        attempt < retryDelaysMs.length && isEncryptionKeyNotYetAvailableError(error);

      if (!shouldRetry) {
        throw error;
      }

      await delay(retryDelaysMs[attempt]);
    }
  }
};

export async function startTransforms(
  transformsInfo: StartTransformsRequestSchema,
  esClient: ElasticsearchClient,
  retryDelaysMs = START_TRANSFORM_RETRY_DELAYS_MS
) {
  const results: StartTransformsResponseSchema = {};

  for (const transformInfo of transformsInfo) {
    const transformId = transformInfo.id;
    try {
      await startTransformWithRetry(transformId, esClient, retryDelaysMs);
      results[transformId] = { success: true };
    } catch (e) {
      if (isRequestTimeout(e)) {
        return fillResultsWithTimeouts({
          results,
          id: transformId,
          items: transformsInfo,
          action: TRANSFORM_ACTIONS.START,
        });
      }
      results[transformId] = { success: false, error: e.meta.body.error };
    }
  }
  return results;
}
