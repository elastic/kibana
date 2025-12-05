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
import type { z } from '@kbn/zod';
import {
  McpClient,
  type McpClientOptions,
  type CallToolParams,
  type CallToolResponse,
  type ClientDetails,
  type ListToolsResponse,
  StreamableHTTPError,
  UnauthorizedError,
} from '@kbn/mcp-client';
import type { ConnectorUsageCollector } from '@kbn/actions-plugin/server/usage';
import {
  MCP_CLIENT_VERSION,
  MAX_RETRIES,
  DEFAULT_INACTIVITY_TIMEOUT_MS,
} from '@kbn/connector-schemas/mcp/constants';
import { buildHeadersFromSecrets } from './auth_helpers';
import { retryWithRecovery, type RetryOptions } from './retry_utils';
import { McpConnectionLifecycleManager } from './lifecycle_management';
import {
  MCP_CONNECTOR_TOOLS_SAVED_OBJECT_TYPE,
  type McpConnectorToolsAttributes,
} from '../../saved_objects';

/**
 * MCP Connector for Kibana Stack Connectors.
 *
 * Connection Lifecycle:
 * - The connector maintains a single MCP Client instance per connector instance.
 * - Connections are established automatically on-demand (lazy connection):
 *   - When calling listTools() or callTool(), the connector will auto-connect if not already connected.
 * - Connections remain open after operations and are automatically disconnected after
 *   a period of inactivity (default: 10 minutes) to optimize performance while managing resources.
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
    const clientDetails: ClientDetails = {
      name: `kibana-mcp-connector-${this.connector.id}`,
      version: MCP_CLIENT_VERSION,
      url: this.config.service.http.url,
    };

    // Initialize the single MCP Client instance for this connector
    this.mcpClient = new McpClient(this.logger, clientDetails, clientOptions);

    // Initialize lifecycle manager for connection timeout management
    this.lifecycleManager = new McpConnectionLifecycleManager(
      this.mcpClient,
      this.logger,
      DEFAULT_INACTIVITY_TIMEOUT_MS
    );

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
   * Note: Test operations always disconnect to ensure clean test state.
   */
  public async testConnector(
    _params: z.infer<typeof TestConnectorRequestSchema>,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<{ connected: boolean; capabilities?: unknown }> {
    try {
      const result = await this.mcpClient.connect();

      if (result.connected) {
        this.logger.info(`MCP connector test successful. Connected: ${result.connected}`);
        // After successful connection, get tools and save them
        const toolsResult = await this.mcpClient.listTools();
        await this.saveTools(toolsResult);
      } else {
        this.logger.warn(
          `MCP connector test completed but connection failed. Connected: ${result.connected}`
        );
      }

      return result;
    } catch (error) {
      this.logger.error(
        `MCP connector test failed: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    } finally {
      // Always disconnect after test to clean up (test operations should clean up)
      await this.safeDisconnect('test');
      // Clean up lifecycle manager for test operations
      this.lifecycleManager.cleanup();
    }
  }

  /**
   * Safely disconnects the MCP client if connected.
   * Logs any errors but does not throw, making it safe to use in finally blocks.
   * @param operationName - Optional operation name for logging context
   */
  private async safeDisconnect(operationName?: string): Promise<void> {
    if (!this.mcpClient.isConnected()) {
      return;
    }

    try {
      await this.mcpClient.disconnect();
      this.lifecycleManager.reset();
    } catch (disconnectError) {
      const operationContext = operationName ? ` after ${operationName}` : '';

      this.lifecycleManager.reset();

      this.logger.debug(
        `Error disconnecting${operationContext}: ${
          disconnectError instanceof Error ? disconnectError.message : String(disconnectError)
        }`
      );
    }
  }

  /**
   * Ensures the MCP client is connected, with automatic retry and recovery on failure.
   * Uses the retry utility to handle connection failures gracefully.
   */
  private async ensureConnected(operationName: string): Promise<void> {
    if (this.mcpClient.isConnected()) {
      return;
    }

    const retryOptions: RetryOptions = {
      maxAttempts: MAX_RETRIES,
      initialDelayMs: 100,
      isRetryableError: (error) => {
        // Retry on connection-related errors
        return (
          error instanceof StreamableHTTPError ||
          error instanceof UnauthorizedError ||
          (error instanceof Error &&
            (error.message.includes('connection') || error.message.includes('ECONNREFUSED')))
        );
      },
      logger: this.logger,
      operationName: `${operationName}.connect`,
      onRetry: async () => {
        // Recovery: disconnect before retrying connection
        try {
          await this.mcpClient.disconnect();
        } catch (disconnectError) {
          // Ignore disconnect errors during recovery
          this.logger.debug(
            `Error during disconnect recovery: ${
              disconnectError instanceof Error ? disconnectError.message : String(disconnectError)
            }`
          );
        }
      },
    };

    await retryWithRecovery(() => this.mcpClient.connect(), retryOptions);

    // Record activity after successful connection
    this.lifecycleManager.recordActivity();
  }

  /**
   * Saves the tools list to a saved object if it doesn't already exist.
   * @param toolsResult - The tools list result from listTools() or connect()
   */
  private async saveTools(toolsResult: ListToolsResponse): Promise<void> {
    try {
      const now = new Date().toISOString();

      // Save the tools to a saved object
      await this.savedObjectsClient.create<McpConnectorToolsAttributes>(
        MCP_CONNECTOR_TOOLS_SAVED_OBJECT_TYPE,
        {
          connectorId: this.connector.id,
          tools: toolsResult.tools,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: this.connector.id,
          overwrite: true,
        }
      );

      this.logger.info(
        `Saved ${toolsResult.tools.length} tools for MCP connector ${this.connector.id}`
      );
    } catch (error) {
      this.logger.warn(
        `Failed to save tools for connector ${this.connector.id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * List all available tools from the MCP server.
   * Automatically connects if not already connected.
   * Handles connection failures with automatic recovery.
   */
  public async listTools(
    params: z.infer<typeof ListToolsRequestSchema>,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<{
    tools: Array<{ name: string; description?: string; inputSchema: Record<string, unknown> }>;
  }> {
    try {
      connectorUsageCollector.addRequestBodyBytes(undefined, params);

      // Ensure we're connected before listing tools (with automatic retry/recovery)
      await this.ensureConnected('listTools');

      const result = await this.mcpClient.listTools();
      this.logger.debug(`Listed ${result.tools.length} tools from MCP server`);

      // Record activity after successful operation
      this.lifecycleManager.recordActivity();

      // Save tools to a saved object
      await this.saveTools(result);
      return result;
    } catch (error) {
      // On error, ensure connection state is cleaned up
      await this.handleConnectionError(error, 'listTools');
      throw error;
    }
  }

  /**
   * Call a tool on the MCP server.
   * Automatically connects if not already connected.
   * Handles connection failures with automatic recovery.
   */
  public async callTool(
    params: z.infer<typeof CallToolRequestSchema>,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<CallToolResponse> {
    try {
      connectorUsageCollector.addRequestBodyBytes(undefined, params);

      // Ensure we're connected before calling tools (with automatic retry/recovery)
      await this.ensureConnected('callTool');

      const callParams: CallToolParams = {
        name: params.name,
        arguments: params.arguments,
      };

      const result = await this.mcpClient.callTool(callParams);
      this.logger.debug(`Successfully called tool: ${params.name}`);

      // Record activity after successful operation
      this.lifecycleManager.recordActivity();

      return result;
    } catch (error) {
      // On error, ensure connection state is cleaned up
      await this.handleConnectionError(error, `callTool(${params.name})`);
      throw error;
    }
  }
  /**
   * Handles connection errors by cleaning up connection state.
   * This ensures we don't leave the connection in a bad state after errors.
   */
  private async handleConnectionError(error: unknown, operation: string): Promise<void> {
    // Check if this is a connection-related error that requires cleanup
    const isConnectionError =
      error instanceof StreamableHTTPError ||
      error instanceof UnauthorizedError ||
      (error instanceof Error &&
        (error.message.includes('connection') || error.message.includes('ECONNREFUSED')));

    if (isConnectionError && this.mcpClient.isConnected()) {
      this.logger.warn(
        `Connection error during ${operation}, cleaning up connection state: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      try {
        await this.mcpClient.disconnect();
        // Reset lifecycle state after error disconnection
        this.lifecycleManager.reset();
      } catch (cleanupError) {
        // Log but don't throw - we're already handling an error
        this.logger.debug(
          `Error during connection cleanup: ${
            cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
          }`
        );
      }
    }
  }

  protected getResponseErrorMessage(error: AxiosError): string {
    // This method will likely never be called since we don't use this.request()
    // But we must implement it to satisfy the abstract method requirement

    // Handle MCP-specific errors that might be wrapped
    const cause = error.cause;
    if (cause instanceof StreamableHTTPError) {
      return `MCP Connection Error: ${cause.message}`;
    }
    if (cause instanceof UnauthorizedError) {
      return `MCP Unauthorized Error: ${cause.message}`;
    }

    // Handle standard Axios errors (unlikely in our case)
    if (error.response?.statusText) {
      return `API Error: ${error.response.statusText}`;
    }
    if (error.message) {
      return `API Error: ${error.message}`;
    }

    return String(error);
  }
}
