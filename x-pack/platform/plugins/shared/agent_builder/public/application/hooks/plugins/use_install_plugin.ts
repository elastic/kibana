/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { useCallback } from 'react';
import type { InstallPluginResponse } from '../../../../common/http_api/plugins';
import { queryKeys } from '../../query_keys';
import { labels } from '../../utils/i18n';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useToasts } from '../use_toasts';

interface InstallFromUrlVariables {
  url: string;
  pluginName?: string;
}

export const useInstallPluginFromUrl = ({
  onSuccess,
}: {
  onSuccess?: (data: InstallPluginResponse) => void;
} = {}) => {
  const queryClient = useQueryClient();
  const { pluginsService } = useAgentBuilderServices();
  const { addSuccessToast, addErrorToast } = useToasts();

  const handleSuccess = useCallback(
    (data: InstallPluginResponse) => {
      addSuccessToast({ title: labels.plugins.installPluginSuccessToast(data.name) });
      onSuccess?.(data);
    },
    [addSuccessToast, onSuccess]
  );

  const handleError = useCallback(
    (error: Error) => {
      addErrorToast({
        title: labels.plugins.installPluginErrorToast,
        text: formatAgentBuilderErrorMessage(error),
      });
    },
    [addErrorToast]
  );

  const { mutateAsync, isLoading } = useMutation<
    InstallPluginResponse,
    Error,
    InstallFromUrlVariables
  >({
    mutationFn: ({ url, pluginName }) => pluginsService.installFromUrl({ url, pluginName }),
    onSuccess: handleSuccess,
    onError: handleError,
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.plugins.all }),
  });

  return { installFromUrl: mutateAsync, isLoading };
};

interface UploadPluginVariables {
  file: File;
  pluginName?: string;
}

export const useUploadPlugin = ({
  onSuccess,
}: {
  onSuccess?: (data: InstallPluginResponse) => void;
} = {}) => {
  const queryClient = useQueryClient();
  const { pluginsService } = useAgentBuilderServices();
  const { addSuccessToast, addErrorToast } = useToasts();

  const handleSuccess = useCallback(
    (data: InstallPluginResponse) => {
      addSuccessToast({ title: labels.plugins.uploadPluginSuccessToast(data.name) });
      onSuccess?.(data);
    },
    [addSuccessToast, onSuccess]
  );

  const handleError = useCallback(
    (error: Error) => {
      addErrorToast({
        title: labels.plugins.uploadPluginErrorToast,
        text: formatAgentBuilderErrorMessage(error),
      });
    },
    [addErrorToast]
  );

  const { mutateAsync, isLoading } = useMutation<
    InstallPluginResponse,
    Error,
    UploadPluginVariables
  >({
    mutationFn: ({ file, pluginName }) => pluginsService.upload({ file, pluginName }),
    onSuccess: handleSuccess,
    onError: handleError,
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.plugins.all }),
  });

  return { uploadPlugin: mutateAsync, isLoading };
};
