/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { DeleteToolResponse } from '../../../../common/http_api/tools';
import { queryKeys } from '../../query_keys';
import { useOnechatServices } from '../use_onechat_service';

interface DeleteToolMutationVariables {
  toolId: string;
}

type DeleteToolMutationOptions = UseMutationOptions<
  DeleteToolResponse,
  Error,
  DeleteToolMutationVariables
>;

type DeleteToolMutationSuccessCallback = NonNullable<DeleteToolMutationOptions['onSuccess']>;
type DeleteToolMutationErrorCallback = NonNullable<DeleteToolMutationOptions['onError']>;

export const useDeleteTool = ({
  onSuccess,
  onError,
}: {
  onSuccess?: DeleteToolMutationSuccessCallback;
  onError?: DeleteToolMutationErrorCallback;
}) => {
  const queryClient = useQueryClient();
  const { toolsService } = useOnechatServices();

  const { mutateAsync, isLoading } = useMutation<
    DeleteToolResponse,
    Error,
    DeleteToolMutationVariables
  >({
    mutationFn: ({ toolId }) => toolsService.delete({ toolId }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.tools.all }),
    onSuccess,
    onError,
  });

  return { deleteTool: mutateAsync, isLoading };
};

export type DeleteToolSuccessCallback = (toolId: string) => void;
export type DeleteToolErrorCallback = (
  error: Error,
  variables: DeleteToolMutationVariables
) => void;

export const useDeleteToolModal = ({
  onSuccess,
  onError,
}: {
  onSuccess?: DeleteToolSuccessCallback;
  onError?: DeleteToolErrorCallback;
}) => {
  const [deleteToolId, setDeleteToolId] = useState<string | null>(null);

  const isModalOpen = deleteToolId !== null;

  const deleteTool = useCallback((toolId: string) => {
    setDeleteToolId(toolId);
  }, []);

  const onDeleteSuccess: DeleteToolMutationSuccessCallback = (data, { toolId }) => {
    if (!data.success) {
      onError?.(new Error('Delete operation failed. API returned: { success: false }'), { toolId });
      return;
    }

    onSuccess?.(toolId);
    setDeleteToolId(null);
  };

  const onDeleteError: DeleteToolMutationErrorCallback = (error, { toolId }) => {
    onError?.(error, { toolId });
  };

  const { deleteTool: deleteToolMutation, isLoading } = useDeleteTool({
    onSuccess: onDeleteSuccess,
    onError: onDeleteError,
  });

  const confirmDelete = useCallback(async () => {
    if (!deleteToolId) {
      return;
    }

    await deleteToolMutation({ toolId: deleteToolId });
  }, [deleteToolId, deleteToolMutation]);

  const cancelDelete = useCallback(() => {
    setDeleteToolId(null);
  }, []);

  return {
    isOpen: isModalOpen,
    isLoading,
    toolId: deleteToolId,
    deleteTool,
    confirmDelete,
    cancelDelete,
  };
};
