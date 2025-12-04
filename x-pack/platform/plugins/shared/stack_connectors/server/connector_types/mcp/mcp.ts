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
} from '@kbn/mcp-client';
import { StreamableHTTPError } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import type { ConnectorUsageCollector } from '@kbn/actions-plugin/server/usage';
import { MCP_CLIENT_VERSION } from '@kbn/connector-schemas/mcp/constants';
import { buildHeadersFromSecrets } from './auth_helpers';
import { retryWithRecovery, type RetryOptions } from './retry_utils';

/**
 * MCP Connector for Kibana Stack Connectors.
 *
 * Connection Lifecycle:
 * - The connector maintains a single MCP Client instance per connector instance.
 * - Connections are established automatically on-demand (lazy connection):
 *   - When calling listTools() or callTool(), the connector will auto-connect if not already connected.
 * - Connector instances are short-lived (created per execution) and connections are disconnected
 *   after each operation completes to ensure proper cleanup.
 */
export class McpConnector extends SubActionConnector<MCPConnectorConfig, MCPConnectorSecrets> {
  private mcpClient: McpClient;

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

      if (result.connected) {
        this.logger.info(`MCP connector test successful. Connected: ${result.connected}`);
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
      // Always disconnect after test to clean up
      await this.safeDisconnect('test');
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
    } catch (disconnectError) {
      const operationContext = operationName ? ` after ${operationName}` : '';
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
      maxAttempts: 2, // One retry attempt
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
  }

  /**
   * List all available tools from the MCP server.
   * Automatically connects if not already connected.
   * Handles connection failures with automatic recovery.
   * Disconnects after the operation completes.
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
      return result;
    } catch (error) {
      // On error, ensure connection state is cleaned up
      await this.handleConnectionError(error, 'listTools');
      throw error;
    } finally {
      // Always disconnect after operation to clean up
      await this.safeDisconnect('listTools');
    }
  }

  /**
   * Call a tool on the MCP server.
   * Automatically connects if not already connected.
   * Handles connection failures with automatic recovery.
   * Disconnects after the operation completes.
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
      return result;
    } catch (error) {
      // On error, ensure connection state is cleaned up
      await this.handleConnectionError(error, `callTool(${params.name})`);
      throw error;
    } finally {
      // Always disconnect after operation to clean up
      await this.safeDisconnect('callTool');
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
