/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQueryClient } from '@kbn/react-query';
import { queryKeys } from '../../../../../../../query_keys';
import { useAgentBuilderServices } from '../../../../../../../hooks/use_agent_builder_service';
import { useAgentId } from '../../../../../../../hooks/use_conversation';

export const usePrefetchSkills = () => {
  const queryClient = useQueryClient();
  const { skillsService } = useAgentBuilderServices();
  const agentId = useAgentId();

  return useCallback(() => {
    if (agentId) {
      queryClient.prefetchQuery({
        queryKey: queryKeys.skills.byAgent(agentId),
        queryFn: () => skillsService.listByAgent({ agentId }),
      });
    }
  }, [queryClient, skillsService, agentId]);
};
