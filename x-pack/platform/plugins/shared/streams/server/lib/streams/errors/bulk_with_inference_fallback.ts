/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BulkOperationType,
  BulkResponseItem,
  ErrorCause,
} from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/core/server';
import { BulkOperationError } from '@kbn/storage-adapter';

const INFERENCE_RE = /inference/i;

/**
 * Returns `true` when any `reason` in the `ErrorCause` tree mentions
 * "inference" (case-insensitive). Walks `caused_by`, `root_cause`,
 * and `suppressed` arrays so nested wrappers are not missed.
 *
 * This heuristic relies on ES `ShardBulkInferenceActionFilter` always
 * including "inference" somewhere in the error chain for `semantic_text`
 * bulk failures. If ES changes that wording this detection may need
 * updating.
 */
function errorCauseMentionsInference(cause: ErrorCause): boolean {
  if (cause.reason && INFERENCE_RE.test(cause.reason)) {
    return true;
  }
  if (cause.caused_by && errorCauseMentionsInference(cause.caused_by)) {
    return true;
  }
  if (cause.root_cause?.some(errorCauseMentionsInference)) {
    return true;
  }
  if (cause.suppressed?.some(errorCauseMentionsInference)) {
    return true;
  }
  return false;
}

/**
 * Returns `true` when **every** errored item in the bulk response has an
 * inference-related error reason, and there is at least one errored item.
 */
export function isInferenceRelatedBulkError(error: BulkOperationError): boolean {
  const items = error.response?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return false;
  }

  const errorCauses: ErrorCause[] = [];

  for (const item of items) {
    // Each bulk response item is a single-key object keyed by the operation type.
    const op = Object.keys(item)[0] as BulkOperationType;
    const detail: BulkResponseItem | undefined = item[op];
    if (detail?.error) {
      errorCauses.push(detail.error);
    }
  }

  return errorCauses.length > 0 && errorCauses.every(errorCauseMentionsInference);
}

/**
 * Executes a bulk write that may include a `semantic_text` embedding field.
 *
 * If the first attempt throws a `BulkOperationError` whose **every** failed
 * item is inference-related (reason contains "inference"), the write is
 * retried once with the embedding field stripped. Non-inference bulk errors
 * and all other error types propagate immediately.
 *
 * On partial success (some items indexed before the failure) the retry
 * replays the entire batch without embeddings. This can strip embeddings
 * from items that succeeded on the first attempt. We accept this trade-off
 * because: (a) these are single-shard system indices where all-or-nothing
 * inference failure is the overwhelmingly common case, and (b) data
 * availability is more important than preserving embeddings that will be
 * recomputed on the next write when inference recovers.
 *
 * This avoids any pre-flight inference probing — Elasticsearch decides
 * whether the embedding can be computed at write time.
 */
export async function bulkWithInferenceFallback<T>(
  logger: Logger,
  attempt: (opts: { includeEmbedding: boolean }) => Promise<T>
): Promise<T> {
  try {
    return await attempt({ includeEmbedding: true });
  } catch (error) {
    if (error instanceof BulkOperationError && isInferenceRelatedBulkError(error)) {
      const total = error.response.items.length;
      const failed = error.response.items.filter((item) => {
        const op = Object.keys(item)[0] as BulkOperationType;
        return item[op]?.error;
      }).length;
      logger.warn(
        `Bulk write failed due to inference error (${failed}/${total} items) — retrying without semantic_text embedding: ${error.message}`
      );
      return await attempt({ includeEmbedding: false });
    }
    throw error;
  }
}
