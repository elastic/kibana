/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useMemo } from 'react';
import type { AgentBaseConfigurationItem } from '../../../../common/http_api/agents';
import { queryKeys } from '../../query_keys';
import { useAgentBuilderServices } from '../use_agent_builder_service';

interface UseInheritedAiIndicesResult {
  /** AI indices each agent inherits from its type, keyed by agent id. */
  inheritedAiIndicesByAgentId: Record<string, string[]>;
  isLoading: boolean;
  error: Error | undefined;
}

/**
 * Loads the AI indices each agent inherits from its type.
 *
 * "Inherited" is this UI's name for what the server calls an agent type's *base configuration*,
 * which is why the request goes to `_base_configuration`.
 *
 * Callers must not treat a missing entry as "inherits nothing" while `isLoading` is true — every
 * agent would look like it has no context at all until this resolves.
 */
export const useInheritedAiIndices = (): UseInheritedAiIndicesResult => {
  const { agentService } = useAgentBuilderServices();

  const { data, isLoading, error } = useQuery<AgentBaseConfigurationItem[], Error>({
    queryKey: queryKeys.agentProfiles.baseConfiguration,
    queryFn: () => agentService.listBaseConfigurations(),
  });

  const inheritedAiIndicesByAgentId = useMemo(
    () =>
      Object.fromEntries(
        (data ?? []).map(({ agent_id: agentId, configuration }) => [
          agentId,
          configuration.ai_indices,
        ])
      ),
    [data]
  );

  return { inheritedAiIndicesByAgentId, isLoading, error: error ?? undefined };
};
