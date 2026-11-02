/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import type { UseMutationOptions } from '@kbn/react-query';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { useCallback } from 'react';
import type { UpdateToolPayload, UpdateToolResponse } from '../../../../common/http_api/tools';
import { queryKeys } from '../../query_keys';
import { labels } from '../../utils/i18n';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useToasts } from '../use_toasts';
import { useTool } from './use_tools';

interface EditToolMutationVariables {
  toolId: string;
  tool: UpdateToolPayload;
}

type EditToolMutationOptions = UseMutationOptions<
  UpdateToolResponse,
  Error,
  EditToolMutationVariables
>;

export type EditToolSuccessCallback = NonNullable<EditToolMutationOptions['onSuccess']>;
export type EditToolErrorCallback = NonNullable<EditToolMutationOptions['onError']>;

export interface UseEditToolServiceProps {
  onSuccess?: EditToolSuccessCallback;
  onError?: EditToolErrorCallback;
}

export const useEditToolService = ({ onSuccess, onError }: UseEditToolServiceProps = {}) => {
  const queryClient = useQueryClient();
  const { toolsService } = useAgentBuilderServices();

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

export interface UseEditToolProps {
  toolId: string;
  onSuccess?: EditToolSuccessCallback;
  onError?: EditToolErrorCallback;
  onLoadingError?: (error: Error) => void;
}

export const useEditTool = ({ toolId, onSuccess, onError, onLoadingError }: UseEditToolProps) => {
  const { addSuccessToast, addErrorToast } = useToasts();
  const { tool: editingTool, isLoading } = useTool({ toolId, onLoadingError });

  const handleSuccess = useCallback<EditToolSuccessCallback>(
    (response, variables, context) => {
      addSuccessToast({
        title: labels.tools.editEsqlToolSuccessToast(response.id),
      });
      onSuccess?.(response, variables, context);
    },
    [addSuccessToast, onSuccess]
  );

  const handleError = useCallback<EditToolErrorCallback>(
    (error, variables, context) => {
      addErrorToast({
        title: labels.tools.editEsqlToolErrorToast(variables.toolId),
        text: formatAgentBuilderErrorMessage(error),
      });
      onError?.(error, variables, context);
    },
    [addErrorToast, onError]
  );

  const { updateTool, isLoading: isSubmitting } = useEditToolService({
    onSuccess: handleSuccess,
    onError: handleError,
  });

  const handleEditTool = useCallback(
    async (toolData: UpdateToolPayload) => {
      return updateTool({ toolId, tool: toolData });
    },
    [updateTool, toolId]
  );

  return {
    tool: editingTool,
    isLoading,
    isSubmitting,
    editTool: handleEditTool,
  };
};
