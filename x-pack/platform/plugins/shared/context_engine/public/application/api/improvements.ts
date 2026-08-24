/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPath } from '@kbn/core-http-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import {
  DEFAULT_IMPROVEMENTS_PAGE_SIZE,
  IMPROVEMENTS_INTERNAL_API_VERSION,
  aiIndexImprovementsPath,
  improvementApprovePath,
  improvementRejectPath,
} from '../../../common/constants';
import type {
  ImprovementStatus,
  ListImprovementsResponse,
  MutateImprovementResponse,
} from '../../../common/http_api/improvements';

interface ListImprovementsArgs {
  aiIndexId: string;
  /** Omitted means the route's default: the statuses still awaiting the user. */
  status?: readonly ImprovementStatus[];
  from?: number;
  size?: number;
  signal?: AbortSignal;
}

/** Fetches an AI index's improvement suggestions, newest first. */
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
    query: { from, size, ...(status ? { status: [...status] } : {}) },
    ...(signal ? { signal } : {}),
  });

interface MutateImprovementArgs {
  improvementId: string;
}

/** Applies a suggestion: writes the KI or workflow change it describes. */
export const approveImprovement = (
  http: HttpStart,
  { improvementId }: MutateImprovementArgs
): Promise<MutateImprovementResponse> =>
  http.post<MutateImprovementResponse>(buildPath(improvementApprovePath, { improvementId }), {
    version: IMPROVEMENTS_INTERNAL_API_VERSION,
  });

/** Refuses a suggestion. It stays recorded so later runs do not propose it again. */
export const rejectImprovement = (
  http: HttpStart,
  { improvementId }: MutateImprovementArgs
): Promise<MutateImprovementResponse> =>
  http.post<MutateImprovementResponse>(buildPath(improvementRejectPath, { improvementId }), {
    version: IMPROVEMENTS_INTERNAL_API_VERSION,
  });
