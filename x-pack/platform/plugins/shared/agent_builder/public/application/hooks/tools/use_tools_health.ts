/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { ToolHealthState, McpToolHealthState } from '../../../../common/http_api/tools';
import { queryKeys } from '../../query_keys';
import { useAgentBuilderServices } from '../use_agent_builder_service';

const EMPTY_MCP_HEALTH_STATES: readonly McpToolHealthState[] = [];

const EMPTY_HEALTH_STATES: readonly ToolHealthState[] = [];

export const useToolsHealth = () => {
  const { toolsService } = useAgentBuilderServices();

  const { data, ...queryFields } = useQuery({
    queryKey: queryKeys.tools.health.list(),
    queryFn: () => toolsService.listToolsHealth(),
    retry: false,
  });

  return {
    healthStates: data?.results ?? EMPTY_HEALTH_STATES,
    ...queryFields,
  };
};

export interface UseToolHealthOptions {
  toolId: string;
  enabled?: boolean;
}

export const useToolHealth = ({ toolId }: UseToolHealthOptions) => {
  const { toolsService } = useAgentBuilderServices();

  const { data, ...queryFields } = useQuery({
    queryKey: queryKeys.tools.health.byId(toolId),
    queryFn: () => toolsService.getToolHealth({ toolId }),
    enabled: !!toolId,
    retry: false,
  });

  return {
    toolHealth: data?.health,
    ...queryFields,
  };
};

export const useMcpToolsHealth = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const { toolsService } = useAgentBuilderServices();

  const { data, ...queryFields } = useQuery({
    queryKey: queryKeys.tools.health.mcp(),
    queryFn: () => toolsService.listMcpToolsHealth(),
    enabled,
    retry: false,
  });

  return {
    mcpHealthStates: data?.results ?? EMPTY_MCP_HEALTH_STATES,
    ...queryFields,
  };
};
