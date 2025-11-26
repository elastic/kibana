/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { queryKeys } from '../../query_keys';
import { useOnechatServices } from '../use_onechat_service';

interface UseMonitoringListConversationsParams {
  start?: string;
  end?: string;
  user?: string;
}

export const useMonitoringListConversations = (
  params: UseMonitoringListConversationsParams = {}
) => {
  const { monitoringService } = useOnechatServices();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.monitoring.conversations.list(params),
    queryFn: () => {
      return monitoringService.listConversations({
        startDate: params.start,
        endDate: params.end,
        userName: params.user,
      });
    },
  });

  return {
    data,
    conversations: data?.conversations,
    aggregates: data?.aggregates,
    isLoading,
    error,
    refetch,
  };
};
