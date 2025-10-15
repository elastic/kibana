/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';

export interface ComposioOAuthConfig {
  toolkitId: string;
  toolkitName: string;
  authConfigId: string;
}

export interface ConnectionInitiateResponse {
  connectionId: string;
  redirectUrl: string;
}

export interface ConnectionStatusResponse {
  toolkitId: string;
  isConnected: boolean;
}

/**
 * Frontend service for interacting with Composio API endpoints
 */
export class ComposioService {
  constructor(private readonly http: HttpStart) {}

  /**
   * Get OAuth configuration for a toolkit
   */
  async getOAuthConfig(toolkitId: string): Promise<ComposioOAuthConfig> {
    try {
      const config = await this.http.get<ComposioOAuthConfig>(
        `/internal/onechat/composio/toolkits/${toolkitId}/oauth_config`
      );
      return config;
    } catch (error) {
      throw new Error(
        `Failed to get OAuth config for toolkit "${toolkitId}": ${(error as Error).message}`
      );
    }
  }

  /**
   * Initiate OAuth connection for a toolkit
   * Returns the connection details including redirect URL
   */
  async initiateConnection(
    toolkitId: string,
    callbackUrl: string
  ): Promise<ConnectionInitiateResponse> {
    try {
      const response = await this.http.post<ConnectionInitiateResponse>(
        '/internal/onechat/composio/connection/initiate',
        {
          body: JSON.stringify({ toolkitId, callbackUrl }),
        }
      );
      return response;
    } catch (error) {
      throw new Error(
        `Failed to initiate connection for toolkit "${toolkitId}": ${(error as Error).message}`
      );
    }
  }

  /**
   * Wait for a connection to be established
   * Should be called after OAuth redirect with the connected_account_id from Composio
   */
  async waitForConnection(connectedAccountId: string): Promise<any> {
    try {
      const response = await this.http.post('/internal/onechat/composio/connection/wait', {
        body: JSON.stringify({ connectedAccountId }),
      });
      return response;
    } catch (error) {
      throw new Error(
        `Failed to wait for connection "${connectedAccountId}": ${(error as Error).message}`
      );
    }
  }

  /**
   * Check connection status for a toolkit
   */
  async checkConnectionStatus(toolkitId: string): Promise<ConnectionStatusResponse> {
    try {
      const response = await this.http.get<ConnectionStatusResponse>(
        '/internal/onechat/composio/connection/status',
        {
          query: { toolkitId },
        }
      );
      return response;
    } catch (error) {
      throw new Error(
        `Failed to check connection status for toolkit "${toolkitId}": ${(error as Error).message}`
      );
    }
  }
}
