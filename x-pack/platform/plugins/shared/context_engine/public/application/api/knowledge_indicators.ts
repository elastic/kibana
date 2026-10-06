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
  AI_INDEX_KI_FORGET_PATH,
  AI_INDEX_KI_LIST_PATH,
  AI_INDEX_KI_RESTORE_PATH,
} from '../../../common/constants';
import type {
  ForgetMemoryKiResponse,
  GetKiResponse,
  ListKisResponse,
  RestoreMemoryKiResponse,
  UpdateKiRequestBody,
  UpdateKiResponse,
} from '../../../common/http_api/knowledge_indicators';
import { formatKiListLifecycleStatusesQuery } from '../../../common/ki_list_lifecycle';
import type { KiLifecycleStatus, KiPartialFields } from '../../../common/step_types/ki';

interface ListKisArgs {
  aiIndexId: string;
  size?: number;
  type?: string;
  lifecycleStatuses?: KiLifecycleStatus[];
  signal?: AbortSignal;
}

export const listKis = (
  http: HttpStart,
  { aiIndexId, size, type, lifecycleStatuses, signal }: ListKisArgs
): Promise<ListKisResponse> =>
  http.get<ListKisResponse>(buildPath(AI_INDEX_KI_LIST_PATH, { aiIndexId }), {
    version: AI_INDEX_INTERNAL_API_VERSION,
    query: {
      ...(size !== undefined ? { size } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(lifecycleStatuses !== undefined
        ? { lifecycle_status: formatKiListLifecycleStatusesQuery(lifecycleStatuses) }
        : {}),
    },
    ...(signal ? { signal } : {}),
  });

interface GetKiArgs {
  aiIndexId: string;
  kiId: string;
  index: string;
  lifecycleStatuses?: KiLifecycleStatus[];
  signal?: AbortSignal;
}

export const getKi = (
  http: HttpStart,
  { aiIndexId, kiId, index, lifecycleStatuses, signal }: GetKiArgs
): Promise<GetKiResponse> =>
  http.get<GetKiResponse>(buildPath(AI_INDEX_KI_BY_ID_PATH, { aiIndexId, kiId }), {
    version: AI_INDEX_INTERNAL_API_VERSION,
    query: {
      index,
      ...(lifecycleStatuses !== undefined
        ? { lifecycle_status: formatKiListLifecycleStatusesQuery(lifecycleStatuses) }
        : {}),
    },
    ...(signal ? { signal } : {}),
  });

interface UpdateKiArgs {
  aiIndexId: string;
  kiId: string;
  index: string;
  ki: KiPartialFields;
}

export const updateKi = (
  http: HttpStart,
  { aiIndexId, kiId, index, ki }: UpdateKiArgs
): Promise<UpdateKiResponse> => {
  const body: UpdateKiRequestBody = { ki };
  return http.patch<UpdateKiResponse>(buildPath(AI_INDEX_KI_BY_ID_PATH, { aiIndexId, kiId }), {
    version: AI_INDEX_INTERNAL_API_VERSION,
    query: { index },
    body: JSON.stringify(body),
  });
};

interface ForgetMemoryKiArgs {
  aiIndexId: string;
  kiId: string;
  index: string;
}

export const forgetMemoryKi = (
  http: HttpStart,
  { aiIndexId, kiId, index }: ForgetMemoryKiArgs
): Promise<ForgetMemoryKiResponse> =>
  http.post<ForgetMemoryKiResponse>(buildPath(AI_INDEX_KI_FORGET_PATH, { aiIndexId, kiId }), {
    version: AI_INDEX_INTERNAL_API_VERSION,
    query: { index },
  });

export const restoreMemoryKi = (
  http: HttpStart,
  { aiIndexId, kiId, index }: ForgetMemoryKiArgs
): Promise<RestoreMemoryKiResponse> =>
  http.post<RestoreMemoryKiResponse>(buildPath(AI_INDEX_KI_RESTORE_PATH, { aiIndexId, kiId }), {
    version: AI_INDEX_INTERNAL_API_VERSION,
    query: { index },
  });
