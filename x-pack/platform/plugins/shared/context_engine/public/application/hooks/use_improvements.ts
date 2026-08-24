/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { DEFAULT_IMPROVEMENTS_PAGE_SIZE } from '../../../common/constants';
import type {
  ImprovementEnvelope,
  ImprovementStatus,
  ListImprovementsResponse,
} from '../../../common/http_api/improvements';
import { listImprovements } from '../api/improvements';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

interface UseImprovementsArgs {
  aiIndexId: string | undefined;
  /** Omitted means the route's default: the suggestions still awaiting the user. */
  status?: readonly ImprovementStatus[];
  from?: number;
  size?: number;
  enabled?: boolean;
}

interface UseImprovementsResult {
  improvements: ImprovementEnvelope[];
  total: number;
  isLoading: boolean;
  error: Error | undefined;
  refetch: () => void;
}

/**
 * Fetches an AI index's improvement suggestions
 * (`GET /internal/context_engine/ai_index/{id}/improvements`). Disabled until an id is known.
 */
export const useImprovements = ({
  aiIndexId,
  status,
  from = 0,
  size = DEFAULT_IMPROVEMENTS_PAGE_SIZE,
  enabled = true,
}: UseImprovementsArgs): UseImprovementsResult => {
  const {
    services: { http },
  } = useKibana();

  const { data, isLoading, error, refetch } = useQuery<ListImprovementsResponse, Error>({
    queryKey: contextEngineQueryKeys.improvements.list(aiIndexId ?? '', status, from, size),
    queryFn: ({ signal }) => {
      if (!aiIndexId) {
        throw new Error('AI index id is required');
      }
      return listImprovements(http, { aiIndexId, status, from, size, signal });
    },
    enabled: enabled && aiIndexId !== undefined,
    // Keep the current list rendered while a status-filter change refetches, so the panel grows
    // and shrinks in place rather than collapsing to the loading skeleton.
    keepPreviousData: true,
  });

  return {
    improvements: data?.improvements ?? [],
    total: data?.total ?? 0,
    isLoading,
    error: error ?? undefined,
    refetch,
  };
};
