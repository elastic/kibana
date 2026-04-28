/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout } from 'timers/promises';
import type {
  BulkOperationType,
  BulkResponseItem,
  ErrorCause,
} from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/core/server';
import { BulkOperationError } from '@kbn/storage-adapter';

const INFERENCE_RE = /inference/i;

const MAX_INFERENCE_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 2000;

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
 * Inference failures are usually transient -- the ML node may still be warming
 * up, or the inference service may be overwhelmed. The operation is retried up
 * to `MAX_INFERENCE_ATTEMPTS` times with exponential backoff (2s, 4s, ...) while
 * keeping the embedding field in place, giving inference time to recover.
 *
 * If every retry still fails with inference-only errors, the write is replayed
 * once without the `semantic_text` field as a last-resort fallback. This trades
 * embedding precision for data availability when inference is unavailable for
 * an extended period; missing embeddings will be regenerated on the next
 * successful write.
 *
 * Non-inference bulk errors, mixed failures (some inference, some other), and
 * all other error types propagate immediately without retry or fallback.
 *
 * On partial success (some items indexed before the failure) the fallback
 * replays the entire batch without embeddings. This can strip embeddings from
 * items that succeeded on the first attempt. We accept this trade-off because
 * these are single-shard system indices where all-or-nothing inference failure
 * is the overwhelmingly common case.
 *
 * This avoids any pre-flight inference probing -- Elasticsearch decides
 * whether the embedding can be computed at write time.
 */
export async function bulkWithInferenceFallback<T>(
  logger: Logger,
  attempt: (opts: { includeEmbedding: boolean }) => Promise<T>
): Promise<T> {
  for (let attemptNumber = 1; attemptNumber <= MAX_INFERENCE_ATTEMPTS; attemptNumber++) {
    try {
      return await attempt({ includeEmbedding: true });
    } catch (error) {
      if (!(error instanceof BulkOperationError)) {
        throw error;
      }

      const { inference, other } = countInferenceErrors(error);
      const total = error.response?.items?.length ?? 0;

      if (inference === 0) {
        throw error;
      }

      if (other > 0) {
        logger.warn(
          `Bulk write failed with mixed errors (${inference} inference + ${other} other out of ${total} items) -- not retrying: ${error.message}`
        );
        throw error;
      }

      const isLastAttempt = attemptNumber === MAX_INFERENCE_ATTEMPTS;
      if (isLastAttempt) {
        logger.warn(
          `Bulk write failed due to inference error (${inference}/${total} items) after ${attemptNumber} attempts -- falling back to writing without semantic_text embedding: ${error.message}`
        );
        break;
      }

      const delayMs = Math.pow(2, attemptNumber - 1) * BASE_BACKOFF_MS;
      logger.warn(
        `Bulk write failed due to inference error (${inference}/${total} items) -- retrying in ${delayMs}ms (attempt ${attemptNumber}/${MAX_INFERENCE_ATTEMPTS}): ${error.message}`
      );
      await setTimeout(delayMs);
    }
  }

  const result = await attempt({ includeEmbedding: false });
  logger.debug('Bulk write fallback without embedding succeeded');
  return result;
}
