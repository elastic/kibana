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
  AI_INDEX_INTERNAL_API_VERSION,
  aiIndexByIdPath,
  aiIndexFeedbackAnalysisPath,
  aiIndexPath,
} from '../../../common/constants';
import type {
  AiIndexFeedbackAnalysis,
  AiIndexProperties,
  CreateAiIndexResponse,
  GetAiIndexResponse,
  ListAiIndexResponse,
  PutAiIndexFeedbackAnalysisResponse,
  PutAiIndexResponse,
} from '../../../common/http_api/ai_indices';

interface ListAiIndicesArgs {
  signal?: AbortSignal;
}

export const listAiIndices = (
  http: HttpStart,
  { signal }: ListAiIndicesArgs = {}
): Promise<ListAiIndexResponse> =>
  http.get<ListAiIndexResponse>(aiIndexPath, {
    version: AI_INDEX_API_VERSION,
    ...(signal ? { signal } : {}),
  });

interface GetAiIndexArgs {
  aiIndexId: string;
  signal?: AbortSignal;
}

/**
 * Fetches a single AI index by id.
 */
export const getAiIndex = (
  http: HttpStart,
  { aiIndexId, signal }: GetAiIndexArgs
): Promise<GetAiIndexResponse> =>
  http.get<GetAiIndexResponse>(buildPath(aiIndexByIdPath, { aiIndexId }), {
    version: AI_INDEX_API_VERSION,
    ...(signal ? { signal } : {}),
  });

interface CreateAiIndexArgs {
  aiIndexId: string;
  properties: AiIndexProperties;
}

/**
 * Creates a new AI index. Fails with a 409 if the id already exists.
 */
export const createAiIndex = (
  http: HttpStart,
  { aiIndexId, properties }: CreateAiIndexArgs
): Promise<CreateAiIndexResponse> =>
  http.post<CreateAiIndexResponse>(aiIndexPath, {
    version: AI_INDEX_API_VERSION,
    body: JSON.stringify({ id: aiIndexId, ...properties }),
  });

interface PutAiIndexArgs {
  aiIndexId: string;
  properties: AiIndexProperties;
}

/**
 * Creates or fully replaces an AI index record.
 */
export const putAiIndex = (
  http: HttpStart,
  { aiIndexId, properties }: PutAiIndexArgs
): Promise<PutAiIndexResponse> =>
  http.put<PutAiIndexResponse>(buildPath(aiIndexByIdPath, { aiIndexId }), {
    version: AI_INDEX_API_VERSION,
    body: JSON.stringify(properties),
  });

interface PutAiIndexFeedbackAnalysisArgs {
  aiIndexId: string;
  feedbackAnalysis: AiIndexFeedbackAnalysis;
}

/**
 * Replaces the feedback analysis configuration without touching the rest of the
 * AI index. Unlike {@link putAiIndex} this also works on managed AI indices.
 */
export const putAiIndexFeedbackAnalysis = (
  http: HttpStart,
  { aiIndexId, feedbackAnalysis }: PutAiIndexFeedbackAnalysisArgs
): Promise<PutAiIndexFeedbackAnalysisResponse> =>
  http.put<PutAiIndexFeedbackAnalysisResponse>(
    buildPath(aiIndexFeedbackAnalysisPath, { aiIndexId }),
    {
      version: AI_INDEX_INTERNAL_API_VERSION,
      body: JSON.stringify(feedbackAnalysis),
    }
  );
