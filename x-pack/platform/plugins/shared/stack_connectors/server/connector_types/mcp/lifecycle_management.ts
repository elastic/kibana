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
 * Manages the lifecycle of MCP connections, including automatic disconnection
 * after periods of inactivity.
 *
 * The lifecycle manager tracks the last activity time and automatically disconnects
 * connections that have been idle for more than the configured timeout period.
 */
export class McpConnectionLifecycleManager {
  private lastActivityTime: number | null = null;
  private inactivityTimeout: NodeJS.Timeout | null = null;
  private readonly timeoutMs: number;

  constructor(
    private readonly mcpClient: McpClient,
    private readonly logger: Logger,
    timeoutMs: number = DEFAULT_INACTIVITY_TIMEOUT_MS
  ) {
    this.timeoutMs = timeoutMs;
  }

  /**
   * Records activity and resets the inactivity timeout.
   * Should be called whenever the connection is used for any operation.
   */
  public recordActivity(): void {
    this.lastActivityTime = Date.now();
    this.resetInactivityTimeout();
    this.logger.debug('Recorded MCP connection activity');
  }

  /**
   * Checks if the connection should be closed due to inactivity.
   * @returns true if the connection has been idle longer than the timeout period
   */
  public shouldDisconnect(): boolean {
    if (this.lastActivityTime === null) {
      return false;
    }

    const timeSinceLastActivity = Date.now() - this.lastActivityTime;
    return timeSinceLastActivity >= this.timeoutMs;
  }

  /**
   * Resets the inactivity timeout, scheduling automatic disconnection
   * if the connection remains idle for the timeout period.
   */
  private resetInactivityTimeout(): void {
    // Clear any existing timeout
    if (this.inactivityTimeout !== null) {
      clearTimeout(this.inactivityTimeout);
      this.inactivityTimeout = null;
    }

    // Only schedule timeout if the client is connected
    if (!this.mcpClient.isConnected()) {
      return;
    }

    // Schedule automatic disconnection after inactivity period
    this.inactivityTimeout = setTimeout(async () => {
      if (this.shouldDisconnect() && this.mcpClient.isConnected()) {
        this.logger.info(
          `Disconnecting MCP connection due to inactivity (timeout: ${this.timeoutMs}ms)`
        );
        try {
          await this.mcpClient.disconnect();
          this.lastActivityTime = null;
        } catch (error) {
          this.logger.warn(
            `Error during automatic disconnection due to inactivity: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    }, this.timeoutMs);
  }

  /**
   * Resets the activity tracking state.
   * Should be called when the connection is manually disconnected.
   */
  public reset(): void {
    if (this.inactivityTimeout !== null) {
      clearTimeout(this.inactivityTimeout);
      this.inactivityTimeout = null;
    }
    this.lastActivityTime = null;
  }

  /**
   * Cleans up the lifecycle manager, clearing any scheduled timeouts.
   * Should be called when the connector instance is being destroyed.
   */
  public cleanup(): void {
    this.reset();
  }

  /**
   * Gets the time since the last recorded activity in milliseconds.
   * Returns null if no activity has been recorded.
   */
  public getTimeSinceLastActivity(): number | null {
    if (this.lastActivityTime === null) {
      return null;
    }
    return Date.now() - this.lastActivityTime;
  }
}
