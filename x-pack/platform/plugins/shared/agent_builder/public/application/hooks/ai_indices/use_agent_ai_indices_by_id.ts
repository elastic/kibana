/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import { useQuery } from '@kbn/react-query';
import type {
  AgentAiIndexEntry,
  GetAgentAiIndicesResponse,
} from '../../../../common/http_api/agents';
import { queryKeys } from '../../query_keys';
import { labels } from '../../utils/i18n';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useToasts } from '../use_toasts';

interface UseAgentAiIndicesByIdResult {
  aiIndices: AgentAiIndexEntry[];
  warnings: GetAgentAiIndicesResponse['warnings'];
  isLoading: boolean;
  error: Error | undefined;
}

/**
 * Loads the effective AI indices for one agent, with type-contributed ones flagged.
 */
export const useAgentAiIndicesById = (
  agentId: string | undefined,
  { enabled = true }: { enabled?: boolean } = {}
): UseAgentAiIndicesByIdResult => {
  const { agentService } = useAgentBuilderServices();
  const { addErrorToast } = useToasts();
  const isEnabled = enabled && Boolean(agentId);

  const { data, isLoading, error } = useQuery<GetAgentAiIndicesResponse, Error>({
    queryKey: queryKeys.agentProfiles.agentAiIndicesById(agentId ?? ''),
    queryFn: () => agentService.getAgentAiIndices(agentId!),
    enabled: isEnabled,
    onError: (err) => {
      if (isEnabled) {
        addErrorToast({
          title: labels.aiIndices.loadInheritedErrorMessage,
          text: formatAgentBuilderErrorMessage(err),
        });
      }
    },
  });

  return {
    aiIndices: data?.ai_indices ?? [],
    warnings: data?.warnings,
    isLoading: isEnabled && isLoading,
    error: error ?? undefined,
  };
};
