/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/core/server';
import type { DataTypeDefinition } from '@kbn/data-sources-registry-plugin/server';
import { bulkCreateMcpTools } from '@kbn/agent-builder-plugin/server/services/tools/utils/bulk_create_mcp_tools';
import type { ToolRegistry } from '@kbn/agent-builder-plugin/server/services/tools';
import { getMcpTools } from '@kbn/agent-builder-plugin/server/services/tools/tool_types/mcp/tool_type';

export const createMcpConnector = async (
  registry: ToolRegistry,
  actions: ActionsPluginStart,
  request: KibanaRequest,
  connector: DataTypeDefinition,
  name: string,
  token: string,
  logger: Logger
) => {
  const actionsClient = await actions.getActionsClientWithRequest(request);
  const secrets: Record<string, string | Record<string, string>> = {
    secretHeaders: {
      Authorization: `Bearer ${token}`,
    },
  };
  const connectorConfig = connector.stackConnector.config as any;

  logger.info(`Creating MCP stack connector for '${name}'`);
  const stackConnector = await actionsClient.create({
    action: {
      name: `mcp stack connector for data connector '${name}'`,
      actionTypeId: '.mcp',
      config: {
        ...connectorConfig,
      },
      secrets,
    },
  });

  if (connector.importedTools && connector.importedTools.length > 0) {
    try {
      const mcpTools = await getMcpTools({
        actions,
        request,
        connectorId: stackConnector.id,
        toolNames: connector.importedTools,
      });
      if (mcpTools && mcpTools.length > 0) {
        await bulkCreateMcpTools({
          registry,
          actions,
          request,
          connectorId: stackConnector.id,
          tools: mcpTools,
          namespace: name,
        });
      }
    } catch (error) {
      throw new Error(`Error creating MCP tools for ${name}: ${error}`);
    }
  }
  return stackConnector;
};
