/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type { AgentDefinition, PluginDefinition } from '@kbn/agent-builder-common';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { queryKeys } from '../../../query_keys';
import { labels } from '../../../utils/i18n';
import { useToasts } from '../../../hooks/use_toasts';

export const usePluginsMutation = ({ agent }: { agent: AgentDefinition | null }) => {
  const { agentService } = useAgentBuilderServices();
  const queryClient = useQueryClient();
  const { addSuccessToast, addErrorToast } = useToasts();
  const { id: agentId, configuration } = agent ?? {};
  const { plugin_ids: agentPluginIds } = configuration ?? {};

  const agentQueryKey = queryKeys.agentProfiles.byId(agentId);

  const updatePluginsMutation = useMutation({
    mutationFn: (newPluginIds: string[]) => {
      if (!agentId) {
        throw new Error('Agent id is required to update plugins');
      }
      return agentService.update(agentId, {
        configuration: { plugin_ids: newPluginIds },
      });
    },
    onMutate: async (newPluginIds: string[]) => {
      await queryClient.cancelQueries({ queryKey: agentQueryKey });

      const previousAgent = queryClient.getQueryData<AgentDefinition>(agentQueryKey);

      if (previousAgent) {
        queryClient.setQueryData<AgentDefinition>(agentQueryKey, {
          ...previousAgent,
          configuration: {
            ...previousAgent.configuration,
            plugin_ids: newPluginIds,
          },
        });
      }

      return { previousAgent };
    },
    onError: (_err, _newPluginIds, context) => {
      if (context?.previousAgent) {
        queryClient.setQueryData<AgentDefinition>(agentQueryKey, context.previousAgent);
      }
      addErrorToast({ title: labels.agentPlugins.updatePluginsErrorToast });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: agentQueryKey });
    },
  });

  const handleAddPlugin = useCallback(
    (plugin: PluginDefinition, { onSuccess }: { onSuccess?: (pluginId: string) => void } = {}) => {
      const currentIds = agentPluginIds ?? [];
      if (currentIds.includes(plugin.id)) return;
      const newIds = [...currentIds, plugin.id];

      updatePluginsMutation.mutate(newIds, {
        onSuccess: () => {
          onSuccess?.(plugin.id);
          addSuccessToast({ title: labels.agentPlugins.addPluginSuccessToast(plugin.name) });
        },
      });
    },
    [agentPluginIds, updatePluginsMutation, addSuccessToast]
  );

  const handleRemovePlugin = useCallback(
    (plugin: PluginDefinition) => {
      const currentIds = agentPluginIds ?? [];
      const newIds = currentIds.filter((id) => id !== plugin.id);
      updatePluginsMutation.mutate(newIds, {
        onSuccess: () => {
          addSuccessToast({ title: labels.agentPlugins.removePluginSuccessToast(plugin.name) });
        },
      });
    },
    [agentPluginIds, updatePluginsMutation, addSuccessToast]
  );

  const handlers = useMemo(
    () => ({ handleAddPlugin, handleRemovePlugin }),
    [handleAddPlugin, handleRemovePlugin]
  );

  return handlers;
};
