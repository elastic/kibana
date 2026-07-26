/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import type { UseMutationOptions } from '@kbn/react-query';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { useCallback, useRef, useState } from 'react';
import type { AgentRef } from '../../../../common/http_api/tools';
import type { DeletePluginResponse } from '../../../../common/http_api/plugins';
import { PLUGIN_USED_BY_AGENTS_ERROR_CODE } from '../../../../common/http_api/plugins';
import { queryKeys } from '../../query_keys';
import { labels } from '../../utils/i18n';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useToasts } from '../use_toasts';

export interface PluginUsedByAgents {
  pluginId: string;
  pluginName: string;
  agents: AgentRef[];
}

interface PluginUsedByAgentsErrorBody {
  attributes?: { code?: string; agents?: AgentRef[] };
}

interface DeletePluginMutationVariables {
  pluginId: string;
  pluginName: string;
  force?: boolean;
}

type DeletePluginMutationOptions = UseMutationOptions<
  DeletePluginResponse,
  Error,
  DeletePluginMutationVariables
>;

type DeletePluginSuccessCallback = NonNullable<DeletePluginMutationOptions['onSuccess']>;
type DeletePluginErrorCallback = NonNullable<DeletePluginMutationOptions['onError']>;

function getPluginUsedByAgentsFromError(
  error: unknown,
  pluginId: string,
  pluginName: string
): PluginUsedByAgents | null {
  const body = (error as { body?: PluginUsedByAgentsErrorBody }).body;
  const attrs = body?.attributes;
  if (attrs?.code !== PLUGIN_USED_BY_AGENTS_ERROR_CODE || !Array.isArray(attrs.agents)) {
    return null;
  }
  return { pluginId, pluginName, agents: attrs.agents };
}

export const useDeletePluginService = ({
  onSuccess,
  onError,
}: {
  onSuccess?: DeletePluginSuccessCallback;
  onError?: DeletePluginErrorCallback;
} = {}) => {
  const queryClient = useQueryClient();
  const { pluginsService } = useAgentBuilderServices();

  const { mutate, mutateAsync, isLoading } = useMutation<
    DeletePluginResponse,
    Error,
    DeletePluginMutationVariables
  >({
    mutationFn: ({ pluginId, force }) => pluginsService.delete({ pluginId, force }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plugins.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.skills.list });
      queryClient.invalidateQueries({ queryKey: queryKeys.agentProfiles.all });
    },
    onSuccess,
    onError,
  });

  return { deletePluginSync: mutate, deletePlugin: mutateAsync, isLoading };
};

export const useDeletePlugin = ({
  onSuccess,
  onError,
}: {
  onSuccess?: DeletePluginSuccessCallback;
  onError?: DeletePluginErrorCallback;
} = {}) => {
  const { addSuccessToast, addErrorToast } = useToasts();
  const [deletePluginState, setDeletePluginState] = useState<{
    pluginId: string;
    pluginName: string;
  } | null>(null);
  const [usedByAgents, setUsedByAgents] = useState<PluginUsedByAgents | null>(null);
  const onConfirmCallbackRef = useRef<() => void>();
  const onCancelCallbackRef = useRef<() => void>();

  const isModalOpen = deletePluginState !== null;
  const isForceConfirmModalOpen = usedByAgents !== null;

  const deletePlugin = useCallback(
    (
      pluginId: string,
      pluginName: string,
      { onConfirm, onCancel }: { onConfirm?: () => void; onCancel?: () => void } = {}
    ) => {
      setDeletePluginState({ pluginId, pluginName });
      setUsedByAgents(null);
      onConfirmCallbackRef.current = onConfirm;
      onCancelCallbackRef.current = onCancel;
    },
    []
  );

  const handleSuccess: DeletePluginSuccessCallback = (data, { pluginName }) => {
    if (!data.success) {
      addErrorToast({
        title: labels.plugins.deletePluginErrorToast(pluginName),
        text: formatAgentBuilderErrorMessage(
          new Error('Delete operation failed. API returned: { success: false }')
        ),
      });
      setDeletePluginState(null);
      return;
    }

    addSuccessToast({
      title: labels.plugins.deletePluginSuccessToast(pluginName),
    });
    setDeletePluginState(null);
    setUsedByAgents(null);
    onConfirmCallbackRef.current?.();
    onConfirmCallbackRef.current = undefined;
  };

  const handleError: DeletePluginErrorCallback = (error, { pluginId, pluginName }) => {
    const payload = getPluginUsedByAgentsFromError(error, pluginId, pluginName);
    if (payload) {
      setUsedByAgents(payload);
      setDeletePluginState(null);
      return;
    }
    setUsedByAgents(null);
    addErrorToast({
      title: labels.plugins.deletePluginErrorToast(pluginName),
      text: formatAgentBuilderErrorMessage(error),
    });
  };

  const { deletePlugin: deletePluginMutation, isLoading } = useDeletePluginService({
    onSuccess: handleSuccess,
    onError: handleError,
  });

  const confirmDelete = useCallback(async () => {
    if (!deletePluginState) {
      return;
    }

    await deletePluginMutation(
      { pluginId: deletePluginState.pluginId, pluginName: deletePluginState.pluginName },
      { onSuccess, onError }
    );
  }, [deletePluginState, deletePluginMutation, onSuccess, onError]);

  const cancelDelete = useCallback(() => {
    setDeletePluginState(null);
    setUsedByAgents(null);
    onCancelCallbackRef.current?.();
    onCancelCallbackRef.current = undefined;
  }, []);

  const confirmForceDelete = useCallback(async () => {
    if (!usedByAgents) {
      return;
    }
    await deletePluginMutation(
      {
        pluginId: usedByAgents.pluginId,
        pluginName: usedByAgents.pluginName,
        force: true,
      },
      { onSuccess, onError }
    );
  }, [usedByAgents, deletePluginMutation, onSuccess, onError]);

  const cancelForceDelete = useCallback(() => {
    setUsedByAgents(null);
  }, []);

  return {
    isOpen: isModalOpen,
    isLoading,
    pluginId: deletePluginState?.pluginId ?? null,
    pluginName: deletePluginState?.pluginName ?? null,
    deletePlugin,
    confirmDelete,
    cancelDelete,
    usedByAgents,
    isForceConfirmModalOpen,
    confirmForceDelete,
    cancelForceDelete,
  };
};
