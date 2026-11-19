/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { AiIndexSpendResponse } from '../../../common/spend';
import { getAiIndexSpend } from '../api/spend';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

/** Spend reads are cached server-side for a minute, so refetching sooner shows nothing new. */
const SPEND_STALE_TIME_MS = 60_000;

interface UseAiIndexSpendResult {
  spend: AiIndexSpendResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

/** Month-to-date AI spend of an AI index and of its space. */
export const useAiIndexSpend = (aiIndexId: string | undefined): UseAiIndexSpendResult => {
  const {
    services: { http },
  } = useKibana();

  const { data, isLoading, error } = useQuery<AiIndexSpendResponse, Error>({
    queryKey: contextEngineQueryKeys.spend.aiIndex(aiIndexId ?? ''),
    queryFn: ({ signal }) => getAiIndexSpend(http, { aiIndexId: aiIndexId ?? '', signal }),
    enabled: aiIndexId !== undefined,
    staleTime: SPEND_STALE_TIME_MS,
  });

  return {
    spend: data,
    isLoading: aiIndexId !== undefined && isLoading,
    error: error ?? undefined,
  };
};
