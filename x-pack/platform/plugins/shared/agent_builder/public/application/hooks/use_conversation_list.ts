/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { queryKeys } from '../query_keys';
import { useAgentBuilderServices } from './use_agent_builder_service';

export const useConversationList = ({ agentId }: { agentId?: string } = {}) => {
  const { conversationsService } = useAgentBuilderServices();

  const {
    data: conversations,
    isLoading,
    refetch: refresh,
  } = useQuery({
    queryKey: agentId ? queryKeys.conversations.byAgent(agentId) : queryKeys.conversations.all,
    queryFn: () => {
      return conversationsService.list({ agentId });
    },
  });

  return {
    conversations,
    isLoading,
    refresh,
  };
};
