/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { UpdateToolPayload, UpdateToolResponse } from '../../../../common/http_api/tools';
import { queryKeys } from '../../query_keys';
import { useFlyoutState } from '../use_flyout_state';
import { useOnechatServices } from '../use_onechat_service';
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
}) => {
  const queryClient = useQueryClient();
  const { toolsService } = useOnechatServices();

  const { mutateAsync, isLoading } = useMutation<
    UpdateToolResponse,
    Error,
    EditToolMutationVariables
  >({
    mutationFn: ({ toolId, tool }) => toolsService.update(toolId, tool),
    onSuccess,
    onError,
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.tools.all }),
  });

  return { updateTool: mutateAsync, isLoading };
};

export type EditToolSuccessCallback = (tool: UpdateToolResponse) => void;
export type EditToolErrorCallback = (error: Error, variables: EditToolMutationVariables) => void;

export const useEditToolFlyout = ({
  onSuccess,
  onError,
}: {
  onSuccess?: EditToolSuccessCallback;
  onError?: EditToolErrorCallback;
}) => {
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
      onSuccess?.(tool);
    },
    [closeFlyout, onSuccess]
  );

  const handleError = useCallback<EditToolMutationErrorCallback>(
    (error, variables) => {
      onError?.(error, variables);
    },
    [onError]
  );

  const { updateTool, isLoading: isSubmitting } = useEditTool({
    onSuccess: handleSuccess,
    onError: handleError,
  });

  const saveTool = useCallback(
    async (toolData: UpdateToolPayload) => {
      if (!editingTool) return;
      await updateTool({ toolId: editingTool.id, tool: toolData });
    },
    [updateTool, editingTool]
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
