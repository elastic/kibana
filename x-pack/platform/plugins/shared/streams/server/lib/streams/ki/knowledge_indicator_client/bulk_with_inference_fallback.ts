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
  BulkResponse,
  ErrorCause,
} from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/core/server';

const INFERENCE_RE = /inference/i;

const MAX_INFERENCE_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 2000;

/**
 * Returns `true` when `type` or `reason` in the `ErrorCause` tree mentions
 * "inference" (case-insensitive). Walks `caused_by`, `root_cause`, and
 * `suppressed` arrays so nested wrappers are not missed.
 */
export function errorCauseMentionsInference(cause: ErrorCause): boolean {
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

/**
 * Counts inference-vs-other errors directly on a raw bulk response (the data
 * stream client returns the ES bulk response without wrapping it in a
 * `BulkOperationError`). Returns `{ inference: 0, other: 0 }` when the response
 * has no items or no errors.
 */
export function countRawBulkInferenceErrors(response: BulkResponse): InferenceErrorCounts {
  const items = response.items;
  if (!Array.isArray(items) || items.length === 0) {
    return { inference: 0, other: 0 };
  }

  let inference = 0;
  let other = 0;

  for (const item of items) {
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
 * Executes a bulk write that may include a `semantic_text` embedding field
 * against the data-stream-backed knowledge indicators index.
 *
 * Behaviour mirrors the storage-adapter equivalent (`bulkWithInferenceFallback`):
 *  - Up to {@link MAX_INFERENCE_ATTEMPTS} retries with exponential backoff while
 *    inference is the only failure mode, embeddings remain in place.
 *  - On the final attempt, falls back to writing without embeddings so data is
 *    not lost if inference is unavailable for an extended period.
 *  - Mixed inference + other errors propagate immediately without retry.
 *
 * Unlike the storage-adapter version, the underlying client does not throw on
 * partial failure — we inspect the returned `BulkResponse` directly.
 */
export async function bulkCreateWithInferenceFallback(
  logger: Logger,
  attempt: (opts: { includeEmbedding: boolean }) => Promise<BulkResponse>
): Promise<BulkResponse> {
  for (let attemptNumber = 1; attemptNumber <= MAX_INFERENCE_ATTEMPTS; attemptNumber++) {
    const response = await attempt({ includeEmbedding: true });

    if (!response.errors) {
      return response;
    }

    const { inference, other } = countRawBulkInferenceErrors(response);
    const total = response.items?.length ?? 0;

    if (inference === 0) {
      throw new Error(
        `Bulk write failed with ${other} non-inference error(s) out of ${total} items — not retrying`
      );
    }

    if (other > 0) {
      throw new Error(
        `Bulk write failed with mixed errors (${inference} inference + ${other} other out of ${total} items) — not retrying`
      );
    }

    const isLastAttempt = attemptNumber === MAX_INFERENCE_ATTEMPTS;
    if (isLastAttempt) {
      logger.warn(
        `Bulk write failed due to inference error (${inference}/${total} items) after ${attemptNumber} attempts -- falling back to writing without semantic_text embedding`
      );
      break;
    }

    const delayMs = Math.pow(2, attemptNumber - 1) * BASE_BACKOFF_MS;
    logger.warn(
      `Bulk write failed due to inference error (${inference}/${total} items) -- retrying in ${delayMs}ms (attempt ${attemptNumber}/${MAX_INFERENCE_ATTEMPTS})`
    );
    await setTimeout(delayMs);
  }

  const fallback = await attempt({ includeEmbedding: false });
  if (fallback.errors) {
    // The underlying client does not throw on partial failure, so an errored
    // fallback would otherwise be silently reported as success. Surface it.
    const { inference, other } = countRawBulkInferenceErrors(fallback);
    const total = fallback.items?.length ?? 0;
    throw new Error(
      `Bulk write fallback without embedding failed (${inference + other}/${total} items errored)`
    );
  }
  logger.debug('Bulk write fallback without embedding succeeded');
  return fallback;
}
