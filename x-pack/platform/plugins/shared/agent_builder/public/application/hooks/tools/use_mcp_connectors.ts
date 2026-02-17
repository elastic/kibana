/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { Tool as McpTool } from '@kbn/mcp-client';
import type { ConnectorItem } from '../../../../common/http_api/tools';
import { queryKeys } from '../../query_keys';
import { useAgentBuilderServices } from '../use_agent_builder_service';

const EMPTY_CONNECTORS: readonly ConnectorItem[] = [];
const EMPTY_TOOLS: readonly McpTool[] = [];

export interface UseListConnectorsOptions {
  type?: string;
}
export const useListConnectors = ({ type }: UseListConnectorsOptions) => {
  const { toolsService } = useAgentBuilderServices();
  const { data, ...queryFields } = useQuery({
    queryKey: queryKeys.tools.connectors.list(type),
    queryFn: () => toolsService.listConnectors({ type }),
  });
  return {
    connectors: data?.connectors ?? EMPTY_CONNECTORS,
    ...queryFields,
  };
};

export const useGetConnector = ({ connectorId }: { connectorId: string }) => {
  const { toolsService } = useAgentBuilderServices();
  const { data, ...queryFields } = useQuery({
    queryKey: queryKeys.tools.connectors.get(connectorId),
    queryFn: () => toolsService.getConnector({ connectorId }),
    enabled: !!connectorId,
  });
  return {
    connector: data?.connector,
    ...queryFields,
  };
};

export const useListMcpTools = ({ connectorId }: { connectorId: string }) => {
  const { toolsService } = useAgentBuilderServices();
  const { data, ...queryFields } = useQuery({
    queryKey: queryKeys.tools.connectors.listMcpTools(connectorId),
    queryFn: () => toolsService.listMcpTools({ connectorId }),
    enabled: !!connectorId,
  });
  return {
    mcpTools: data?.mcpTools ?? EMPTY_TOOLS,
    ...queryFields,
  };
};
