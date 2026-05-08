/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { queryKeys } from '../query_keys';
import { useAgentBuilderServices } from './use_agent_builder_service';

export const useSessionList = ({ agentId }: { agentId?: string } = {}) => {
  const { sessionsService } = useAgentBuilderServices();

  const {
    data: sessions,
    isLoading,
    refetch: refresh,
  } = useQuery({
    queryKey: agentId ? queryKeys.sessions.byAgent(agentId) : queryKeys.sessions.all,
    queryFn: () => {
      return sessionsService.list({ agentId });
    },
    // Poll every 2s so sidebar status dots and the list page update promptly.
    refetchInterval: (data) => {
      const list = data as typeof sessions;
      const hasActive = list?.some((s) => s.state?.standing_session?.status === 'active');
      return hasActive ? 1000 : 2000;
    },
  });

  return {
    sessions,
    isLoading,
    refresh,
  };
};
