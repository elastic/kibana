/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { fromJSONSchema } from '@kbn/zod/v4/from_json_schema';
import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { McpGatewayConfig } from '@kbn/agent-builder-common';
import { listMcpTools } from '../tools/tool_types/mcp/tool_type';
import { McpGatewayConfigStorage } from './storage';
import { McpGatewayToolsCache } from './tools_cache';

export interface ProxyTool {
  mcpName: string;
  description: string;
  /** Synthetic namespace for filtering: `mcp_gateway.{connectorSlug}` */
  namespace: string;
  schemaShape: z.ZodRawShape;
  execute: (
    args: Record<string, unknown>
  ) => Promise<{ content: Array<{ type: 'text'; text: string }> }>;
}

export class McpGatewayService {
  private readonly storage: McpGatewayConfigStorage;
  private readonly toolsCache: McpGatewayToolsCache;

  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly actions: ActionsPluginStart,
    private readonly logger: Logger
  ) {
    this.storage = new McpGatewayConfigStorage(esClient, logger.get('storage'));
    this.toolsCache = new McpGatewayToolsCache();
  }

  async getConfig(spaceId: string): Promise<McpGatewayConfig> {
    return this.storage.getConfig(spaceId);
  }

  async updateConfig(spaceId: string, config: McpGatewayConfig): Promise<void> {
    await this.storage.updateConfig(spaceId, config);
    // Invalidate cache for all changed connectors so tool lists are refreshed promptly
    for (const connector of config.connectors) {
      this.toolsCache.invalidate(spaceId, connector.connectorId);
    }
  }

  async getProxyTools({
    request,
    spaceId,
  }: {
    request: KibanaRequest;
    spaceId: string;
  }): Promise<ProxyTool[]> {
    const config = await this.storage.getConfig(spaceId);
    if (!config.enabled) {
      return [];
    }

    const enabledConnectors = config.connectors.filter((c) => c.enabled);
    const proxyTools: ProxyTool[] = [];

    await Promise.all(
      enabledConnectors.map(async ({ connectorId, connectorSlug }) => {
        try {
          let tools = this.toolsCache.get(spaceId, connectorId);
          if (!tools) {
            const result = await listMcpTools({
              actions: this.actions,
              request,
              connectorId,
            });
            tools = result.tools;
            this.toolsCache.set(spaceId, connectorId, tools);
          }

          for (const tool of tools) {
            const zodSchema = tool.inputSchema
              ? ((fromJSONSchema(tool.inputSchema as Record<string, unknown>) ??
                  z.object({})) as z.ZodObject<z.ZodRawShape>)
              : z.object({});

            const connectorId_ = connectorId;
            const toolName = tool.name;

            proxyTools.push({
              mcpName: `${connectorSlug}__${tool.name}`,
              description: tool.description ?? `Tool '${tool.name}' from MCP connector`,
              namespace: `mcp_gateway.${connectorSlug}`,
              schemaShape: zodSchema.shape,
              execute: async (args) => {
                const actionsClient = await this.actions.getActionsClientWithRequest(request);
                const result = await actionsClient.execute({
                  actionId: connectorId_,
                  params: {
                    subAction: 'callTool',
                    subActionParams: { name: toolName, arguments: args },
                  },
                });

                if (result.status === 'error') {
                  return {
                    content: [
                      {
                        type: 'text' as const,
                        text: JSON.stringify({
                          isError: true,
                          message: result.message ?? 'MCP tool execution failed',
                        }),
                      },
                    ],
                  };
                }

                return {
                  content: [{ type: 'text' as const, text: JSON.stringify(result.data) }],
                };
              },
            });
          }
        } catch (error) {
          // A failed connector should not break the entire MCP server response
          this.logger.warn(
            `MCP Gateway: failed to list tools for connector ${connectorId}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      })
    );

    return proxyTools;
  }
}
