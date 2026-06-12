/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import type { UseMutationOptions } from '@kbn/react-query';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { produce } from 'immer';
import { useCallback, useMemo } from 'react';
import type { CreateToolPayload, CreateToolResponse } from '../../../../common/http_api/tools';
import { queryKeys } from '../../query_keys';
import { duplicateName } from '../../utils/duplicate_name';
import { labels } from '../../utils/i18n';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useToasts } from '../use_toasts';
import { useTool } from './use_tools';

type CreateToolMutationOptions = UseMutationOptions<CreateToolResponse, Error, CreateToolPayload>;

export type CreateToolSuccessCallback = NonNullable<CreateToolMutationOptions['onSuccess']>;
export type CreateToolErrorCallback = NonNullable<CreateToolMutationOptions['onError']>;

export interface UseCreateToolServiceProps {
  onSuccess?: CreateToolSuccessCallback;
  onError?: CreateToolErrorCallback;
}

export const useCreateToolService = ({ onSuccess, onError }: UseCreateToolServiceProps = {}) => {
  const queryClient = useQueryClient();
  const { toolsService } = useAgentBuilderServices();

  const { mutate, mutateAsync, isLoading } = useMutation<
    CreateToolResponse,
    Error,
    CreateToolPayload
  >({
    mutationFn: (tool) => toolsService.create(tool),
    onSuccess,
    onError,
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.tools.all }),
  });

  return { createToolSync: mutate, createTool: mutateAsync, isLoading };
};

export interface UseCreateToolProps {
  sourceToolId?: string;
  onSuccess?: CreateToolSuccessCallback;
  onError?: CreateToolErrorCallback;
  onLoadingError?: (error: Error) => void;
}

export const useCreateTool = ({
  sourceToolId,
  onSuccess,
  onError,
  onLoadingError,
}: UseCreateToolProps = {}) => {
  const { addSuccessToast, addErrorToast } = useToasts();
  const { tool: sourceTool, isLoading } = useTool({ toolId: sourceToolId, onLoadingError });

  const handleSuccess = useCallback<CreateToolSuccessCallback>(
    (response, variables, context) => {
      addSuccessToast({
        title: labels.tools.createEsqlToolSuccessToast(response.id),
      });
      onSuccess?.(response, variables, context);
    },
    [addSuccessToast, onSuccess]
  );

  const handleError = useCallback<CreateToolErrorCallback>(
    (error, variables, context) => {
      addErrorToast({
        title: labels.tools.createEsqlToolErrorToast,
        text: formatAgentBuilderErrorMessage(error),
      });
      onError?.(error, variables, context);
    },
    [addErrorToast, onError]
  );

  const { createTool, isLoading: isSubmitting } = useCreateToolService({
    onSuccess: handleSuccess,
    onError: handleError,
  });

  const handleCreateTool = useCallback(
    async (tool: CreateToolPayload) => {
      return createTool(tool);
    },
    [createTool]
  );

  const sourceToolClone = useMemo(() => {
    if (!sourceTool) {
      return;
    }
    return produce(sourceTool, (draft) => {
      draft.id = duplicateName(sourceTool.id);
    });
  }, [sourceTool]);

  return {
    sourceTool: sourceToolClone,
    isLoading: !!sourceToolId && isLoading,
    isSubmitting,
    createTool: handleCreateTool,
  };
};
