/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import { buildPath } from '@kbn/core-http-browser';
import {
  DEFAULT_IMPROVEMENTS_PAGE_SIZE,
  IMPROVEMENTS_INTERNAL_API_VERSION,
  aiIndexFeedbackAnalysisRunPath,
  aiIndexImprovementsPath,
  improvementApprovePath,
  improvementRejectPath,
} from '../../../common/constants';
import type {
  ImprovementStatus,
  ListImprovementsResponse,
  MutateImprovementResponse,
  RunFeedbackAnalysisResponse,
} from '../../../common/http_api/improvements';

interface ListImprovementsArgs {
  aiIndexId: string;
  /** Omitted lets the server default to the improvements still awaiting a decision. */
  status?: ImprovementStatus[];
  from?: number;
  size?: number;
  signal?: AbortSignal;
}

/** Fetches an AI index's improvements (paginated, newest first). */
export const listImprovements = (
  http: HttpStart,
  {
    aiIndexId,
    status,
    from = 0,
    size = DEFAULT_IMPROVEMENTS_PAGE_SIZE,
    signal,
  }: ListImprovementsArgs
): Promise<ListImprovementsResponse> =>
  http.get<ListImprovementsResponse>(buildPath(aiIndexImprovementsPath, { aiIndexId }), {
    version: IMPROVEMENTS_INTERNAL_API_VERSION,
    query: { ...(status ? { status } : {}), from, size },
    ...(signal ? { signal } : {}),
  });

interface DecideImprovementArgs {
  aiIndexId: string;
  improvementId: string;
}

/** Applies the proposed change under the caller's own privileges, then records it as applied. */
export const approveImprovement = (
  http: HttpStart,
  { aiIndexId, improvementId }: DecideImprovementArgs
): Promise<MutateImprovementResponse> =>
  http.post<MutateImprovementResponse>(
    buildPath(improvementApprovePath, { aiIndexId, improvementId }),
    { version: IMPROVEMENTS_INTERNAL_API_VERSION }
  );

/** Records the improvement as rejected, optionally with the reviewer's reason. */
export const rejectImprovement = (
  http: HttpStart,
  { aiIndexId, improvementId, reason }: DecideImprovementArgs & { reason?: string }
): Promise<MutateImprovementResponse> =>
  http.post<MutateImprovementResponse>(
    buildPath(improvementRejectPath, { aiIndexId, improvementId }),
    {
      version: IMPROVEMENTS_INTERNAL_API_VERSION,
      body: JSON.stringify(reason ? { reason } : {}),
    }
  );

/** Starts one analysis run off-schedule. */
export const runFeedbackAnalysis = (
  http: HttpStart,
  { aiIndexId }: { aiIndexId: string }
): Promise<RunFeedbackAnalysisResponse> =>
  http.post<RunFeedbackAnalysisResponse>(buildPath(aiIndexFeedbackAnalysisRunPath, { aiIndexId }), {
    version: IMPROVEMENTS_INTERNAL_API_VERSION,
  });
