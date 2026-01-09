/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import type { ToolDefinitionWithSchema } from '@kbn/agent-builder-common';
import { useQuery } from '@kbn/react-query';
import { useEffect } from 'react';
import { queryKeys } from '../../query_keys';
import { labels } from '../../utils/i18n';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useToasts } from '../use_toasts';

export const useToolsService = () => {
  const { toolsService } = useAgentBuilderServices();

  const { data, isLoading, error, isError } = useQuery({
    queryKey: queryKeys.tools.all,
    queryFn: () => toolsService.list(),
  });

  return { tools: data ?? [], isLoading, error, isError };
};

export const useToolService = (toolId?: string) => {
  const { toolsService } = useAgentBuilderServices();

  const {
    data: tool,
    isLoading,
    error,
    isError,
  } = useQuery({
    enabled: !!toolId,
    queryKey: queryKeys.tools.byId(toolId),
    // toolId! is safe because of the enabled check above
    queryFn: () => toolsService.get({ toolId: toolId! }),
  });

  return {
    tool: tool as ToolDefinitionWithSchema | undefined,
    isLoading,
    error,
    isError,
  };
};

export interface UseToolProps {
  toolId?: string;
  onLoadingError?: (error: Error) => void;
}

export const useTool = ({ toolId, onLoadingError }: UseToolProps) => {
  const { addErrorToast } = useToasts();
  const { tool, isLoading, error, isError } = useToolService(toolId);

  useEffect(() => {
    if (toolId && isError) {
      const formattedError = formatAgentBuilderErrorMessage(error);
      addErrorToast({
        title: labels.tools.loadToolErrorToast(toolId),
        text: formattedError,
      });
      onLoadingError?.(new Error(formattedError));
    }
  }, [isError, error, toolId, addErrorToast, onLoadingError]);

  return {
    tool,
    isLoading,
    error,
    isError,
  };
};

export interface UseToolsWithErrorHandlingProps {
  onLoadingError?: (error: Error) => void;
}

export const useTools = ({ onLoadingError }: UseToolsWithErrorHandlingProps = {}) => {
  const { addErrorToast } = useToasts();
  const { tools, isLoading, error, isError } = useToolsService();

  useEffect(() => {
    if (isError) {
      const formattedError = formatAgentBuilderErrorMessage(error);
      addErrorToast({
        title: labels.tools.loadToolsErrorToast,
        text: formattedError,
      });
      onLoadingError?.(new Error(formattedError));
    }
  }, [isError, error, addErrorToast, onLoadingError]);

  return {
    tools,
    isLoading,
    error,
    isError,
  };
};
