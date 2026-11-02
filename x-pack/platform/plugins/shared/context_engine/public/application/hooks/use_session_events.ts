/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type {
  ListSessionEventsResponse,
  SessionEvent,
} from '../../../common/http_api/session_memory';
import { listSessionEvents } from '../api/session_memory';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

interface UseSessionEventsArgs {
  sessionId: string;
  space?: string;
  aiIndexId?: string;
}

interface UseSessionEventsResult {
  events: SessionEvent[];
  count: number;
  isLoading: boolean;
  error: Error | undefined;
  refetch: () => void;
}

/**
 * Fetches a session's events (`GET /internal/context_engine/session_events/{sessionId}`), newest
 * first. Disabled until a session id is provided.
 */
export const useSessionEvents = ({
  sessionId,
  space,
  aiIndexId,
}: UseSessionEventsArgs): UseSessionEventsResult => {
  const {
    services: { http },
  } = useKibana();

  const { data, isLoading, error, refetch } = useQuery<ListSessionEventsResponse, Error>({
    queryKey: contextEngineQueryKeys.sessionEvents.list(sessionId, space, aiIndexId),
    queryFn: ({ signal }) =>
      listSessionEvents(http, {
        sessionId,
        ...(space ? { space } : {}),
        ...(aiIndexId ? { ai_index_id: aiIndexId } : {}),
        signal,
      }),
    enabled: sessionId.length > 0,
  });

  return {
    events: data?.results ?? [],
    count: data?.count ?? 0,
    isLoading: sessionId.length > 0 && isLoading,
    error: error ?? undefined,
    refetch,
  };
};
