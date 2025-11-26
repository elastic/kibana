/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { queryKeys } from '../../query_keys';
import { useOnechatServices } from '../use_onechat_service';

export const useMonitoringGetConversation = (conversationId: string) => {
  const { monitoringService } = useOnechatServices();

  const {
    data: conversation,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.monitoring.conversations.byId(conversationId),
    queryFn: () => {
      return monitoringService.getConversation(conversationId);
    },
    enabled: !!conversationId,
  });

  return {
    conversation,
    isLoading,
    error,
    refetch,
  };
};
