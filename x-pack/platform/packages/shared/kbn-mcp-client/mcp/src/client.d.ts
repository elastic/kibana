import type { ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';
import type { Logger } from '@kbn/core/server';
import type { ClientDetails, CallToolParams, CallToolResponse, ListToolsResponse, McpClientOptions } from './types';
/**
 * McpClient is a wrapper around the MCP client SDK.
 * It provides a simple interface for connecting to an MCP client,
 * listing tools, and calling tools.
 */
export declare class McpClient {
    private readonly logger;
    private readonly client;
    private readonly transport;
    private connected;
    name: string;
    version: string;
    constructor(logger: Logger, clientDetails: ClientDetails, { headers, fetch: customFetch, maxRetries, reconnectionDelayGrowFactor, initialReconnectionDelay, maxReconnectionDelay, }?: McpClientOptions);
    /**
     * Public getter for the connection status.
     */
    isConnected(): boolean;
    /**
     * Connect to the MCP client and return the connected status and capabilities.
     */
    connect(): Promise<{
        connected: boolean;
        capabilities?: ServerCapabilities;
    }>;
    /**
     * Disconnect from the MCP client and return the disconnected status.
     */
    disconnect(): Promise<void>;
    /**
     * List the tools available on the MCP client.
     */
    listTools(): Promise<ListToolsResponse>;
    /**
     * Call a tool on the MCP client.
     * This method only returns text content.
     * It does not support other content types such as images, audio, etc.
     * @param {CallToolParams} params - The parameters for the tool call.
     */
    callTool(params: CallToolParams): Promise<CallToolResponse>;
}
