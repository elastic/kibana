/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useOnechatServices } from '../use_onechat_service';
import { queryKeys } from '../../query_keys';

export const useOnechatAgentById = (agentId: string) => {
  const { agentService } = useOnechatServices();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.agentProfiles.byId(agentId),
    queryFn: () => agentService.get(agentId),
    enabled: !!agentId,
  });

  return { agent: data ?? null, isLoading, error };
};
