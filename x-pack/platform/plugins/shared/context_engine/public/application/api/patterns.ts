/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPath } from '@kbn/core-http-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import {
  AI_INDEX_API_VERSION,
  aiIndexPatternCasesPath,
  aiIndexPatternImprovementsPath,
  aiIndexPatternsPath,
  aiIndexSelfImprovementPath,
  traceIndicesPath,
} from '../../../common/constants';
import type {
  ListImprovementsResponse,
  ListPatternCasesResponse,
  ListPatternsResponse,
  ListTraceIndicesResponse,
  SelfImprovementResponse,
} from '../../../common/http_api/patterns';

export const listPatterns = (
  http: HttpStart,
  { aiIndexId, signal }: { aiIndexId: string; signal?: AbortSignal }
): Promise<ListPatternsResponse> =>
  http.get<ListPatternsResponse>(buildPath(aiIndexPatternsPath, { aiIndexId }), {
    version: AI_INDEX_API_VERSION,
    ...(signal ? { signal } : {}),
  });

export const listPatternCases = (
  http: HttpStart,
  { aiIndexId, patternKey, signal }: { aiIndexId: string; patternKey: string; signal?: AbortSignal }
): Promise<ListPatternCasesResponse> =>
  http.get<ListPatternCasesResponse>(buildPath(aiIndexPatternCasesPath, { aiIndexId }), {
    version: AI_INDEX_API_VERSION,
    query: { pattern_key: patternKey },
    ...(signal ? { signal } : {}),
  });

export const listImprovements = (
  http: HttpStart,
  { aiIndexId, patternKey, signal }: { aiIndexId: string; patternKey: string; signal?: AbortSignal }
): Promise<ListImprovementsResponse> =>
  http.get<ListImprovementsResponse>(buildPath(aiIndexPatternImprovementsPath, { aiIndexId }), {
    version: AI_INDEX_API_VERSION,
    query: { pattern_key: patternKey },
    ...(signal ? { signal } : {}),
  });

export const listTraceIndices = (
  http: HttpStart,
  { signal }: { signal?: AbortSignal } = {}
): Promise<ListTraceIndicesResponse> =>
  http.get<ListTraceIndicesResponse>(traceIndicesPath, {
    version: AI_INDEX_API_VERSION,
    ...(signal ? { signal } : {}),
  });

export const enableSelfImprovement = (
  http: HttpStart,
  { aiIndexId, tracesIndex }: { aiIndexId: string; tracesIndex: string }
): Promise<SelfImprovementResponse> =>
  http.post<SelfImprovementResponse>(buildPath(aiIndexSelfImprovementPath, { aiIndexId }), {
    version: AI_INDEX_API_VERSION,
    body: JSON.stringify({ traces_index: tracesIndex }),
  });

export const disableSelfImprovement = (
  http: HttpStart,
  { aiIndexId }: { aiIndexId: string }
): Promise<SelfImprovementResponse> =>
  http.delete<SelfImprovementResponse>(buildPath(aiIndexSelfImprovementPath, { aiIndexId }), {
    version: AI_INDEX_API_VERSION,
  });
