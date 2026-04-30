/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type { McpGatewayConfig } from '@kbn/agent-builder-common';
import { queryKeys } from '../../query_keys';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useToasts } from '../use_toasts';
import { labels } from '../../utils/i18n';

const EMPTY_CONFIG: McpGatewayConfig = { enabled: false, connectors: [] };

export const useMcpGatewayConfig = () => {
  const { toolsService } = useAgentBuilderServices();

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.mcpGateway.config,
    queryFn: () => toolsService.getMcpGatewayConfig(),
  });

  return {
    config: data?.config ?? EMPTY_CONFIG,
    isLoading,
    isError,
  };
};

export const useUpdateMcpGatewayConfig = () => {
  const { toolsService } = useAgentBuilderServices();
  const queryClient = useQueryClient();
  const { addSuccessToast, addErrorToast } = useToasts();

  const { mutateAsync, isLoading } = useMutation({
    mutationFn: (config: McpGatewayConfig) => toolsService.updateMcpGatewayConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mcpGateway.config });
      addSuccessToast({ title: labels.mcpGateway.savedSuccessToast });
    },
    onError: () => {
      addErrorToast({ title: labels.mcpGateway.saveErrorToast });
    },
  });

  return { updateConfig: mutateAsync, isUpdating: isLoading };
};
