/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { DEFAULT_KI_PAGE_SIZE } from '../../../common/constants';
import type { KiTypeCount } from '../../../common/http_api/ai_indices';
import type { ListKisResponse } from '../../../common/http_api/knowledge_indicators';
import { listKis } from '../api/knowledge_indicators';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

interface UseKiListArgs {
  aiIndexId: string | undefined;
  size?: number;
  type?: string;
  enabled?: boolean;
}

interface UseKiListSummary {
  total: number;
  countsByType: KiTypeCount[];
}

interface UseKiListResult {
  kis: ListKisResponse['kis'];
  total: number;
  summary: UseKiListSummary;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | undefined;
  refetch: () => void;
}

export const useKiList = ({
  aiIndexId,
  size = DEFAULT_KI_PAGE_SIZE,
  type,
  enabled = true,
}: UseKiListArgs): UseKiListResult => {
  const {
    services: { http },
  } = useKibana();

  const { data, isLoading, isFetching, error, refetch } = useQuery<ListKisResponse, Error>({
    queryKey: contextEngineQueryKeys.aiIndex.kiList(aiIndexId ?? '', size, type),
    queryFn: ({ signal }) => {
      if (!aiIndexId) {
        throw new Error('AI index id is required');
      }
      return listKis(http, {
        aiIndexId,
        size,
        ...(type !== undefined ? { type } : {}),
        signal,
      });
    },
    enabled: enabled && aiIndexId !== undefined,
    keepPreviousData: true,
  });

  return {
    kis: data?.kis ?? [],
    total: data?.total ?? 0,
    summary: {
      total: data?.summary?.total ?? data?.total ?? 0,
      countsByType: data?.summary?.counts_by_type ?? [],
    },
    isLoading,
    isFetching,
    error: error ?? undefined,
    refetch,
  };
};
