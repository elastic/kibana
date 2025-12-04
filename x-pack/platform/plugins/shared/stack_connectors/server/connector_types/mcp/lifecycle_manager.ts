/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { McpClient } from '@kbn/mcp-client';
import { DEFAULT_INACTIVITY_TIMEOUT_MS } from '@kbn/connector-schemas/mcp/constants';

/**
 * Manages the connection lifecycle for the MCP connector.
 * Automatically disconnects after a period of inactivity to free up resources.
 */
export class McpConnectionLifecycleManager {
  private disconnectTimeout: NodeJS.Timeout | null = null;
  private readonly logger: Logger;
  private readonly inactivityTimeoutMs: number;

  /**
   * @param mcpClient - The MCP client instance to manage
   * @param logger - Logger instance for logging lifecycle events
   * @param inactivityTimeoutMs - Timeout in milliseconds before disconnecting (default: 10 minutes)
   */
  constructor(
    private readonly mcpClient: McpClient,
    logger: Logger,
    inactivityTimeoutMs: number = DEFAULT_INACTIVITY_TIMEOUT_MS
  ) {
    this.logger = logger.get('mcpConnectionLifecycleManager');
    this.inactivityTimeoutMs = inactivityTimeoutMs;
    this.logger.debug(`MCP Connection Lifecycle Manager initialized with ${inactivityTimeoutMs}ms inactivity timeout`);
  }

  /**
   * Records activity and resets the inactivity timeout.
   * Call this method whenever the connection is used (connect, listTools, callTool, etc.).
   */
  public recordActivity(): void {
    this.resetDisconnectTimeout();
  }

  /**
   * Resets the disconnect timeout, clearing any existing timeout and setting a new one.
   * If the timeout fires, the connection will be automatically disconnected.
   */
  private resetDisconnectTimeout(): void {
    // Clear existing timeout if present
    if (this.disconnectTimeout) {
      clearTimeout(this.disconnectTimeout);
      this.disconnectTimeout = null;
    }

    // Only set timeout if client is connected
    if (this.mcpClient.isConnected()) {
      this.logger.debug(`Resetting inactivity timeout (${this.inactivityTimeoutMs}ms)`);
      this.disconnectTimeout = setTimeout(() => {
        this.handleInactivityTimeout().catch((error) => {
          this.logger.error(
            `Failed to disconnect on inactivity timeout: ${error instanceof Error ? error.message : String(error)}`
          );
        });
      }, this.inactivityTimeoutMs);
    }
  }

  /**
   * Handles the inactivity timeout by disconnecting the client.
   */
  private async handleInactivityTimeout(): Promise<void> {
    this.logger.debug('Inactivity timeout reached, disconnecting MCP client');
    try {
      await this.mcpClient.disconnect();
      this.logger.info('MCP client disconnected due to inactivity');
    } catch (error) {
      this.logger.error(
        `Error disconnecting MCP client on inactivity timeout: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    } finally {
      this.disconnectTimeout = null;
    }
  }

  /**
   * Clears the disconnect timeout without disconnecting.
   * Useful when explicitly disconnecting or when the connection is already closed.
   */
  public clearTimeout(): void {
    if (this.disconnectTimeout) {
      clearTimeout(this.disconnectTimeout);
      this.disconnectTimeout = null;
      this.logger.debug('Cleared inactivity timeout');
    }
  }

  /**
   * Cleans up all resources and clears timeouts.
   * Should be called when the connector is being destroyed or reset.
   */
  public cleanup(): void {
    this.clearTimeout();
    this.logger.debug('MCP Connection Lifecycle Manager cleaned up');
  }
}

