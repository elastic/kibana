/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolDefinitionWithSchema } from '@kbn/onechat-common';
import { UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { produce } from 'immer';
import { useCallback, useMemo, useState } from 'react';
import { CreateToolPayload, CreateToolResponse } from '../../../../common/http_api/tools';
import { queryKeys } from '../../query_keys';
import { duplicateName } from '../../utils/duplicate_name';
import { useFlyoutState } from '../use_flyout_state';
import { useOnechatServices } from '../use_onechat_service';
import { useOnechatTool } from './use_tools';

type CreateToolMutationOptions = UseMutationOptions<CreateToolResponse, Error, CreateToolPayload>;
type CreateToolMutationSuccessCallback = NonNullable<CreateToolMutationOptions['onSuccess']>;
type CreateToolMutationErrorCallback = NonNullable<CreateToolMutationOptions['onError']>;

export const useCreateTool = ({
  onSuccess,
  onError,
}: {
  onSuccess?: CreateToolMutationSuccessCallback;
  onError?: CreateToolMutationErrorCallback;
}) => {
  const queryClient = useQueryClient();
  const { toolsService } = useOnechatServices();

  const { mutateAsync, isLoading } = useMutation<CreateToolResponse, Error, CreateToolPayload>({
    mutationFn: (tool) => toolsService.create(tool),
    onSuccess,
    onError,
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.tools.all }),
  });

  return { createTool: mutateAsync, isLoading };
};

export type CreateToolSuccessCallback = (tool: ToolDefinitionWithSchema) => void;
export type CreateToolErrorCallback = (error: Error) => void;

export const useCreateToolFlyout = ({
  onSuccess,
  onError,
}: {
  onSuccess?: CreateToolSuccessCallback;
  onError?: CreateToolErrorCallback;
}) => {
  const { isOpen, openFlyout, closeFlyout } = useFlyoutState();
  const [sourceToolId, setSourceToolId] = useState<string | undefined>();
  const { tool: sourceTool, isLoading: isLoadingSourceTool } = useOnechatTool(sourceToolId);

  const handleOpenFlyout = useCallback(
    (toolId?: string) => {
      if (toolId) {
        setSourceToolId(toolId);
      }
      openFlyout();
    },
    [openFlyout]
  );

  const handleSuccess = useCallback<CreateToolMutationSuccessCallback>(
    (createdTool) => {
      closeFlyout();
      onSuccess?.(createdTool);
    },
    [closeFlyout, onSuccess]
  );

  const { createTool, isLoading: isSubmitting } = useCreateTool({
    onSuccess: handleSuccess,
    onError,
  });

  const tool = useMemo(() => {
    if (!sourceTool) {
      return;
    }
    return produce(sourceTool, (draft) => {
      draft.id = duplicateName(sourceTool.id);
    });
  }, [sourceTool]);

  return {
    isOpen,
    isSubmitting,
    isLoading: !!sourceToolId && isLoadingSourceTool,
    tool,
    openFlyout: handleOpenFlyout,
    submit: createTool,
    closeFlyout,
  };
};
