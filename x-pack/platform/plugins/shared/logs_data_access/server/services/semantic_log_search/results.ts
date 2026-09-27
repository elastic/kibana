/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { isRequestAbortedError } from '@kbn/es-errors';
import type { Logger } from '@kbn/logging';
import {
  ERROR_REASON,
  SEARCH_PHASE,
  SEARCH_STATUS,
  type ErrorReason,
  type SearchPhase,
  type UnavailableReason,
} from '../../../common/services/semantic_log_search/constants';
import type {
  SearchDiagnostics,
  SemanticLogSearchResult,
} from '../../../common/services/semantic_log_search/types';

export { SEARCH_PHASE };

/** Builds an `error` result without repeating the status literal at every call site. */
export const errorResult = (
  reason: ErrorReason,
  diagnostics?: SearchDiagnostics
): SemanticLogSearchResult => ({
  status: SEARCH_STATUS.ERROR,
  reason,
  ...(diagnostics ? { diagnostics } : {}),
});

/** Builds an `unavailable` result without repeating the status literal at every call site. */
export const unavailableResult = (reason: UnavailableReason): SemanticLogSearchResult => ({
  status: SEARCH_STATUS.UNAVAILABLE,
  reason,
});

// Tests the error type, not the signal: any non-abort error surfacing after an abort
// (mapping error, 403) must still be classified as `execution`, not `cancelled`.
function isCancellationError(error: unknown): boolean {
  return (
    isRequestAbortedError(error) ||
    (error instanceof Error &&
      (error.name === 'AbortError' || error.name === 'RequestAbortedError'))
  );
}

// `instanceof` is what core infra uses; the name check is kept so a client that surfaces a plain Error is still classified.
// https://github.com/elastic/kibana/blob/b0a5eac91a48/src/core/packages/elasticsearch/server-utils/src/is_retryable_es_client_error.ts#L46
// The union is strictly more permissive than the name check alone, so no existing timeout is reclassified to `execution`.
function isTimeoutError(error: unknown): boolean {
  return (
    error instanceof errors.TimeoutError ||
    (error instanceof Error && error.name === 'TimeoutError')
  );
}

/**
 * Elasticsearch's own name for "the model was not deployed in time", which arrives as a successful
 * HTTP response carrying an error body rather than as a client `TimeoutError`.
 */
const MODEL_DEPLOYMENT_TIMEOUT_TYPE = 'model_deployment_timeout_exception';

/** Elasticsearch's error type when a hosted inference service exceeds its own budget. */
const INFERENCE_TIMEOUT_TYPE = 'timeout_exception';

// A rerank call can exhaust its budget in three places, and only one of them arrives as a client
// `TimeoutError`. The other two come back as a `ResponseError` and were both observed against a
// serverless project (measurements in `RERANK_ENDPOINTS.md`):
//
//   - a cold local deployment           →       `model_deployment_timeout_exception`
//   - a local deployment that cannot rank the
//     candidate set within Elasticsearch's budget → `408 status_exception`
//   - a hosted service shedding the request  →  `429 timeout_exception`
//
// All three are retryable, so all three have to reach the same classification, or the caller is told
// not to retry the one thing that would work. 408 is matched on the status alone because it means
// exactly this; a 429 is matched only alongside the timeout type, since a plain rate limit is a
// different failure and must stay `execution`.
function isInferenceTimeoutError(error: unknown): boolean {
  if (error instanceof errors.ResponseError) {
    const type = (error.body as { error?: { type?: string } } | undefined)?.error?.type;
    if (type === MODEL_DEPLOYMENT_TIMEOUT_TYPE || type === INFERENCE_TIMEOUT_TYPE) return true;
    if (error.statusCode === 408) return true;
  }
  return error instanceof Error && error.message.includes(MODEL_DEPLOYMENT_TIMEOUT_TYPE);
}

/**
 * Elasticsearch's classifier for a failure, e.g. `verification_exception`, or the error's name when
 * it did not come from Elasticsearch. Never the message: that is free text and is logged instead.
 */
function elasticsearchErrorType(error: unknown): string | undefined {
  if (error instanceof errors.ResponseError) {
    const type = (error.body as { error?: { type?: string } } | undefined)?.error?.type;
    if (type) return type;
  }
  return error instanceof Error ? error.name : undefined;
}

// A probe timeout is actionable: the scope is too broad to categorize within the budget, and a
// narrower one may succeed. A rerank timeout is actionable in a different way, because the model is
// likely still loading, so retrying shortly may succeed while narrowing the scope will not. A
// timeout in any other phase is not actionable.
const PHASE_FAILURE: Record<
  SearchPhase,
  { timeoutReason: ErrorReason; timeoutText: string; failedText: string }
> = {
  capabilities: {
    timeoutReason: ERROR_REASON.TIMEOUT,
    timeoutText: 'capability check timed out',
    failedText: 'capability check failed',
  },
  probe: {
    timeoutReason: ERROR_REASON.SCOPE_TOO_LARGE,
    timeoutText: 'scope too large: count probe timed out',
    failedText: 'count probe failed',
  },
  search: {
    timeoutReason: ERROR_REASON.TIMEOUT,
    timeoutText: 'timed out',
    failedText: 'failed',
  },
  rerank: {
    timeoutReason: ERROR_REASON.INFERENCE_NOT_READY,
    timeoutText: 'rerank timed out: the inference endpoint may still be loading its model',
    failedText: 'rerank failed',
  },
};

/** Classifies a caught error into a `SemanticLogSearchResult` and logs it at the right level. */
export function toFailureResult(
  error: unknown,
  { logger, target, phase }: { logger: Logger; target: string; phase: SearchPhase }
): SemanticLogSearchResult {
  const { timeoutReason, timeoutText, failedText } = PHASE_FAILURE[phase];

  const esErrorType = elasticsearchErrorType(error);
  const diagnostics: SearchDiagnostics = {
    phase,
    ...(esErrorType ? { elasticsearchErrorType: esErrorType } : {}),
  };

  if (isCancellationError(error)) {
    logger.debug(`Semantic log search cancelled for target "${target}" during ${phase}`);
    return errorResult(ERROR_REASON.CANCELLED, diagnostics);
  }
  if (isTimeoutError(error) || isInferenceTimeoutError(error)) {
    logger.warn(`Semantic log search ${timeoutText} for target "${target}"`);
    return errorResult(timeoutReason, diagnostics);
  }
  // The message goes to the log only. `diagnostics` carries the phase and Elasticsearch's own error
  // type, which is what a caller without log access needs to tell a query problem from a timeout.
  const message = error instanceof Error ? error.message : String(error);
  logger.warn(`Semantic log search ${failedText} for target "${target}": ${message}`);
  return errorResult(ERROR_REASON.EXECUTION, diagnostics);
}
