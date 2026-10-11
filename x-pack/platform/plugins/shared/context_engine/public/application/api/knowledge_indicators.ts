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
  AI_INDEX_KI_BY_ID_PATH,
  AI_INDEX_KI_LIST_PATH,
} from '../../../common/constants';
import type { KiLifecycleStatus } from '../../../common/step_types/ki';
import type { GetKiResponse, ListKisResponse } from '../../../common/http_api/knowledge_indicators';

interface ListKisArgs {
  aiIndexId: string;
  size?: number;
  type?: string;
  lifecycleStatus?: KiLifecycleStatus[];
  signal?: AbortSignal;
}

export const listKis = (
  http: HttpStart,
  { aiIndexId, size, type, lifecycleStatus, signal }: ListKisArgs
): Promise<ListKisResponse> =>
  http.get<ListKisResponse>(buildPath(AI_INDEX_KI_LIST_PATH, { aiIndexId }), {
    version: AI_INDEX_INTERNAL_API_VERSION,
    query: {
      ...(size !== undefined ? { size } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(lifecycleStatus !== undefined ? { lifecycle_status: lifecycleStatus } : {}),
    },
    ...(signal ? { signal } : {}),
  });

interface GetKiArgs {
  aiIndexId: string;
  kiId: string;
  index: string;
  lifecycleStatus?: KiLifecycleStatus[];
  signal?: AbortSignal;
}

export const getKi = (
  http: HttpStart,
  { aiIndexId, kiId, index, lifecycleStatus, signal }: GetKiArgs
): Promise<GetKiResponse> =>
  http.get<GetKiResponse>(buildPath(AI_INDEX_KI_BY_ID_PATH, { aiIndexId, kiId }), {
    version: AI_INDEX_INTERNAL_API_VERSION,
    query: {
      index,
      ...(lifecycleStatus !== undefined ? { lifecycle_status: lifecycleStatus } : {}),
    },
    ...(signal ? { signal } : {}),
  });
