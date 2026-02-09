/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@kbn/react-query';
import {
  type AgentDefinition,
  type ToolSelection,
  defaultAgentToolIds,
} from '@kbn/agent-builder-common';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useAgentBuilderAgentById } from './use_agent_by_id';
import { useToolsService } from '../tools/use_tools';
import { queryKeys } from '../../query_keys';
import { duplicateName } from '../../utils/duplicate_name';
import { searchParamNames } from '../../search_param_names';
import { cleanInvalidToolReferences } from '../../utils/tool_selection_utils';

export type AgentEditState = Omit<AgentDefinition, 'type' | 'readonly'>;

const defaultToolSelection: ToolSelection[] = [
  {
    tool_ids: [...defaultAgentToolIds],
  },
];

const emptyState = (): AgentEditState => ({
  id: '',
  name: '',
  description: '',
  labels: [],
  avatar_color: '',
  avatar_symbol: '',
  configuration: {
    instructions: '',
    tools: defaultToolSelection,
  },
});

export function useAgentEdit({
  editingAgentId,
  onSaveSuccess,
  onSaveError,
}: {
  editingAgentId?: string;
  onSaveSuccess: (agent: AgentDefinition) => void;
  onSaveError: (err: Error) => void;
}) {
  const [searchParams] = useSearchParams();
  const { agentService } = useAgentBuilderServices();
  const queryClient = useQueryClient();
  const [state, setState] = useState<AgentEditState>(emptyState());

  const { tools, isLoading: toolsLoading, error: toolsError } = useToolsService();
  const sourceAgentId = searchParams.get(searchParamNames.sourceId);
  const isClone = Boolean(!editingAgentId && sourceAgentId);
  const agentId = editingAgentId || sourceAgentId || '';
  const { agent, isLoading: agentLoading, error: agentError } = useAgentBuilderAgentById(agentId);

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
      if (!editingAgentId) {
        throw new Error('Agent ID is required for update');
      }
      return agentService.update(agentId, data);
    },
    onSuccess: (result) => {
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
      if (isClone) {
        agentState.id = duplicateName(agentState.id);
      }
      setState(agentState);
    }
  }, [agentId, agent, isClone]);

  const submit = useCallback(
    async (data: AgentEditState) => {
      const cleanedData = cleanInvalidToolReferences(data, tools);

      if (editingAgentId) {
        const { id, ...updatedAgent } = cleanedData;
        await updateMutation.mutateAsync(updatedAgent);
      } else {
        await createMutation.mutateAsync(cleanedData);
      }
    },
    [editingAgentId, createMutation, updateMutation, tools]
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
