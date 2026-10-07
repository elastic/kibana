/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { GetKiResponse } from '../../../common/http_api/knowledge_indicators';
import { KI_LIFECYCLE_STATUSES } from '../../../common/step_types/ki';
import { getKi } from '../api/knowledge_indicators';
import { contextEngineQueryKeys } from './query_keys';

export type ViewKiQueryKey = ReturnType<typeof contextEngineQueryKeys.aiIndex.ki>;

export const VIEW_KI_QUERY_STALE_TIME_MS = 30_000;

export interface KiQueryArgs {
  aiIndexId: string;
  kiId: string;
  index: string;
}

export const createKiQueryOptions = (
  http: HttpStart,
  { aiIndexId, kiId, index }: KiQueryArgs
): {
  queryKey: ViewKiQueryKey;
  queryFn: (context: { signal?: AbortSignal }) => Promise<GetKiResponse>;
  staleTime: number;
} => ({
  queryKey: contextEngineQueryKeys.aiIndex.viewKi(aiIndexId, index, kiId, KI_LIFECYCLE_STATUSES),
  queryFn: ({ signal }) =>
    getKi(http, {
      aiIndexId,
      kiId,
      index,
      lifecycleStatus: [...KI_LIFECYCLE_STATUSES],
      signal,
    }),
  staleTime: VIEW_KI_QUERY_STALE_TIME_MS,
});
