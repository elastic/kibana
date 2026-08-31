/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPath } from '@kbn/core-http-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import {
  AI_INDEX_INTERNAL_API_VERSION,
  aiIndexKiByIdPath,
  aiIndexKiListPath,
} from '../../../common/constants';
import type { GetKiResponse, ListKisResponse } from '../../../common/http_api/knowledge_indicators';

interface ListKisArgs {
  aiIndexId: string;
  size?: number;
  type?: string;
  signal?: AbortSignal;
}

export const listKis = (
  http: HttpStart,
  { aiIndexId, size, type, signal }: ListKisArgs
): Promise<ListKisResponse> =>
  http.get<ListKisResponse>(buildPath(aiIndexKiListPath, { aiIndexId }), {
    version: AI_INDEX_INTERNAL_API_VERSION,
    query: {
      ...(size !== undefined ? { size } : {}),
      ...(type !== undefined ? { type } : {}),
    },
    ...(signal ? { signal } : {}),
  });

interface GetKiArgs {
  aiIndexId: string;
  kiId: string;
  index: string;
  signal?: AbortSignal;
}

export const getKi = (
  http: HttpStart,
  { aiIndexId, kiId, index, signal }: GetKiArgs
): Promise<GetKiResponse> =>
  http.get<GetKiResponse>(buildPath(aiIndexKiByIdPath, { aiIndexId, kiId }), {
    version: AI_INDEX_INTERNAL_API_VERSION,
    query: { index },
    ...(signal ? { signal } : {}),
  });
