/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { queryKeys } from '../../query_keys';

/**
 * Fetches the ACL for an agent. Callers without ACL-management rights will receive an
 * empty `entries` list and `canManage: false` from the server.
 */
export const useAgentAcl = (agentId: string, { enabled = true }: { enabled?: boolean } = {}) => {
  const { agentService } = useAgentBuilderServices();

  return useQuery({
    queryKey: queryKeys.agentProfiles.acl(agentId),
    queryFn: () => agentService.getAcl(agentId),
    enabled: enabled && Boolean(agentId),
  });
};
