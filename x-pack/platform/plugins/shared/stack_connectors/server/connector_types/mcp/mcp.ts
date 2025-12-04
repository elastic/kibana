/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SubActionConnector } from '@kbn/actions-plugin/server';
import type { MCPConnectorConfig, MCPConnectorSecrets } from '@kbn/connector-schemas/mcp';
import {
  TestConnectorRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@kbn/connector-schemas/mcp/schemas/v1';
import type { ServiceParams } from '@kbn/actions-plugin/server/sub_action_framework/types';
import type { AxiosError } from 'axios';
import { z } from '@kbn/zod';
import { McpClient, type McpClientOptions, type CallToolParams, type CallToolResponse } from '@kbn/mcp-client';
import { StreamableHTTPError } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import type { ConnectorUsageCollector } from '@kbn/actions-plugin/server/usage';
import { McpConnectionLifecycleManager } from './lifecycle_manager';
import { MCP_CLIENT_VERSION } from '@kbn/connector-schemas/mcp/constants';
import { buildHeadersFromSecrets } from './auth_helpers';

/**
 * MCP Connector for Kibana Stack Connectors.
 *
 * Connection Lifecycle:
 * - The connector maintains a single MCP Client instance per connector instance.
 * - Connections are established automatically on-demand (lazy connection):
 *   - When calling listTools() or callTool(), the connector will auto-connect if not already connected.
 * - Connection lifecycle is managed automatically:
 *   - Connections are automatically disconnected after 10 minutes of inactivity.
 *   - Activity resets the inactivity timer (connect, listTools, callTool all count as activity).
 * - To disconnect manually, use getClient().disconnect() to access the underlying MCP client.
 * - The testConnector() method automatically disconnects after testing to clean up.
 */
export class McpConnector extends SubActionConnector<MCPConnectorConfig, MCPConnectorSecrets> {
  private mcpClient: McpClient;
  private lifecycleManager: McpConnectionLifecycleManager;

  constructor(params: ServiceParams<MCPConnectorConfig, MCPConnectorSecrets>) {
    super(params);

    // Build headers from secrets based on authType
    const headers = buildHeadersFromSecrets(this.secrets, this.config);

    // Build client options
    const clientOptions: McpClientOptions = {
      headers,
      // Use default reconnection options from McpClient
    };

    // Create client details using connector ID and server URL from new schema structure
    const clientDetails = {
      name: `kibana-mcp-connector-${this.connector.id}`,
      version: MCP_CLIENT_VERSION,
      url: this.config.service.http.url,
    };

    // Initialize the single MCP Client instance for this connector
    this.mcpClient = new McpClient(this.logger, clientDetails, clientOptions);

    // Initialize connection lifecycle manager (10 minute inactivity timeout)
    this.lifecycleManager = new McpConnectionLifecycleManager(this.mcpClient, this.logger);

    this.registerSubActions();
  }

  private registerSubActions() {
    this.registerSubAction({
      name: 'test',
      method: 'testConnector',
      schema: TestConnectorRequestSchema,
    });

    this.registerSubAction({
      name: 'listTools',
      method: 'listTools',
      schema: ListToolsRequestSchema,
    });

    this.registerSubAction({
      name: 'callTool',
      method: 'callTool',
      schema: CallToolRequestSchema,
    });
  }

  /**
   * Test the connector by attempting to connect to the MCP server.
   * Disconnects after the test to clean up resources.
   */
  public async testConnector(
    _params: z.infer<typeof TestConnectorRequestSchema>,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<{ connected: boolean; capabilities?: unknown }> {
    try {
      connectorUsageCollector.addRequestBodyBytes(undefined, { action: 'test' });
      const result = await this.mcpClient.connect();
      this.logger.info(`MCP connector test successful. Connected: ${result.connected}`);

      // Record activity for lifecycle management
      this.lifecycleManager.recordActivity();

      // Clean up: disconnect after test and clear timeout
      this.lifecycleManager.clearTimeout();
      await this.mcpClient.disconnect();

      return result;
    } catch (error) {
      this.logger.error(`MCP connector test failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * List all available tools from the MCP server.
   * Automatically connects if not already connected.
   */
  public async listTools(
    params: z.infer<typeof ListToolsRequestSchema>,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<{ tools: Array<{ name: string; description?: string; inputSchema: Record<string, unknown> }> }> {
    try {
      connectorUsageCollector.addRequestBodyBytes(undefined, params);
      // Ensure we're connected before listing tools
      if (!this.mcpClient.isConnected()) {
        await this.mcpClient.connect();
      }

      // Record activity to reset inactivity timeout
      this.lifecycleManager.recordActivity();

      const result = await this.mcpClient.listTools();
      this.logger.debug(`Listed ${result.tools.length} tools from MCP server`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to list tools: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Call a tool on the MCP server.
   * Automatically connects if not already connected.
   */
  public async callTool(
    params: z.infer<typeof CallToolRequestSchema>,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<CallToolResponse> {
    try {
      connectorUsageCollector.addRequestBodyBytes(undefined, params);
      // Ensure we're connected before calling tools
      if (!this.mcpClient.isConnected()) {
        await this.mcpClient.connect();
      }

      // Record activity to reset inactivity timeout
      this.lifecycleManager.recordActivity();

      const callParams: CallToolParams = {
        name: params.name,
        arguments: params.arguments,
      };

      const result = await this.mcpClient.callTool(callParams);
      this.logger.debug(`Successfully called tool: ${params.name}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to call tool ${params.name}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Get the MCP Client instance for this connector.
   * This ensures a single instance is maintained per connector.
   *
   * Use this to access the underlying MCP client directly if needed,
   * for example to call disconnect() or check connection status.
   */
  getClient(): McpClient {
    return this.mcpClient;
  }

  protected getResponseErrorMessage(error: AxiosError | Error): string {
    // Handle MCP-specific errors
    if (error instanceof StreamableHTTPError) {
      return `MCP Connection Error: ${error.message}`;
    }

    if (error instanceof UnauthorizedError) {
      return `MCP Unauthorized Error: ${error.message}`;
    }

    // Handle Axios errors
    if ('isAxiosError' in error && error.isAxiosError) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.statusText) {
        return `API Error: ${axiosError.response.statusText}`;
      }
      if (axiosError.message) {
        return `API Error: ${axiosError.message}`;
      }
    }

    // Handle generic errors
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}
