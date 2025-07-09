/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  builtinToolProviderId,
  type AgentDefinition,
  type ToolSelection,
  allToolsSelectionWildcard,
} from '@kbn/onechat-common';
import { useOnechatServices } from '../use_onechat_service';
import { useOnechatAgentById } from './use_agent_by_id';
import { useOnechatTools } from '../use_tools';
import { queryKeys } from '../../query_keys';

export type AgentEditState = Omit<AgentDefinition, 'type'>;

const defaultToolSelection: ToolSelection[] = [
  {
    type: builtinToolProviderId,
    tool_ids: [allToolsSelectionWildcard],
  },
];

const emptyState = (): AgentEditState => ({
  id: '',
  name: '',
  description: '',
  configuration: {
    instructions: '',
    tools: defaultToolSelection,
  },
});

export function useAgentEdit({
  agentId,
  onSaveSuccess,
  onSaveError,
}: {
  agentId?: string;
  onSaveSuccess: (agent: AgentDefinition) => void;
  onSaveError: (err: Error) => void;
}) {
  const { agentService } = useOnechatServices();
  const queryClient = useQueryClient();
  const [state, setState] = useState<AgentEditState>(emptyState());

  const { tools, isLoading: toolsLoading, error: toolsError } = useOnechatTools();

  const { agent, isLoading: agentLoading, error: agentError } = useOnechatAgentById(agentId || '');

  const createMutation = useMutation({
    mutationFn: (data: AgentEditState) => agentService.create(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agentProfiles.all });
      onSaveSuccess(result);
    },
    onError: (err: Error) => {
      onSaveError(err);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Omit<AgentEditState, 'id'>) => {
      if (!agentId) {
        throw new Error('Agent ID is required for update');
      }
      return agentService.update(agentId, data);
    },
    onSuccess: (result) => {
      // Invalidate specific agent and agent profiles list
      queryClient.invalidateQueries({ queryKey: queryKeys.agentProfiles.byId(agentId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.agentProfiles.all });
      onSaveSuccess(result);
    },
    onError: (err: Error) => {
      onSaveError(err);
    },
  });

  useEffect(() => {
    if (!agentId) {
      setState(emptyState());
      return;
    }

    if (agent) {
      const { type, ...agentState } = agent;
      setState(agentState);
    }
  }, [agentId, agent]);

  const submit = useCallback(
    (data: AgentEditState) => {
      if (agentId) {
        const { id, ...updatedAgent } = data;
        updateMutation.mutate(updatedAgent);
      } else {
        createMutation.mutate(data);
      }
    },
    [agentId, createMutation, updateMutation]
  );

  const isLoading = agentId ? agentLoading || toolsLoading : false;

  return {
    state,
    isLoading,
    isSubmitting: createMutation.isLoading || updateMutation.isLoading,
    submit,
    tools,
    error: toolsError || agentError,
  };
}
