/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { DEFAULT_IMPROVEMENTS_PAGE_SIZE } from '../../../common/constants';
import type {
  Improvement,
  ImprovementStatus,
  ListImprovementsResponse,
} from '../../../common/http_api/improvements';
import { listImprovements } from '../api/improvements';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

interface UseImprovementsArgs {
  aiIndexId: string | undefined;
  /** Omitted lets the server default to the improvements still awaiting a decision. */
  status?: ImprovementStatus[];
  from?: number;
  size?: number;
  enabled?: boolean;
}

interface UseImprovementsResult {
  improvements: Improvement[];
  total: number;
  isLoading: boolean;
  error: Error | undefined;
  refetch: () => void;
}

/**
 * Fetches an AI index's improvements. Disabled until an AI index id is available, and by the caller
 * when the feedback loop is off.
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
        throw new Error('An AI index id is required');
      }
      return listImprovements(http, { aiIndexId, status, from, size, signal });
    },
    enabled: enabled && aiIndexId !== undefined,
    // Keeps the reviewed row in place while the list refetches after a decision, instead of
    // collapsing the panel to a skeleton on every approve.
    keepPreviousData: true,
  });

  return {
    improvements: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    error: error ?? undefined,
    refetch,
  };
};
