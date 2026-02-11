/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LRUCache } from 'lru-cache';
import hash from 'object-hash';
import { SubActionConnector } from '@kbn/actions-plugin/server';
import type { MCPConnectorConfig, MCPConnectorSecrets } from '@kbn/connector-schemas/mcp';
import {
  TestConnectorRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@kbn/connector-schemas/mcp/schemas/v1';
import { SUB_ACTION } from '@kbn/connector-schemas/mcp';
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
import { MCP_CLIENT_VERSION, MAX_RETRIES } from '@kbn/connector-schemas/mcp/constants';
import { buildHeadersFromSecrets } from './auth_helpers';
import { retryWithRecovery, type RetryOptions } from './retry_utils';

// TTL for list_tools cache: 15 minutes
export const LIST_TOOLS_CACHE_TTL_MS = 15 * 60 * 1000;
// Maximum number of cached entries (100 servers should be a reasonable max)
export const LIST_TOOLS_CACHE_MAX_SIZE = 100;

/**
 * Module-level cache for listTools results.
 * Shared across all McpConnector instances to reduce redundant calls to MCP servers.
 */
export const listToolsCache = new LRUCache<string, ListToolsResponse>({
  max: LIST_TOOLS_CACHE_MAX_SIZE,
  ttl: LIST_TOOLS_CACHE_TTL_MS,
  allowStale: false,
  ttlAutopurge: false,
});

/**
 * MCP Connector for Kibana Stack Connectors.
 *
 * Connection Lifecycle:
 * - The connector maintains a single MCP Client instance per connector instance.
 * - Connections are established automatically on-demand (lazy connection):
 *   - When calling listTools() or callTool(), the connector will auto-connect if not already connected.
 * - Connections are disconnected after each operation completes to ensure proper cleanup.
 */
export class McpConnector extends SubActionConnector<MCPConnectorConfig, MCPConnectorSecrets> {
  private mcpClient: McpClient;
  private authHeaders: Record<string, string>;

  constructor(params: ServiceParams<MCPConnectorConfig, MCPConnectorSecrets>) {
    super(params);

    // Build auth headers from secrets based on authType
    this.authHeaders = buildHeadersFromSecrets(this.secrets, this.config);

    // Merge non-secret headers from config with auth headers (auth headers take precedence)
    const headers: Record<string, string> = {
      ...(this.config.headers ?? {}),
      ...this.authHeaders,
    };

    // Build client options
    const clientOptions: McpClientOptions = {
      headers,
      // Use default reconnection options from McpClient
    };

    // Create client details using connector ID and server URL
    const clientDetails: ClientDetails = {
      name: `kibana-mcp-connector-${this.connector.id}`,
      version: MCP_CLIENT_VERSION,
      url: this.config.serverUrl,
    };

    // Initialize the single MCP Client instance for this connector
    this.mcpClient = new McpClient(this.logger, clientDetails, clientOptions);

    this.registerSubActions();
  }

  private registerSubActions() {
    this.registerSubAction({
      name: SUB_ACTION.INITIALIZE,
      method: 'testConnector',
      schema: TestConnectorRequestSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.LIST_TOOLS,
      method: 'listTools',
      schema: ListToolsRequestSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.CALL_TOOL,
      method: 'callTool',
      schema: CallToolRequestSchema,
    });
  }

  /**
   * Generates a cache key for listTools based on connector id, configuration, and auth headers.
   * Uses a hash to keep keys short, consistent, and secure (secret values are not directly visible).
   */
  private getListToolsCacheKey(): string {
    const configHash = hash({
      serverUrl: this.config.serverUrl,
      headers: this.config.headers,
      hasAuth: this.config.hasAuth,
      authType: this.config.authType,
      authHeaders: this.authHeaders,
    });
    return `${this.connector.id}:${configHash}`;
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
   * Checks if an error is a connection-related error that should trigger retry or cleanup.
   */
  private isConnectionError(error: unknown): error is Error {
    return (
      error instanceof StreamableHTTPError ||
      error instanceof UnauthorizedError ||
      (error instanceof Error &&
        (error.message.includes('connection') || error.message.includes('ECONNREFUSED')))
    );
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
      isRetryableError: (error) => this.isConnectionError(error),
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
   * Results are cached based on connector id + config to reduce redundant calls.
   * Automatically connects if not already connected.
   * Handles connection failures with automatic recovery.
   */
  public async listTools(
    params: z.infer<typeof ListToolsRequestSchema>,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<{
    tools: Array<{ name: string; description?: string; inputSchema: Record<string, unknown> }>;
  }> {
    const cacheKey = this.getListToolsCacheKey();

    // Check cache first (unless forceRefresh is requested)
    if (!params.forceRefresh) {
      const cachedResult = listToolsCache.get(cacheKey);
      if (cachedResult) {
        this.logger.debug(
          `Returning cached listTools result for connector ${this.connector.id} (${cachedResult.tools.length} tools)`
        );
        return cachedResult;
      }
    }

    try {
      connectorUsageCollector.addRequestBodyBytes(undefined, params);

      // Ensure we're connected before listing tools (with automatic retry/recovery)
      await this.ensureConnected('listTools');

      const result = await this.mcpClient.listTools();
      this.logger.debug(`Listed ${result.tools.length} tools from MCP server`);

      // Cache the result
      listToolsCache.set(cacheKey, result);

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
      await this.safeDisconnect(`callTool(${params.name})`);
    }
  }
  /**
   * Handles connection errors by cleaning up connection state.
   * This ensures we don't leave the connection in a bad state after errors.
   */
  private async handleConnectionError(error: unknown, operation: string): Promise<void> {
    // Check if this is a connection-related error that requires cleanup
    if (this.isConnectionError(error) && this.mcpClient.isConnected()) {
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

  protected getResponseErrorMessage(error: AxiosError): string {
    // This method will likely never be called since we don't use this.request()
    // But we must implement it to satisfy the abstract method requirement

    // Handle MCP-specific errors that might be wrapped
    if (error.cause instanceof StreamableHTTPError) {
      return `MCP Connection Error: ${error.cause.message}`;
    }
    if (error.cause instanceof UnauthorizedError) {
      return `MCP Unauthorized Error: ${error.cause.message}`;
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
