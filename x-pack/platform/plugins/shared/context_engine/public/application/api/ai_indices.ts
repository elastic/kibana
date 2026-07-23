/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPath } from '@kbn/core-http-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import { AI_INDEX_API_VERSION, aiIndexByIdPath, aiIndexPath } from '../../../common/constants';
import type {
  AiIndexProperties,
  GetAiIndexResponse,
  ListAiIndexResponse,
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

interface PutAiIndexArgs {
  aiIndexId: string;
  properties: AiIndexProperties;
}

/**
 * Upserts the full AI index record.
 */
export const putAiIndex = (
  http: HttpStart,
  { aiIndexId, properties }: PutAiIndexArgs
): Promise<PutAiIndexResponse> =>
  http.put<PutAiIndexResponse>(buildPath(aiIndexByIdPath, { aiIndexId }), {
    version: AI_INDEX_API_VERSION,
    body: JSON.stringify(properties),
  });
