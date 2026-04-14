/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type { AgentDefinition, ToolDefinition, ToolSelection } from '@kbn/agent-builder-common';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { queryKeys } from '../../../query_keys';
import { labels } from '../../../utils/i18n';
import { useToasts } from '../../../hooks/use_toasts';
import { isToolSelected, toggleToolSelection } from '../../../utils/tool_selection_utils';

export const useToolsMutation = ({
  agent,
  allTools,
}: {
  agent: AgentDefinition | null;
  allTools: ToolDefinition[];
}) => {
  const { agentService } = useAgentBuilderServices();
  const queryClient = useQueryClient();
  const { addSuccessToast, addErrorToast } = useToasts();
  const { id: agentId, configuration } = agent ?? {};
  const agentToolSelections = useMemo(() => configuration?.tools ?? [], [configuration?.tools]);

  const agentQueryKey = queryKeys.agentProfiles.byId(agentId);

  const updateToolsMutation = useMutation({
    mutationFn: (newToolSelections: ToolSelection[]) => {
      if (!agentId) {
        throw new Error('Agent id is required to update tools');
      }
      return agentService.update(agentId, {
        configuration: { tools: newToolSelections },
      });
    },
    onMutate: async (newToolSelections: ToolSelection[]) => {
      await queryClient.cancelQueries({ queryKey: agentQueryKey });

      const previousAgent = queryClient.getQueryData<AgentDefinition>(agentQueryKey);

      if (previousAgent) {
        queryClient.setQueryData<AgentDefinition>(agentQueryKey, {
          ...previousAgent,
          configuration: {
            ...previousAgent.configuration,
            tools: newToolSelections,
          },
        });
      }

      return { previousAgent };
    },
    onError: (_err, _newToolSelections, context) => {
      if (context?.previousAgent) {
        queryClient.setQueryData<AgentDefinition>(agentQueryKey, context.previousAgent);
      }
      addErrorToast({ title: labels.agentTools.updateToolsErrorToast });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: agentQueryKey });
    },
  });

  const handleAddTool = useCallback(
    (tool: ToolDefinition, { onSuccess }: { onSuccess?: (toolId: string) => void } = {}) => {
      if (isToolSelected(tool, agentToolSelections)) return;
      const newSelections = toggleToolSelection(tool.id, allTools, agentToolSelections);

      updateToolsMutation.mutate(newSelections, {
        onSuccess: () => {
          onSuccess?.(tool.id);
          addSuccessToast({ title: labels.agentTools.addToolSuccessToast(tool.id) });
        },
      });
    },
    [agentToolSelections, allTools, updateToolsMutation, addSuccessToast]
  );

  const handleRemoveTool = useCallback(
    (tool: ToolDefinition) => {
      const newSelections = toggleToolSelection(tool.id, allTools, agentToolSelections);
      updateToolsMutation.mutate(newSelections, {
        onSuccess: () => {
          addSuccessToast({ title: labels.agentTools.removeToolSuccessToast(tool.id) });
        },
      });
    },
    [agentToolSelections, allTools, updateToolsMutation, addSuccessToast]
  );

  const handlers = useMemo(
    () => ({ handleAddTool, handleRemoveTool }),
    [handleAddTool, handleRemoveTool]
  );

  return handlers;
};
