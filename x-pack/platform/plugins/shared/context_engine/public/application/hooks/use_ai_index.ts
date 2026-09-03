/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import { isFeedbackRunActive } from '../../../common/http_api/ai_indices';
import { getAiIndex } from '../api/ai_indices';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

/** Slow enough to be background noise, quick enough that a finished run does not look stuck. */
const ACTIVE_RUN_POLL_MS = 5000;

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
    // An analysis run writes back to the index when it finishes, and the page is where someone
    // watches for that. Polling stops as soon as the run is no longer in flight.
    refetchInterval: (aiIndex) =>
      isFeedbackRunActive(aiIndex?.feedback_run) ? ACTIVE_RUN_POLL_MS : false,
  });

  return { aiIndex: data, isLoading, error: error ?? undefined, refetch };
};
