/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import { useQuery } from '@kbn/react-query';
import { useEffect, useMemo } from 'react';
import type { AgentBaseConfigurationItem } from '../../../../common/http_api/agents';
import { queryKeys } from '../../query_keys';
import { labels } from '../../utils/i18n';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useToasts } from '../use_toasts';

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
 *
 * Pass `enabled: false` where the Context Engine is off, so the request is never made.
 */
export const useInheritedAiIndices = ({
  enabled = true,
}: { enabled?: boolean } = {}): UseInheritedAiIndicesResult => {
  const { agentService } = useAgentBuilderServices();
  const { addErrorToast } = useToasts();

  const { data, isLoading, error, isError } = useQuery<AgentBaseConfigurationItem[], Error>({
    queryKey: queryKeys.agentProfiles.baseConfiguration,
    queryFn: () => agentService.listBaseConfigurations(),
    enabled,
  });

  useEffect(() => {
    if (enabled && isError) {
      addErrorToast({
        title: labels.aiIndices.loadInheritedErrorMessage,
        text: formatAgentBuilderErrorMessage(error),
      });
    }
  }, [enabled, isError, error, addErrorToast]);

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

  // A disabled query never leaves the "loading" status, so report it as settled instead.
  return {
    inheritedAiIndicesByAgentId,
    isLoading: enabled && isLoading,
    error: error ?? undefined,
  };
};
