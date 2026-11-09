/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { McpToolDefinition } from '@kbn/agent-builder-common/tools';
import { CONNECTOR_ID as MCP_CONNECTOR_TYPE_ID } from '@kbn/connector-schemas/mcp/constants';
import type { McpToolHealthState, ToolHealthState } from '../../../../../common/http_api/tools';
import { getNotMcpConnectorMessage, listConnectorMcpTools } from './tool_type';

interface ConnectorTools {
  connectorError?: string;
  listToolsError?: string;
  mcpServerToolNames: string[];
}

const resolveConnectorTools = async ({
  actionsClient,
  connectorId,
}: {
  actionsClient: ActionsClient;
  connectorId: string;
}): Promise<ConnectorTools> => {
  const connector = await actionsClient.get({ id: connectorId }).catch(() => undefined);
  if (!connector) {
    return { connectorError: `Connector '${connectorId}' not found`, mcpServerToolNames: [] };
  }

  if (connector.actionTypeId !== MCP_CONNECTOR_TYPE_ID) {
    return {
      connectorError: getNotMcpConnectorMessage(connectorId, connector.actionTypeId),
      mcpServerToolNames: [],
    };
  }

  try {
    const { tools } = await listConnectorMcpTools({ actionsClient, connector });
    return { mcpServerToolNames: tools.map(({ name }) => name) };
  } catch (error) {
    return {
      listToolsError: error instanceof Error ? error.message : String(error),
      mcpServerToolNames: [],
    };
  }
};

const getToolStatus = ({
  connectorTools: { connectorError, listToolsError, mcpServerToolNames },
  mcpToolName,
  toolHealth,
}: {
  connectorTools: ConnectorTools;
  mcpToolName: string;
  toolHealth?: Pick<ToolHealthState, 'status' | 'errorMessage'>;
}): Pick<McpToolHealthState, 'status' | 'errorMessage'> => {
  if (connectorError) {
    return { status: 'connector_not_found', errorMessage: connectorError };
  }
  if (listToolsError) {
    return { status: 'list_tools_failed', errorMessage: listToolsError };
  }
  if (!mcpServerToolNames.includes(mcpToolName)) {
    return {
      status: 'tool_not_found',
      errorMessage: `Tool '${mcpToolName}' not found on MCP server`,
    };
  }
  if (toolHealth && toolHealth.status !== 'healthy') {
    return { status: 'tool_unhealthy', errorMessage: toolHealth.errorMessage };
  }
  return { status: 'healthy' };
};

/**
 * Computes the health of MCP tools from their connectors and recorded execution health.
 *
 * @param actionsClient - Actions client scoped to the current request.
 * @param mcpTools - MCP tools to check. Each referenced connector is loaded and listed once,
 * no matter how many tools share it.
 * @param healthStates - Recorded execution health for tools in the current space.
 * @returns One health state per tool, in the same order as `mcpTools`.
 */
export const getMcpToolsHealth = async ({
  actionsClient,
  mcpTools,
  healthStates,
}: {
  actionsClient: ActionsClient;
  mcpTools: ReadonlyArray<Pick<McpToolDefinition, 'id' | 'configuration'>>;
  healthStates: ReadonlyArray<Pick<ToolHealthState, 'toolId' | 'status' | 'errorMessage'>>;
}): Promise<McpToolHealthState[]> => {
  const healthByToolId = new Map(
    healthStates.map((healthState) => [healthState.toolId, healthState])
  );

  const connectorToolsById = new Map<string, Promise<ConnectorTools>>();
  const getConnectorTools = (connectorId: string): Promise<ConnectorTools> => {
    const existing = connectorToolsById.get(connectorId);
    if (existing) {
      return existing;
    }
    const resolved = resolveConnectorTools({ actionsClient, connectorId });
    connectorToolsById.set(connectorId, resolved);
    return resolved;
  };

  return Promise.all(
    mcpTools.map(
      async ({
        id: toolId,
        configuration: { connector_id: connectorId, tool_name: mcpToolName },
      }): Promise<McpToolHealthState> => ({
        toolId,
        connectorId,
        mcpToolName,
        ...getToolStatus({
          connectorTools: await getConnectorTools(connectorId),
          mcpToolName,
          toolHealth: healthByToolId.get(toolId),
        }),
      })
    )
  );
};
