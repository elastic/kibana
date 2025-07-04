/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AgentProfile, ToolSelection } from '@kbn/onechat-common';
import { useOnechatServices } from '../use_onechat_service';
import { useOnechatAgentById } from './use_agent_by_id';
import { queryKeys } from '../../query_keys';

export interface AgentEditState {
  id: string;
  name: string;
  description: string;
  customInstructions: string;
  toolSelection: ToolSelection[];
}

const emptyState = (): AgentEditState => ({
  id: '',
  name: '',
  description: '',
  customInstructions: '',
  toolSelection: [],
});

export function useAgentEdit({
  agentId,
  onSaveSuccess,
  onSaveError,
}: {
  agentId?: string;
  onSaveSuccess: (agent: AgentProfile) => void;
  onSaveError: (err: Error) => void;
}) {
  const { agentProfilesService, toolsService } = useOnechatServices();
  const queryClient = useQueryClient();
  const [state, setState] = useState<AgentEditState>(emptyState());
  const [tools, setTools] = useState<any[]>([]);
  const [toolsLoading, setToolsLoading] = useState(true);
  const [toolsError, setToolsError] = useState<Error | null>(null);

  const { agent, isLoading: agentLoading, error: agentError } = useOnechatAgentById(agentId || '');

  const createMutation = useMutation({
    mutationFn: (data: AgentEditState) => agentProfilesService.create(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agentProfiles.all });
      onSaveSuccess(result);
    },
    onError: (err: Error) => {
      onSaveError(err);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Omit<AgentEditState, 'id'>) => {
      if (!agentId) {
        throw new Error('Agent ID is required for update');
      }
      return agentProfilesService.update(agentId, data);
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

  // Update state when agent data is loaded
  useEffect(() => {
    if (!agentId) {
      setState(emptyState());
      return;
    }

    if (agent) {
      setState({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        customInstructions: agent.customInstructions,
        toolSelection: agent.toolSelection || [],
      });
    }
  }, [agentId, agent]);

  // Fetch all available tools
  useEffect(() => {
    setToolsLoading(true);
    toolsService
      .list()
      .then((res) => {
        setTools(res.tools || []);
        setToolsLoading(false);
      })
      .catch((err) => {
        setToolsError(err);
        setToolsLoading(false);
      });
  }, [toolsService]);

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

  return {
    state,
    isLoading: agentId ? agentLoading : false,
    isSubmitting: createMutation.isLoading || updateMutation.isLoading,
    submit,
    tools,
    toolsLoading,
    toolsError: toolsError || agentError,
  };
}
