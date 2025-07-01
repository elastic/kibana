/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../query_keys';
import { useOnechatServices } from './use_onechat_service';

export const useConversationList = ({ agentId }: { agentId?: string }) => {
  const { conversationsService } = useOnechatServices();

  const {
    data: conversations,
    isLoading,
    refetch: refresh,
  } = useQuery({
    queryKey: agentId ? queryKeys.conversations.byAgent(agentId) : queryKeys.conversations.all,
    queryFn: async () => {
      return conversationsService.list({ agentId });
    },
    initialData: () => [],
  });

  return {
    conversations,
    isLoading,
    refresh,
  };
};
