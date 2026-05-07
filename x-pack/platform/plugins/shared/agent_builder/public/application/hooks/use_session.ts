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
      return status === 'active' ? 3000 : false;
    },
  });

  return { session, isLoading, refetch };
};
