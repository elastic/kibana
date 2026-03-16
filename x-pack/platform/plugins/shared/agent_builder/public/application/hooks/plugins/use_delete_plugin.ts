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
import type { DeletePluginResponse } from '../../../../common/http_api/plugins';
import { queryKeys } from '../../query_keys';
import { labels } from '../../utils/i18n';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useToasts } from '../use_toasts';

interface DeletePluginMutationVariables {
  pluginId: string;
  pluginName: string;
}

type DeletePluginMutationOptions = UseMutationOptions<
  DeletePluginResponse,
  Error,
  DeletePluginMutationVariables
>;

type DeletePluginSuccessCallback = NonNullable<DeletePluginMutationOptions['onSuccess']>;
type DeletePluginErrorCallback = NonNullable<DeletePluginMutationOptions['onError']>;

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
    mutationFn: ({ pluginId }) => pluginsService.delete({ pluginId }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.plugins.all }),
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
  const onConfirmCallbackRef = useRef<() => void>();
  const onCancelCallbackRef = useRef<() => void>();

  const isModalOpen = deletePluginState !== null;

  const deletePlugin = useCallback(
    (
      pluginId: string,
      pluginName: string,
      { onConfirm, onCancel }: { onConfirm?: () => void; onCancel?: () => void } = {}
    ) => {
      setDeletePluginState({ pluginId, pluginName });
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
  };

  const handleError: DeletePluginErrorCallback = (error, { pluginName }) => {
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
    onConfirmCallbackRef.current?.();
    onConfirmCallbackRef.current = undefined;
  }, [deletePluginState, deletePluginMutation, onSuccess, onError]);

  const cancelDelete = useCallback(() => {
    setDeletePluginState(null);
    onCancelCallbackRef.current?.();
    onCancelCallbackRef.current = undefined;
  }, []);

  return {
    isOpen: isModalOpen,
    isLoading,
    pluginId: deletePluginState?.pluginId ?? null,
    pluginName: deletePluginState?.pluginName ?? null,
    deletePlugin,
    confirmDelete,
    cancelDelete,
  };
};
