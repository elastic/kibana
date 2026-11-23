/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import { AI_INDEX_API_VERSION, AI_INDEX_QUERY_PATH } from '../../../common/constants';
import type {
  QueryAiIndicesRequest,
  QueryAiIndicesResponse,
} from '../../../common/http_api/ai_indices';

interface QueryAiIndicesArgs {
  signal?: AbortSignal;
}

export const queryAiIndices = (
  http: HttpStart,
  body: QueryAiIndicesRequest,
  { signal }: QueryAiIndicesArgs = {}
): Promise<QueryAiIndicesResponse> =>
  http.post<QueryAiIndicesResponse>(AI_INDEX_QUERY_PATH, {
    version: AI_INDEX_API_VERSION,
    body: JSON.stringify(body),
    ...(signal ? { signal } : {}),
  });
