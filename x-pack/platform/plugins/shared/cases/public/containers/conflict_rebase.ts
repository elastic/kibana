/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, omit } from 'lodash';
import type { CaseUI } from './types';
import type { ServerError } from '../types';

/**
 * Fields that the server can mutate without any user action:
 * - `incrementalId`: assigned by a background task that runs periodically and writes a
 *   sequential ID to cases that don't have one yet. This bumps the ES document version,
 *   which can cause a 409 on a concurrent PATCH even though no human changed the case.
 * - `version`: the ES-level optimistic-concurrency token — always differs between stale and latest.
 * - `updatedAt`: updated by the server on every write, including the background task.
 * These fields are excluded from conflict detection so only genuine user-driven changes
 * cause a retry to be rejected.
 */
const SYSTEM_MANAGED_CASE_FIELDS = ['incrementalId', 'updatedAt', 'version'] as const;

export type CaseWithOptionalComments = Omit<CaseUI, 'comments'> & {
  comments?: CaseUI['comments'];
};

export type CaseConflictRebaseDecision = 'only_system_drift' | 'conflicting_case_change';

interface RebaseCaseMutationOnConflictParams<TRequest, TResponse> {
  request: TRequest;
  staleCases: CaseWithOptionalComments[];
  executeRequest: (request: TRequest) => Promise<TResponse>;
  fetchLatestCase: (caseId: string) => Promise<CaseWithOptionalComments>;
  buildRetryRequest: (args: {
    request: TRequest;
    latestCases: Map<string, CaseWithOptionalComments>;
  }) => TRequest;
}

const getErrorStatusCode = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error == null) {
    return;
  }

  const typedError = error as Partial<ServerError> & {
    response?: { status?: number };
    body?: { statusCode?: number };
  };

  return typedError.body?.statusCode ?? typedError.response?.status;
};

/**
 * Only "409 - Conflict" is safe to retry: it means an optimistic-concurrency mismatch that
 * __may__ have been caused by a benign server-side write. Any other status code represents a
 * genuine failure (validation error, auth problem, etc.) that retrying won't fix.
 */
export const isRetryableCaseConflictError = (error: unknown): boolean => {
  const statusCode = getErrorStatusCode(error);

  return statusCode != null && statusCode === 409;
};

/**
 * Strip system-managed fields before comparing stale vs. latest so that only
 * user-owned content is considered. If the stripped objects are equal, the case
 * was not changed by a human and it is safe to retry.
 */
const normalizeCaseForRebase = (theCase: CaseWithOptionalComments) =>
  omit(theCase, SYSTEM_MANAGED_CASE_FIELDS);
/**
 * Decides whether a 409 can be safely retried.
 * Returns 'only_system_drift'        → the stale and latest cases differ only in
 *                                       system-managed fields; retry is safe.
 * Returns 'conflicting_case_change'  → a user-owned field changed between the
 *                                       original request and now; the caller must
 *                                       surface the conflict to the user.
 */
export const getCaseConflictRebaseDecision = ({
  staleCases,
  latestCases,
}: {
  staleCases: CaseWithOptionalComments[];
  latestCases: CaseWithOptionalComments[];
}): CaseConflictRebaseDecision => {
  if (staleCases.length !== latestCases.length) {
    return 'conflicting_case_change';
  }

  const latestCasesById = new Map(latestCases.map((theCase) => [theCase.id, theCase]));

  for (const staleCase of staleCases) {
    const latestCase = latestCasesById.get(staleCase.id);

    if (latestCase == null) {
      return 'conflicting_case_change';
    }

    if (!isEqual(normalizeCaseForRebase(staleCase), normalizeCaseForRebase(latestCase))) {
      return 'conflicting_case_change';
    }
  }

  return 'only_system_drift';
};

/**
 * Executes a case mutation and transparently retries once if the server returns a
 * 409 Conflict that was caused solely by a server-side system write (e.g. the
 * `incrementalId` background task bumping the ES document version).
 *
 * Flow:
 *  1. Attempt the mutation with the original request.
 *  2. On 409: fetch the latest version of every affected case.
 *  3. Compare stale vs. latest (ignoring system-managed fields).
 *     - If only system fields changed → rebuild the request with fresh version
 *       tokens and retry. The user's intended change is preserved.
 *     - If any user-owned field changed → a real concurrent edit occurred;
 *       re-throw the original error so the caller can inform the user.
 *  4. Any non-409 error is re-thrown immediately without a retry attempt.
 */
export const rebaseCaseMutationOnConflict = async <TRequest, TResponse>({
  request,
  staleCases,
  executeRequest,
  fetchLatestCase,
  buildRetryRequest,
}: RebaseCaseMutationOnConflictParams<TRequest, TResponse>): Promise<TResponse> => {
  try {
    return await executeRequest(request);
  } catch (error) {
    if (!isRetryableCaseConflictError(error) || staleCases.length === 0) {
      throw error;
    }

    const latestCases = await Promise.all(staleCases.map(({ id }) => fetchLatestCase(id)));
    const rebaseDecision = getCaseConflictRebaseDecision({ staleCases, latestCases });

    if (rebaseDecision !== 'only_system_drift') {
      throw error;
    }

    return executeRequest(
      buildRetryRequest({
        request,
        latestCases: new Map(latestCases.map((theCase) => [theCase.id, theCase])),
      })
    );
  }
};
