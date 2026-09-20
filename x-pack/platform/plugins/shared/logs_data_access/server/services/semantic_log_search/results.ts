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
  SEARCH_STATUS,
  type ErrorReason,
  type UnavailableReason,
} from '../../../common/services/semantic_log_search/constants';
import type { SemanticLogSearchResult } from '../../../common/services/semantic_log_search/types';

/** Builds an `error` result without repeating the status literal at every call site. */
export const errorResult = (reason: ErrorReason): SemanticLogSearchResult => ({
  status: SEARCH_STATUS.ERROR,
  reason,
});

/** Builds an `unavailable` result without repeating the status literal at every call site. */
export const unavailableResult = (reason: UnavailableReason): SemanticLogSearchResult => ({
  status: SEARCH_STATUS.UNAVAILABLE,
  reason,
});

/** Which stage of the search pipeline failed. Only `PROBE` treats a timeout as actionable. */
export const SEARCH_PHASE = {
  CAPABILITIES: 'capabilities',
  PROBE: 'probe',
  SEARCH: 'search',
} as const;

type SearchPhase = (typeof SEARCH_PHASE)[keyof typeof SEARCH_PHASE];

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

// A probe timeout is actionable — the scope is too broad to categorize within the budget and a
// narrower one may succeed. A timeout in any other phase is not.
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
};

/** Classifies a caught error into a `SemanticLogSearchResult` and logs it at the right level. */
export function toFailureResult(
  error: unknown,
  { logger, target, phase }: { logger: Logger; target: string; phase: SearchPhase }
): SemanticLogSearchResult {
  const { timeoutReason, timeoutText, failedText } = PHASE_FAILURE[phase];

  if (isCancellationError(error)) {
    logger.debug(`Semantic log search cancelled for target "${target}" during ${phase}`);
    return errorResult(ERROR_REASON.CANCELLED);
  }
  if (isTimeoutError(error)) {
    logger.warn(`Semantic log search ${timeoutText} for target "${target}"`);
    return errorResult(timeoutReason);
  }
  const message = error instanceof Error ? error.message : String(error);
  logger.warn(`Semantic log search ${failedText} for target "${target}": ${message}`);
  return errorResult(ERROR_REASON.EXECUTION);
}
