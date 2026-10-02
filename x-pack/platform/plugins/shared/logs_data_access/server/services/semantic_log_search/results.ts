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

/** Creates a search error result with optional diagnostics. */
export const errorResult = (
  reason: ErrorReason,
  diagnostics?: SearchDiagnostics
): SemanticLogSearchResult => ({
  status: SEARCH_STATUS.ERROR,
  reason,
  ...(diagnostics ? { diagnostics } : {}),
});

/** Creates a result indicating that semantic log search is unavailable. */
export const unavailableResult = (reason: UnavailableReason): SemanticLogSearchResult => ({
  status: SEARCH_STATUS.UNAVAILABLE,
  reason,
});

/** Checks whether an error represents request cancellation. */
export function isCancellationError(error: unknown): boolean {
  return (
    isRequestAbortedError(error) ||
    (error instanceof Error &&
      (error.name === 'AbortError' || error.name === 'RequestAbortedError'))
  );
}

function isTimeoutError(error: unknown): boolean {
  return (
    error instanceof errors.TimeoutError ||
    (error instanceof Error && error.name === 'TimeoutError')
  );
}

const MODEL_DEPLOYMENT_TIMEOUT_TYPE = 'model_deployment_timeout_exception';
const INFERENCE_TIMEOUT_TYPE = 'timeout_exception';

function getResponseErrorType(error: errors.ResponseError): string | undefined {
  const type = error.body?.error?.type;
  return typeof type === 'string' ? type : undefined;
}

// Inference timeouts can arrive as response errors rather than client timeout errors.
function isInferenceTimeoutError(error: unknown): boolean {
  if (error instanceof errors.ResponseError) {
    const type = getResponseErrorType(error);
    if (type === MODEL_DEPLOYMENT_TIMEOUT_TYPE || type === INFERENCE_TIMEOUT_TYPE) return true;
    if (error.statusCode === 408) return true;
  }
  return error instanceof Error && error.message.includes(MODEL_DEPLOYMENT_TIMEOUT_TYPE);
}

function elasticsearchErrorType(error: unknown): string | undefined {
  if (error instanceof errors.ResponseError) {
    const type = getResponseErrorType(error);
    if (type) return type;
  }
  return error instanceof Error ? error.name : undefined;
}

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

/** Logs a search failure and returns its reason and diagnostics for the given phase. */
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
  // Keep error messages in logs; return only the phase and error type in diagnostics.
  const message = error instanceof Error ? error.message : String(error);
  logger.warn(`Semantic log search ${failedText} for target "${target}": ${message}`);
  return errorResult(ERROR_REASON.EXECUTION, diagnostics);
}
