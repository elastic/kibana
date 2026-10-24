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
  AI_INDEX_KI_RESTORE_PATH,
} from '../../../common/constants';
import type { KiLifecycleStatus } from '../../../common/step_types/ki';
import type {
  DeleteKiResponse,
  GetKiResponse,
  ListKisResponse,
  RestoreKiResponse,
  UpdateKiBody,
  UpdateKiResponse,
} from '../../../common/http_api/knowledge_indicators';

interface ListKisArgs {
  aiIndexId: string;
  size?: number;
  type?: string;
  query?: string;
  lifecycleStatus?: KiLifecycleStatus[];
  signal?: AbortSignal;
}

export const listKis = (
  http: HttpStart,
  { aiIndexId, size, type, query, lifecycleStatus, signal }: ListKisArgs
): Promise<ListKisResponse> =>
  http.get<ListKisResponse>(buildPath(AI_INDEX_KI_LIST_PATH, { aiIndexId }), {
    version: AI_INDEX_INTERNAL_API_VERSION,
    query: {
      ...(size !== undefined ? { size } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(query !== undefined ? { query } : {}),
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

interface UpdateKiArgs {
  aiIndexId: string;
  kiId: string;
  index: string;
  content: string;
  signal?: AbortSignal;
}

export const updateKi = (
  http: HttpStart,
  { aiIndexId, kiId, index, content, signal }: UpdateKiArgs
): Promise<UpdateKiResponse> =>
  http.patch<UpdateKiResponse>(buildPath(AI_INDEX_KI_BY_ID_PATH, { aiIndexId, kiId }), {
    version: AI_INDEX_INTERNAL_API_VERSION,
    query: { index },
    body: JSON.stringify({ ki: { content } } satisfies UpdateKiBody),
    ...(signal ? { signal } : {}),
  });

interface DeleteKiArgs {
  aiIndexId: string;
  kiId: string;
  index: string;
  signal?: AbortSignal;
}

export const deleteKi = (
  http: HttpStart,
  { aiIndexId, kiId, index, signal }: DeleteKiArgs
): Promise<DeleteKiResponse> =>
  http.delete<DeleteKiResponse>(buildPath(AI_INDEX_KI_BY_ID_PATH, { aiIndexId, kiId }), {
    version: AI_INDEX_INTERNAL_API_VERSION,
    query: { index },
    ...(signal ? { signal } : {}),
  });

interface RestoreKiArgs {
  aiIndexId: string;
  kiId: string;
  index: string;
  signal?: AbortSignal;
}

export const restoreKi = (
  http: HttpStart,
  { aiIndexId, kiId, index, signal }: RestoreKiArgs
): Promise<RestoreKiResponse> =>
  http.post<RestoreKiResponse>(buildPath(AI_INDEX_KI_RESTORE_PATH, { aiIndexId, kiId }), {
    version: AI_INDEX_INTERNAL_API_VERSION,
    query: { index },
    ...(signal ? { signal } : {}),
  });
