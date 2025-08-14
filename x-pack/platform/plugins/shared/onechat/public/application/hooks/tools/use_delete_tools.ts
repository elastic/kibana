/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatOnechatErrorMessage } from '@kbn/onechat-browser';
import { UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { BulkDeleteToolResponse, DeleteToolResponse } from '../../../../common/http_api/tools';
import { queryKeys } from '../../query_keys';
import { labels } from '../../utils/i18n';
import { useOnechatServices } from '../use_onechat_service';
import { useToasts } from '../use_toasts';

interface DeleteToolMutationVariables {
  toolId: string;
}

type DeleteToolMutationOptions = UseMutationOptions<
  DeleteToolResponse,
  Error,
  DeleteToolMutationVariables
>;

type DeleteToolSuccessCallback = NonNullable<DeleteToolMutationOptions['onSuccess']>;
type DeleteToolErrorCallback = NonNullable<DeleteToolMutationOptions['onError']>;

interface DeleteToolsMutationVariables {
  toolIds: string[];
}

type DeleteToolsMutationOptions = UseMutationOptions<
  BulkDeleteToolResponse,
  Error,
  DeleteToolsMutationVariables
>;

type DeleteToolsSuccessCallback = NonNullable<DeleteToolsMutationOptions['onSuccess']>;
type DeleteToolsErrorCallback = NonNullable<DeleteToolsMutationOptions['onError']>;

export const useDeleteToolService = ({
  onSuccess,
  onError,
}: {
  onSuccess?: DeleteToolSuccessCallback;
  onError?: DeleteToolErrorCallback;
} = {}) => {
  const queryClient = useQueryClient();
  const { toolsService } = useOnechatServices();

  const { mutate, mutateAsync, isLoading } = useMutation<
    DeleteToolResponse,
    Error,
    DeleteToolMutationVariables
  >({
    mutationFn: ({ toolId }) => toolsService.delete({ toolId }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.tools.all }),
    onSuccess,
    onError,
  });

  return { deleteToolSync: mutate, deleteTool: mutateAsync, isLoading };
};

export const useDeleteToolsService = ({
  onSuccess,
  onError,
}: {
  onSuccess?: DeleteToolsSuccessCallback;
  onError?: DeleteToolsErrorCallback;
} = {}) => {
  const queryClient = useQueryClient();
  const { toolsService } = useOnechatServices();

  const { mutate, mutateAsync, isLoading } = useMutation<
    BulkDeleteToolResponse,
    Error,
    DeleteToolsMutationVariables
  >({
    mutationFn: ({ toolIds }) => toolsService.bulkDelete(toolIds),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.tools.all }),
    onSuccess,
    onError,
  });

  return { deleteToolsSync: mutate, deleteTools: mutateAsync, isLoading };
};

export const useDeleteTool = ({
  onSuccess,
  onError,
}: {
  onSuccess?: DeleteToolSuccessCallback;
  onError?: DeleteToolErrorCallback;
} = {}) => {
  const { addSuccessToast, addErrorToast } = useToasts();
  const [deleteToolId, setDeleteToolId] = useState<string | null>(null);

  const isModalOpen = deleteToolId !== null;

  const deleteTool = useCallback((toolId: string) => {
    setDeleteToolId(toolId);
  }, []);

  const handleSuccess: DeleteToolSuccessCallback = (data, { toolId }) => {
    if (!data.success) {
      addErrorToast({
        title: labels.tools.deleteToolErrorToast(toolId),
        text: formatOnechatErrorMessage(
          new Error('Delete operation failed. API returned: { success: false }')
        ),
      });
      return;
    }

    addSuccessToast({
      title: labels.tools.deleteToolSuccessToast(toolId),
    });
    setDeleteToolId(null);
  };

  const handleError: DeleteToolErrorCallback = (error, { toolId }) => {
    addErrorToast({
      title: labels.tools.deleteToolErrorToast(toolId),
      text: formatOnechatErrorMessage(error),
    });
  };

  const { deleteTool: deleteToolMutation, isLoading } = useDeleteToolService({
    onSuccess: handleSuccess,
    onError: handleError,
  });

  const confirmDelete = useCallback(async () => {
    if (!deleteToolId) {
      return;
    }

    await deleteToolMutation({ toolId: deleteToolId }, { onSuccess, onError });
  }, [deleteToolId, deleteToolMutation, onSuccess, onError]);

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

export const useDeleteTools = ({
  onSuccess,
  onError,
}: {
  onSuccess?: DeleteToolsSuccessCallback;
  onError?: DeleteToolsErrorCallback;
} = {}) => {
  const { addSuccessToast, addErrorToast } = useToasts();
  const [deleteToolIds, setDeleteToolIds] = useState<string[]>([]);

  const isModalOpen = deleteToolIds.length > 0;

  const deleteTools = useCallback((toolIds: string[]) => {
    setDeleteToolIds(toolIds);
  }, []);

  const handleSuccess: DeleteToolsSuccessCallback = ({ results }, { toolIds }) => {
    if (results.some((result) => !result.success)) {
      const failedTools = results
        .filter((result) => !result.success)
        .map((result) => result.toolId);
      if (failedTools.length === toolIds.length) {
        addErrorToast({
          title: labels.tools.bulkDeleteToolsErrorToast(toolIds.length),
          text: formatOnechatErrorMessage(new Error('Delete operation failed for all tools.')),
        });
      } else {
        addErrorToast({
          title: labels.tools.bulkDeleteToolsErrorToast(failedTools.length),
          text: formatOnechatErrorMessage(
            new Error('Delete operation failed for some tools: ' + failedTools.join(', '))
          ),
        });
        setDeleteToolIds([]);
      }
      return;
    }

    addSuccessToast({
      title: labels.tools.bulkDeleteToolsSuccessToast(toolIds.length),
    });
    setDeleteToolIds([]);
  };

  const handleError: DeleteToolsErrorCallback = (error, { toolIds }) => {
    addErrorToast({
      title: labels.tools.bulkDeleteToolsErrorToast(toolIds.length),
      text: formatOnechatErrorMessage(error),
    });
  };

  const { deleteTools: deleteToolsMutation, isLoading } = useDeleteToolsService({
    onSuccess: handleSuccess,
    onError: handleError,
  });

  const confirmDelete = useCallback(async () => {
    if (!deleteToolIds.length) {
      throw new Error('confirmDelete called outside of modal context');
    }

    return await deleteToolsMutation({ toolIds: deleteToolIds }, { onSuccess, onError });
  }, [deleteToolIds, deleteToolsMutation, onSuccess, onError]);

  const cancelDelete = useCallback(() => {
    setDeleteToolIds([]);
  }, []);

  return {
    isOpen: isModalOpen,
    isLoading,
    toolIds: deleteToolIds,
    deleteTools,
    confirmDelete,
    cancelDelete,
  };
};
