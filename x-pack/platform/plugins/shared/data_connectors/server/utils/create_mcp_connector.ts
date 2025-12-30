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
import { bulkCreateMcpTools } from '@kbn/onechat-plugin/server/services/tools/utils/bulk_create_mcp_tools';
import type { ToolRegistry } from '@kbn/onechat-plugin/server/services/tools';
import { getMcpTools } from '@kbn/onechat-plugin/server/services/tools/tool_types/mcp/tool_type';

export const createMcpConnector = async (
  registry: ToolRegistry,
  actions: ActionsPluginStart,
  request: KibanaRequest,
  connector: DataTypeDefinition,
  name: string,
  token: string,
  kibanaLogger: Logger
) => {
  const actionsClient = await actions.getActionsClientWithRequest(request);
  const secrets: Record<string, string> = {};
  const connectorConfig = connector.stackConnector.config as any;

  const stackConnector = await actionsClient.create({
    action: {
      name: `mcp stack connector for data connector '${name}'`,
      actionTypeId: '.mcp',
      config: {
        // TODO: Make the token an encrypted secret but currently there's a bug with testing MCP connector with encrypted secrets
        ...connectorConfig,
        headers: {
          Authorization: `${token}`,
        },
      },
      secrets,
    },
  });

  if (connector.importedTools) {
    try {
      const mcpTools = await getMcpTools({
        actions,
        request,
        connectorId: stackConnector.id,
        toolNames: connector.importedTools,
      });
      const results = await bulkCreateMcpTools({
        registry,
        actions,
        request,
        connectorId: stackConnector.id,
        tools: mcpTools,
        namespace: name,
        kibanaLogger,
      });
      kibanaLogger.info(`Bulk create MCP tools results: ${JSON.stringify(results)}`);
    } catch (error) {
      kibanaLogger.error(`Error creating MCP tools: ${error}`);
      throw error;
    }
  }
  return stackConnector;
};
