/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { ToolHealthState } from '../../../../common/http_api/tools';
import { queryKeys } from '../../query_keys';
import { useOnechatServices } from '../use_onechat_service';

const EMPTY_HEALTH_STATES: readonly ToolHealthState[] = [];

/**
 * Hook to fetch health statuses for all tools in the current space.
 */
export const useToolsHealth = () => {
  const { toolsService } = useOnechatServices();

  const { data, isLoading, error, isError, refetch } = useQuery({
    queryKey: queryKeys.tools.health.list(),
    queryFn: () => toolsService.listToolsHealth(),
  });

  return {
    healthStates: data?.results ?? EMPTY_HEALTH_STATES,
    isLoading,
    error,
    isError,
    refetch,
  };
};

export interface UseToolHealthOptions {
  toolId: string;
  enabled?: boolean;
}

/**
 * Hook to fetch health status for a specific tool.
 */
export const useToolHealth = ({ toolId }: UseToolHealthOptions) => {
  const { toolsService } = useOnechatServices();

  const { data, isLoading, error, isError, refetch } = useQuery({
    queryKey: queryKeys.tools.health.byId(toolId),
    queryFn: () => toolsService.getToolHealth({ toolId }),
    enabled: !!toolId,
  });

  return {
    toolHealth: data?.health,
    isLoading,
    error,
    isError,
    refetch,
  };
};
