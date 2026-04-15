/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useService } from '@kbn/core-di-browser';
import { useQuery } from '@kbn/react-query';
import { NotificationPoliciesApi } from '../services/notification_policies_api';
import { notificationPolicyKeys } from './query_key_factory';

export const useFetchTags = (params?: { search?: string }) => {
  const notificationPoliciesApi = useService(NotificationPoliciesApi);

  return useQuery<string[], Error>({
    queryKey: notificationPolicyKeys.tags(params?.search),
    queryFn: () => notificationPoliciesApi.fetchTags({ search: params?.search }),
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000, // 30 seconds
  });
};
