/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, omit } from 'lodash';
import type { CaseUI } from './types';
import type { ServerError } from '../types';

const REBASEABLE_STATUS_CODES = new Set([409, 429]);
const SYSTEM_MANAGED_CASE_FIELDS = ['comments', 'incrementalId', 'updatedAt', 'version'] as const;

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

export const isRetryableCaseConflictError = (error: unknown): boolean => {
  const statusCode = getErrorStatusCode(error);

  return statusCode != null && REBASEABLE_STATUS_CODES.has(statusCode);
};

const normalizeCaseForRebase = (theCase: CaseWithOptionalComments) =>
  omit(theCase, SYSTEM_MANAGED_CASE_FIELDS);

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
