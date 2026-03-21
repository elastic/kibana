import type { KibanaRequest } from '@kbn/core-http-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { McpToolConfig } from '@kbn/agent-builder-common/tools';
/**
 * Validates that the connector exists and is an MCP connector.
 */
export declare function validateConnector({ actions, request, connectorId, }: {
    actions: ActionsPluginStart;
    request: KibanaRequest;
    connectorId: string;
}): Promise<void>;
/**
 * Validates that the tool name exists on the MCP server by calling listTools.
 */
export declare function validateToolName({ actions, request, connectorId, toolName, }: {
    actions: ActionsPluginStart;
    request: KibanaRequest;
    connectorId: string;
    toolName: string;
}): Promise<void>;
/**
 * Validates MCP tool configuration.
 * Validates:
 * - Connector exists
 * - Connector is of type MCP (.mcp)
 * - Tool name exists on the MCP server
 */
export declare function validateConfig({ actions, request, config, }: {
    actions: ActionsPluginStart;
    request: KibanaRequest;
    config: McpToolConfig;
}): Promise<void>;
