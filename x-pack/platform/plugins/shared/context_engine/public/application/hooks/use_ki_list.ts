/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { DEFAULT_KI_PAGE_SIZE } from '../../../common/constants';
import type { ListKisResponse } from '../../../common/http_api/knowledge_indicators';
import { listKis } from '../api/knowledge_indicators';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

interface UseKiListArgs {
  aiIndexId: string | undefined;
  from?: number;
  size?: number;
  type?: string;
  enabled?: boolean;
}

interface UseKiListResult {
  kis: ListKisResponse['kis'];
  total: number;
  totalAll: number;
  countsByType: ListKisResponse['counts_by_type'];
  isLoading: boolean;
  error: Error | undefined;
  refetch: () => void;
}

export const useKiList = ({
  aiIndexId,
  from = 0,
  size = DEFAULT_KI_PAGE_SIZE,
  type,
  enabled = true,
}: UseKiListArgs): UseKiListResult => {
  const {
    services: { http },
  } = useKibana();

  const { data, isLoading, error, refetch } = useQuery<ListKisResponse, Error>({
    queryKey: contextEngineQueryKeys.aiIndex.kiList(aiIndexId ?? '', from, size, type),
    queryFn: ({ signal }) => {
      if (!aiIndexId) {
        throw new Error('AI index id is required');
      }
      return listKis(http, {
        aiIndexId,
        from,
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
    totalAll: data?.total_all ?? data?.total ?? 0,
    countsByType: data?.counts_by_type ?? [],
    isLoading,
    error: error ?? undefined,
    refetch,
  };
};
