/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import type { PluginDefinition } from '@kbn/agent-builder-common';
import { useQuery } from '@kbn/react-query';
import { useEffect } from 'react';
import { queryKeys } from '../../query_keys';
import { labels } from '../../utils/i18n';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useToasts } from '../use_toasts';

const usePluginService = (pluginId?: string) => {
  const { pluginsService } = useAgentBuilderServices();

  const {
    data: plugin,
    isLoading,
    error,
    isError,
  } = useQuery({
    enabled: !!pluginId,
    queryKey: queryKeys.plugins.byId(pluginId),
    queryFn: () => pluginsService.get({ pluginId: pluginId! }),
  });

  return {
    plugin: plugin as PluginDefinition | undefined,
    isLoading,
    error,
    isError,
  };
};

export interface UsePluginProps {
  pluginId?: string;
  onLoadingError?: (error: Error) => void;
}

export const usePlugin = ({ pluginId, onLoadingError }: UsePluginProps) => {
  const { addErrorToast } = useToasts();
  const { plugin, isLoading, error, isError } = usePluginService(pluginId);

  useEffect(() => {
    if (pluginId && isError) {
      const formattedError = formatAgentBuilderErrorMessage(error);
      addErrorToast({
        title: labels.plugins.loadPluginErrorToast(pluginId),
        text: formattedError,
      });
      onLoadingError?.(new Error(formattedError));
    }
  }, [isError, error, pluginId, addErrorToast, onLoadingError]);

  return {
    plugin,
    isLoading,
    error,
    isError,
  };
};
