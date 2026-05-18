/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQueryClient } from '@kbn/react-query';
import { useAgentBuilderAgentById } from '../agents/use_agent_by_id';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { queryKeys } from '../../query_keys';

export const useUpdateAgent = (agentId: string) => {
  const { agent } = useAgentBuilderAgentById(agentId);
  const { agentService } = useAgentBuilderServices();
  const queryClient = useQueryClient();

  return useCallback(
    async (updates: { connector_ids?: string[] }) => {
      if (!agent) return;
      await agentService.update(agent.id, { configuration: updates });
      queryClient.invalidateQueries({ queryKey: queryKeys.agentProfiles.byId(agent.id) });
    },
    [agent, agentService, queryClient]
  );
};
