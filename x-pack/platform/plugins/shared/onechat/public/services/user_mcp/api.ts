/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';

export interface UserMcpServerCreateParams {
  name: string;
  description?: string;
  enabled: boolean;
  type: 'http' | 'sse' | 'auto';
  url: string;
  auth_type: 'none' | 'apiKey' | 'basicAuth';
  auth_config: AuthConfig;
  options?: {
    timeout?: number;
    rejectUnauthorized?: boolean;
  };
}

export interface UserMcpServerUpdateParams {
  name?: string;
  description?: string;
  enabled?: boolean;
  type?: 'http' | 'sse' | 'auto';
  url?: string;
  auth_type?: 'none' | 'apiKey' | 'basicAuth';
  auth_config?: AuthConfig;
  options?: {
    timeout?: number;
    rejectUnauthorized?: boolean;
  };
}

export type AuthConfig =
  | { type: 'none' }
  | { type: 'apiKey'; headers: Record<string, string> }
  | { type: 'basicAuth'; username: string; password: string };

export interface UserMcpServer {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  type: 'http' | 'sse' | 'auto';
  url: string;
  auth_type: 'none' | 'apiKey' | 'basicAuth';
  auth_config: AuthConfig;
  options?: {
    timeout?: number;
    rejectUnauthorized?: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface TestConnectionResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export class UserMcpApi {
  constructor(private http: HttpStart) {}

  async listServers(): Promise<UserMcpServer[]> {
    return this.http.get<UserMcpServer[]>('/api/agent_builder/user_mcp_servers');
  }

  async getServer(id: string): Promise<UserMcpServer> {
    return this.http.get<UserMcpServer>(`/api/agent_builder/user_mcp_servers/${id}`);
  }

  async createServer(params: UserMcpServerCreateParams): Promise<UserMcpServer> {
    return this.http.post<UserMcpServer>('/api/agent_builder/user_mcp_servers', {
      body: JSON.stringify(params),
    });
  }

  async updateServer(id: string, params: UserMcpServerUpdateParams): Promise<UserMcpServer> {
    return this.http.put<UserMcpServer>(`/api/agent_builder/user_mcp_servers/${id}`, {
      body: JSON.stringify(params),
    });
  }

  async deleteServer(id: string): Promise<void> {
    await this.http.delete(`/api/agent_builder/user_mcp_servers/${id}`);
  }

  async testConnection(id: string): Promise<TestConnectionResponse> {
    return this.http.post<TestConnectionResponse>(
      `/api/agent_builder/user_mcp_servers/${id}/_test`
    );
  }
}
