import type { KibanaRequest } from '@kbn/core-http-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { ToolRegistry } from '@kbn/agent-builder-server';
import type { BulkCreateMcpToolsResponse } from '../../../../common/http_api/tools';
export interface BulkCreateMcpToolsParams {
    registry: ToolRegistry;
    actions: ActionsPluginStart;
    request: KibanaRequest;
    connectorId: string;
    tools: Array<{
        name: string;
        description?: string;
    }>;
    namespace?: string;
    skipExisting?: boolean;
    tags?: string[];
}
/**
 * Bulk create MCP tools from a connector.
 * This function can be used both in API routes and server-side code.
 *
 * @param params - Parameters for bulk creating MCP tools
 * @returns Response with results and summary
 */
export declare function bulkCreateMcpTools({ registry, actions, request, connectorId, tools, namespace, skipExisting, tags, }: BulkCreateMcpToolsParams): Promise<BulkCreateMcpToolsResponse>;
