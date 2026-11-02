/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import { useQuery } from '@kbn/react-query';
import { useEffect } from 'react';
import { queryKeys } from '../../query_keys';
import { labels } from '../../utils/i18n';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useToasts } from '../use_toasts';

export const usePluginsService = () => {
  const { pluginsService } = useAgentBuilderServices();

  const { data, isLoading, error, isError } = useQuery({
    queryKey: queryKeys.plugins.all,
    queryFn: () => pluginsService.list(),
  });

  return { plugins: data ?? [], isLoading, error, isError };
};

export interface UsePluginsProps {
  onLoadingError?: (error: Error) => void;
}

export const usePlugins = ({ onLoadingError }: UsePluginsProps = {}) => {
  const { addErrorToast } = useToasts();
  const { plugins, isLoading, error, isError } = usePluginsService();

  useEffect(() => {
    if (isError) {
      const formattedError = formatAgentBuilderErrorMessage(error);
      addErrorToast({
        title: labels.plugins.loadPluginsErrorToast,
        text: formattedError,
      });
      onLoadingError?.(new Error(formattedError));
    }
  }, [isError, error, addErrorToast, onLoadingError]);

  return {
    plugins,
    isLoading,
    error,
    isError,
  };
};
