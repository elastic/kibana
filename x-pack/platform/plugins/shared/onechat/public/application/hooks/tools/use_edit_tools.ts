/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatOnechatErrorMessage } from '@kbn/onechat-browser';
import { UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { UpdateToolPayload, UpdateToolResponse } from '../../../../common/http_api/tools';
import { queryKeys } from '../../query_keys';
import { labels } from '../../utils/i18n';
import { useFlyoutState } from '../use_flyout_state';
import { useOnechatServices } from '../use_onechat_service';
import { useToasts } from '../use_toasts';
import { useOnechatTool } from './use_tools';

interface EditToolMutationVariables {
  toolId: string;
  tool: UpdateToolPayload;
}

type EditToolMutationOptions = UseMutationOptions<
  UpdateToolResponse,
  Error,
  EditToolMutationVariables
>;
type EditToolMutationSuccessCallback = NonNullable<EditToolMutationOptions['onSuccess']>;
type EditToolMutationErrorCallback = NonNullable<EditToolMutationOptions['onError']>;

export const useEditTool = ({
  onSuccess,
  onError,
}: {
  onSuccess?: EditToolMutationSuccessCallback;
  onError?: EditToolMutationErrorCallback;
} = {}) => {
  const queryClient = useQueryClient();
  const { toolsService } = useOnechatServices();

  const { mutate, mutateAsync, isLoading } = useMutation<
    UpdateToolResponse,
    Error,
    EditToolMutationVariables
  >({
    mutationFn: ({ toolId, tool }) => toolsService.update(toolId, tool),
    onSuccess,
    onError,
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.tools.all }),
  });

  return { updateToolSync: mutate, updateTool: mutateAsync, isLoading };
};

export const useEditToolFlyout = ({
  onSuccess,
  onError,
}: {
  onSuccess?: EditToolMutationSuccessCallback;
  onError?: EditToolMutationErrorCallback;
} = {}) => {
  const { addSuccessToast, addErrorToast } = useToasts();
  const { isOpen, openFlyout, closeFlyout } = useFlyoutState();
  const [editingToolId, setEditingToolId] = useState<string | null>(null);
  const { tool: editingTool, isLoading: isLoadingTool } = useOnechatTool(
    editingToolId ?? undefined
  );

  const handleOpenFlyout = useCallback(
    (toolId: string) => {
      setEditingToolId(toolId);
      openFlyout();
    },
    [openFlyout]
  );

  const handleCloseFlyout = useCallback(() => {
    setEditingToolId(null);
    closeFlyout();
  }, [closeFlyout]);

  const handleSuccess = useCallback<EditToolMutationSuccessCallback>(
    (tool) => {
      closeFlyout();
      addSuccessToast({
        title: labels.tools.editEsqlToolSuccessToast(tool.id),
      });
    },
    [closeFlyout, addSuccessToast]
  );

  const handleError = useCallback<EditToolMutationErrorCallback>(
    (error, { toolId }) => {
      addErrorToast({
        title: labels.tools.editEsqlToolErrorToast(toolId),
        text: formatOnechatErrorMessage(error),
      });
    },
    [addErrorToast]
  );

  const { updateTool, isLoading: isSubmitting } = useEditTool({
    onSuccess: handleSuccess,
    onError: handleError,
  });

  const saveTool = useCallback(
    async (toolData: UpdateToolPayload) => {
      if (!editingTool) return;
      await updateTool({ toolId: editingTool.id, tool: toolData }, { onSuccess, onError });
    },
    [updateTool, editingTool, onSuccess, onError]
  );

  return {
    isOpen,
    tool: editingTool,
    isLoading: isLoadingTool,
    isSubmitting,
    openFlyout: handleOpenFlyout,
    closeFlyout: handleCloseFlyout,
    submit: saveTool,
  };
};
