/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { AiIndexHttpItem, ListAiIndexResponse } from '../../../common/http_api/ai_indices';
import { listAiIndices } from '../api/ai_indices';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

interface UseListAiIndicesResult {
  aiIndices: AiIndexHttpItem[];
  isLoading: boolean;
  error: Error | undefined;
}

export const useListAiIndices = (): UseListAiIndicesResult => {
  const {
    services: { http },
  } = useKibana();

  const { data, isLoading, error } = useQuery<ListAiIndexResponse, Error>({
    queryKey: contextEngineQueryKeys.aiIndex.list(),
    queryFn: ({ signal }) => listAiIndices(http, { signal }),
  });

  return { aiIndices: data?.ai_indices ?? [], isLoading, error: error ?? undefined };
};
