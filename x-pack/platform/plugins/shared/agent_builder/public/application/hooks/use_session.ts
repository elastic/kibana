/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { Conversation } from '@kbn/agent-builder-common';
import { queryKeys } from '../query_keys';
import { useAgentBuilderServices } from './use_agent_builder_service';

export const useSession = (sessionId: string | undefined) => {
  const { sessionsService } = useAgentBuilderServices();

  const {
    data: session,
    isLoading,
    refetch,
  } = useQuery<Conversation>({
    queryKey: queryKeys.sessions.byId(sessionId ?? ''),
    queryFn: () => sessionsService.get(sessionId!),
    enabled: !!sessionId,
    refetchInterval: (data) => {
      const status = (data as Conversation | undefined)?.state?.standing_session?.status;
      // Poll aggressively when active so live-status transitions are near-instant.
      // Poll gently when idle so we notice when a new round starts.
      if (status === 'active') return 1000;
      if (status === 'idle') return 2000;
      return false; // terminated — no need to keep polling
    },
  });

  return { session, isLoading, refetch };
};
