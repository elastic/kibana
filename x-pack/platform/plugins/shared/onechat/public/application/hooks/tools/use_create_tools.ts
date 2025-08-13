/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatOnechatErrorMessage } from '@kbn/onechat-browser';
import { UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { produce } from 'immer';
import { useCallback, useMemo, useState } from 'react';
import { CreateToolPayload, CreateToolResponse } from '../../../../common/http_api/tools';
import { queryKeys } from '../../query_keys';
import { duplicateName } from '../../utils/duplicate_name';
import { labels } from '../../utils/i18n';
import { useFlyoutState } from '../use_flyout_state';
import { useOnechatServices } from '../use_onechat_service';
import { useToasts } from '../use_toasts';
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
} = {}) => {
  const queryClient = useQueryClient();
  const { toolsService } = useOnechatServices();

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

export const useCreateToolFlyout = ({
  onSuccess,
  onError,
}: {
  onSuccess?: CreateToolMutationSuccessCallback;
  onError?: CreateToolMutationErrorCallback;
} = {}) => {
  const { addSuccessToast, addErrorToast } = useToasts();
  const { isOpen, openFlyout, closeFlyout } = useFlyoutState();
  const [sourceToolId, setSourceToolId] = useState<string | undefined>();
  const { tool: sourceTool, isLoading: isLoadingSourceTool } = useOnechatTool(sourceToolId);

  const duplicateTool = useMemo(() => {
    if (!sourceTool) {
      return;
    }
    return produce(sourceTool, (draft) => {
      draft.id = duplicateName(sourceTool.id);
    });
  }, [sourceTool]);

  const handleOpenFlyout = useCallback(
    (toolId?: string) => {
      if (toolId) {
        setSourceToolId(toolId);
      }
      openFlyout();
    },
    [openFlyout]
  );

  const handleCloseFlyout = useCallback(() => {
    setSourceToolId(undefined);
    closeFlyout();
  }, [closeFlyout]);

  const handleSuccess = useCallback<CreateToolMutationSuccessCallback>(
    (tool) => {
      closeFlyout();
      addSuccessToast({
        title: labels.tools.createEsqlToolSuccessToast(tool.id),
      });
    },
    [closeFlyout, addSuccessToast]
  );

  const handleError = useCallback<CreateToolMutationErrorCallback>(
    (error) => {
      addErrorToast({
        title: labels.tools.createEsqlToolErrorToast,
        text: formatOnechatErrorMessage(error),
      });
    },
    [addErrorToast]
  );
  const { createTool: createToolMutation, isLoading: isSubmitting } = useCreateTool({
    onSuccess: handleSuccess,
    onError: handleError,
  });

  const createTool = useCallback(
    async (tool: CreateToolPayload) => {
      await createToolMutation(tool, { onSuccess, onError });
    },
    [createToolMutation, onSuccess, onError]
  );

  return {
    isOpen,
    isSubmitting,
    isLoading: !!sourceToolId && isLoadingSourceTool,
    sourceTool: duplicateTool,
    submit: createTool,
    openFlyout: handleOpenFlyout,
    closeFlyout: handleCloseFlyout,
  };
};
