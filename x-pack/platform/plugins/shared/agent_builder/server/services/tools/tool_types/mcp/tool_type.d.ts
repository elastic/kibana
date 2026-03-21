import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type { McpToolConfig } from '@kbn/agent-builder-common/tools';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { ListToolsResponse } from '@kbn/mcp-client';
import type { Logger } from '@kbn/core/server';
import type { ToolTypeDefinition } from '../definitions';
/**
 * Lists available tools from an MCP connector by calling the listTools subAction.
 */
export declare function listMcpTools({ actions, request, connectorId, }: {
    actions: ActionsPluginStart;
    request: KibanaRequest;
    connectorId: string;
}): Promise<ListToolsResponse>;
/**
 * Retrieves a specific MCP tool by name by calling listTools on the connector.
 * Returns undefined if the connector or tool is not found.
 */
export declare function getNamedMcpTools({ actions, request, connectorId, toolNames, logger, }: {
    actions: ActionsPluginStart;
    request: KibanaRequest;
    connectorId: string;
    toolNames: string[];
    logger: Logger;
}): Promise<Array<{
    name: string;
    description?: string;
}>>;
/**
 * MCP Tool Type for Agent Builder.
 *
 * An MCP tool maps 1:1 to a tool provided by an MCP server, connected via an MCP Stack Connector.
 *
 * Architecture:
 * - connector_id: References the MCP Stack Connector that connects to the MCP server
 * - tool_name: The name of the tool on the MCP server to invoke
 * - Input schema: Retrieved by calling listTools on the MCP connector
 * - Execution: Calls the connector's callTool sub-action with the tool name and arguments
 */
export declare const getMcpToolType: ({ actions, }: {
    actions: ActionsPluginStart;
}) => ToolTypeDefinition<ToolType.mcp, McpToolConfig, z.ZodObject<any>>;
