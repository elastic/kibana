/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { queryKeys } from '../../query_keys';

export const useAgentBuilderAgents = () => {
  const { agentService } = useAgentBuilderServices();

  const { data, isLoading, error, isFetched } = useQuery({
    queryKey: queryKeys.agentProfiles.all,
    queryFn: () => agentService.list(),
  });

  return { agents: data ?? [], isLoading, error, isFetched };
};
