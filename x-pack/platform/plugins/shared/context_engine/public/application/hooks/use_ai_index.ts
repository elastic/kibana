/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import { getAiIndex } from '../api/ai_indices';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

interface UseAiIndexResult {
  aiIndex: GetAiIndexResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
  refetch: () => void;
}

/**
 * Fetches a single AI index by id (`GET /api/context_engine/ai_index/{id}`).
 * Re-fetches whenever the id changes; `refetch` forces a fresh fetch, e.g.
 * after the sources are edited.
 */
export const useAiIndex = (id: string): UseAiIndexResult => {
  const {
    services: { http },
  } = useKibana();

  const { data, isLoading, error, refetch } = useQuery<GetAiIndexResponse, Error>({
    queryKey: contextEngineQueryKeys.aiIndex.detail(id),
    queryFn: ({ signal }) => getAiIndex(http, { aiIndexId: id, signal }),
  });

  return { aiIndex: data, isLoading, error: error ?? undefined, refetch };
};
