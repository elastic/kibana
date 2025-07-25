/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { DeleteToolResponse } from '../../../../common/http_api/tools';
import { queryKeys } from '../../query_keys';
import { useOnechatServices } from '../use_onechat_service';

type DeleteToolSuccessCallback = (data: DeleteToolResponse, variables: { toolId: string }) => void;
type DeleteToolErrorCallback = (error: Error, variables: { toolId: string }) => void;

export const useDeleteTool = ({
  onSuccess,
  onError,
}: {
  onSuccess?: DeleteToolSuccessCallback;
  onError?: DeleteToolErrorCallback;
}) => {
  const queryClient = useQueryClient();
  const { toolsService } = useOnechatServices();

  const { mutateAsync, isLoading } = useMutation({
    mutationFn: ({ toolId }: { toolId: string }) => toolsService.delete({ toolId }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.tools.all }),
    onSuccess,
    onError,
  });

  return { deleteTool: mutateAsync, isLoading };
};

export const useDeleteToolModal = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (toolId: string) => void;
  onError?: (toolId: string) => void;
}) => {
  const [deleteToolId, setDeleteToolId] = useState<string | null>(null);

  const isModalOpen = deleteToolId !== null;

  const deleteTool = useCallback((toolId: string) => {
    setDeleteToolId(toolId);
  }, []);

  const onDeleteSuccess: DeleteToolSuccessCallback = (data, { toolId }) => {
    if (!data.success) {
      onError?.(toolId);
      return;
    }

    onSuccess?.(toolId);
    setDeleteToolId(null);
  };

  const onDeleteError: DeleteToolErrorCallback = (_, { toolId }) => {
    onError?.(toolId);
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
    isModalOpen,
    isLoading,
    toolId: deleteToolId,
    deleteTool,
    confirmDelete,
    cancelDelete,
  };
};
