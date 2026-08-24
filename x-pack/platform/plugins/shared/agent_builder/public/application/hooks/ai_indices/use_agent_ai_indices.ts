/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import { useQuery } from '@kbn/react-query';
import { useEffect, useMemo } from 'react';
import type { AgentAiIndexEntry, AgentAiIndicesItem } from '../../../../common/http_api/agents';
import { queryKeys } from '../../query_keys';
import { labels } from '../../utils/i18n';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useToasts } from '../use_toasts';

interface UseAgentAiIndicesResult {
  /** Effective AI indices per agent, with type-contributed ones flagged as defaults. */
  aiIndicesByAgentId: Record<string, AgentAiIndexEntry>;
  isLoading: boolean;
  error: Error | undefined;
}

/**
 * Loads the effective AI indices for each agent, with type-contributed ones flagged.
 *
 * Callers must not treat a missing entry as "inherits nothing" while `isLoading` is true — every
 * agent would look like it has no context at all until this resolves.
 *
 * Pass `enabled: false` where the Context Engine is off, so the request is never made.
 */
export const useAgentAiIndices = ({
  enabled = true,
}: { enabled?: boolean } = {}): UseAgentAiIndicesResult => {
  const { agentService } = useAgentBuilderServices();
  const { addErrorToast } = useToasts();

  const { data, isLoading, error, isError } = useQuery<AgentAiIndicesItem[], Error>({
    queryKey: queryKeys.agentProfiles.agentAiIndicesList,
    queryFn: () => agentService.listAgentAiIndices(),
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

  const aiIndicesByAgentId = useMemo(
    () =>
      Object.fromEntries(
        (data ?? []).map(({ agent_id: agentId, ai_indices: aiIndices }) => [agentId, aiIndices])
      ),
    [data]
  );

  // A disabled query never leaves the "loading" status, so report it as settled instead.
  return {
    aiIndicesByAgentId,
    isLoading: enabled && isLoading,
    error: error ?? undefined,
  };
};
