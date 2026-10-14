/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import { useQuery } from '@kbn/react-query';
import { useMemo } from 'react';
import type {
  AgentAiIndexEntry,
  ListAgentAiIndicesResponse,
} from '../../../../common/http_api/agents';
import { queryKeys } from '../../query_keys';
import { labels } from '../../utils/i18n';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useToasts } from '../use_toasts';

interface UseAgentAiIndicesResult {
  /** Effective AI indices per agent, with type-contributed ones flagged as defaults. */
  aiIndicesByAgentId: Record<string, AgentAiIndexEntry[]>;
  warnings: ListAgentAiIndicesResponse['warnings'];
  isLoading: boolean;
  error: Error | undefined;
}

/**
 * Loads the effective AI indices for each agent, with type-contributed ones flagged.
 */
export const useAgentAiIndices = ({
  enabled = true,
}: { enabled?: boolean } = {}): UseAgentAiIndicesResult => {
  const { agentService } = useAgentBuilderServices();
  const { addErrorToast } = useToasts();

  const { data, isLoading, error } = useQuery<ListAgentAiIndicesResponse, Error>({
    queryKey: queryKeys.agentProfiles.agentAiIndicesList,
    queryFn: () => agentService.listAgentAiIndices(),
    enabled,
    onError: (err) => {
      if (enabled) {
        addErrorToast({
          title: labels.aiIndices.loadInheritedErrorMessage,
          text: formatAgentBuilderErrorMessage(err),
        });
      }
    },
  });

  const aiIndicesByAgentId = useMemo(
    () =>
      Object.fromEntries(
        (data?.results ?? []).map(({ agent_id: agentId, ai_indices: aiIndices }) => [
          agentId,
          aiIndices,
        ])
      ),
    [data]
  );

  return {
    aiIndicesByAgentId,
    warnings: data?.warnings,
    isLoading: enabled && isLoading,
    error: error ?? undefined,
  };
};
