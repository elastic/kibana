/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';

export interface McpOAuthConfig {
  serverId: string;
  serverName: string;
  serverUrl: string;
  clientId: string;
  clientSecret?: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  scopes: string[];
  discoveryUrl?: string;
}

export class McpService {
  constructor(private http: HttpSetup) {}

  async getOAuthConfig(serverId: string): Promise<McpOAuthConfig> {
    return this.http.get<McpOAuthConfig>(
      `/internal/onechat/mcp/servers/${serverId}/oauth_config`
    );
  }
}

