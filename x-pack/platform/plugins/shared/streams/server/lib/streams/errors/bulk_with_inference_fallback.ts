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
 * Returns `true` when `type` or `reason` in the `ErrorCause` tree mentions
 * "inference" (case-insensitive). Walks `caused_by`, `root_cause`, and
 * `suppressed` arrays so nested wrappers are not missed.
 *
 * ES wraps `semantic_text` bulk failures in an `InferenceException` whose
 * `type` and/or `reason` contain "inference". If ES changes that wording
 * this detection may need updating.
 */
function errorCauseMentionsInference(cause: ErrorCause): boolean {
  if (cause.type && INFERENCE_RE.test(cause.type)) {
    return true;
  }
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

interface InferenceErrorCounts {
  inference: number;
  other: number;
}

function countInferenceErrors(error: BulkOperationError): InferenceErrorCounts {
  const items = error.response?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return { inference: 0, other: 0 };
  }

  let inference = 0;
  let other = 0;

  for (const item of items) {
    // Each bulk response item is a single-key object keyed by the operation type.
    const op = Object.keys(item)[0] as BulkOperationType;
    const detail: BulkResponseItem | undefined = item[op];
    if (detail?.error) {
      if (errorCauseMentionsInference(detail.error)) {
        inference++;
      } else {
        other++;
      }
    }
  }

  return { inference, other };
}

/**
 * Returns `true` when **every** errored item in the bulk response has an
 * inference-related error (type/reason contains "inference"), and there is
 * at least one errored item.
 */
export function isInferenceRelatedBulkError(error: BulkOperationError): boolean {
  const { inference, other } = countInferenceErrors(error);
  return inference > 0 && other === 0;
}

/**
 * Executes a bulk write that may include a `semantic_text` embedding field.
 *
 * If the first attempt throws a `BulkOperationError` whose **every** failed
 * item is inference-related (type/reason contains "inference"), the write is
 * retried once with the embedding field stripped. Non-inference bulk errors,
 * mixed failures, and all other error types propagate immediately.
 *
 * On partial success (some items indexed before the failure) the retry
 * replays the entire batch without embeddings. This can strip embeddings
 * from items that succeeded on the first attempt. We accept this trade-off
 * because: (a) these are single-shard system indices where all-or-nothing
 * inference failure is the overwhelmingly common case, and (b) data
 * availability is more important than preserving embeddings that will be
 * recomputed on the next write when inference recovers.
 *
 * This avoids any pre-flight inference probing -- Elasticsearch decides
 * whether the embedding can be computed at write time.
 */
export async function bulkWithInferenceFallback<T>(
  logger: Logger,
  attempt: (opts: { includeEmbedding: boolean }) => Promise<T>
): Promise<T> {
  try {
    return await attempt({ includeEmbedding: true });
  } catch (error) {
    if (error instanceof BulkOperationError) {
      const { inference, other } = countInferenceErrors(error);
      const total = error.response?.items?.length ?? 0;

      if (inference > 0 && other === 0) {
        logger.warn(
          `Bulk write failed due to inference error (${inference}/${total} items) -- retrying without semantic_text embedding: ${error.message}`
        );
        const result = await attempt({ includeEmbedding: false });
        logger.debug('Bulk write retry without embedding succeeded');
        return result;
      }

      if (inference > 0 && other > 0) {
        logger.warn(
          `Bulk write failed with mixed errors (${inference} inference + ${other} other out of ${total} items) -- not retrying: ${error.message}`
        );
      }
    }
    throw error;
  }
}
