/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SubActionConnector, type ServiceParams } from '@kbn/actions-plugin/server';
import axios from 'axios';
import type { AxiosError, AxiosInstance } from 'axios';
import type {
  MCPConnectorConfig,
  MCPConnectorSecrets,
  CallToolResponse,
  ListToolsResponse,
  Tool,
  CallToolRequest,
  MCPConnectorHTTPServiceConfig,
  MCPConnectorSecretsAPIKey,
  MCPConnectorSecretsBasicAuth,
  ContentPart,
} from '@kbn/mcp-connector-common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { OpenAPIV3 } from 'openapi-types';
import type { Type } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { format } from 'node:util';
import type { ListToolsViaHubResponse } from '@kbn/mcp-connector-common/src/client';

const callToolSchema: Type<CallToolRequest> = schema.object({
  name: schema.string({ minLength: 1 }),
  arguments: schema.maybe(schema.recordOf(schema.string(), schema.any())),
});

export class MCPConnector extends SubActionConnector<MCPConnectorConfig, MCPConnectorSecrets> {
  private readonly client: Client;
  private connected: boolean = false;

  constructor(params: ServiceParams<MCPConnectorConfig, MCPConnectorSecrets>) {
    super(params);

    this.client = new Client(
      {
        name: params.connector.id,
        version: params.config.version ?? '',
      },
      {
        capabilities: {},
      }
    );

    this.registerSubActions();
  }

  private async connectHttp(service: MCPConnectorHTTPServiceConfig) {
    const secrets = this.secrets;

    const headers = new Headers();

    if (service.authType === 'apiKey') {
      const apiKeySecrets = secrets as MCPConnectorSecretsAPIKey;
      headers.set('Authorization', `ApiKey ${apiKeySecrets.auth.apiKey}`);
    } else if (service.authType === 'basic') {
      const basicAuth = secrets as MCPConnectorSecretsBasicAuth;
      headers.set(
        'Authorization',
        `Basic ${Buffer.from(`${basicAuth.auth.username}:${basicAuth.auth.password}`).toString(
          'base64'
        )}`
      );
    }

    const transport = new StreamableHTTPClientTransport(new URL(service.http.url), {
      requestInit: {
        headers,
      },
    });

    // "starts" the HTTP transport which is a no-op,
    // it will also send an initialization request to
    // the server
    await this.client.connect(transport);
  }

  private async connect() {
    if (this.connected) {
      return;
    }

    const { config } = this;

    if ('http' in config.service) {
      await this.connectHttp(config.service);
    } else {
      throw new Error(`No known service was configured`);
    }

    this.connected = true;
  }

  private buildAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    const serviceConfig = this.config.service as MCPConnectorHTTPServiceConfig;

    if (serviceConfig.authType === 'apiKey') {
      const apiKeySecrets = this.secrets as MCPConnectorSecretsAPIKey;
      headers.Authorization = `ApiKey ${apiKeySecrets.auth.apiKey}`;
    } else if (serviceConfig.authType === 'basic') {
      const basicAuth = this.secrets as MCPConnectorSecretsBasicAuth;
      const token = Buffer.from(`${basicAuth.auth.username}:${basicAuth.auth.password}`).toString(
        'base64'
      );
      headers.Authorization = `Basic ${token}`;
    }
    return headers;
  }

  private registerSubActions() {
    // MCP JSON-RPC sub-actions
    this.registerSubAction({ method: 'listTools', name: 'listTools', schema: null });
    this.registerSubAction({ method: 'callTool', name: 'callTool', schema: callToolSchema });

    // REST-via-MCP-Hub sub-action
    this.registerSubAction({ method: 'listToolsViaHub', name: 'listToolsViaHub', schema: null });
    this.registerSubAction({ method: 'callToolViaHub', name: 'callToolViaHub', schema: null });
  }

  public async listTools(): Promise<ListToolsResponse> {
    await this.connect();

    const getNextPage = async (cursor?: string): Promise<Tool[]> => {
      const { tools, nextCursor } = await this.client.listTools({
        cursor,
      });

      return [
        ...tools.map((tool): Tool => {
          return {
            description: tool.description,
            inputSchema: tool.inputSchema as OpenAPIV3.NonArraySchemaObject,
            name: tool.name,
          };
        }),
        ...(nextCursor ? await getNextPage(nextCursor) : []),
      ];
    };

    return {
      tools: await getNextPage(),
    };
  }

  public async callTool({
    name,
    arguments: args,
  }: {
    name: string;
    arguments?: Record<string, unknown>;
  }): Promise<CallToolResponse> {
    await this.connect();

    const response = await this.client.callTool({
      name,
      _meta: {},
      arguments: args ?? {},
    });

    if (response.isError) {
      throw new Error(`Tool call failed: ${format(response)}`);
    }

    return {
      content: response.content as ContentPart[],
    };
  }

  public async listToolsViaHub(): Promise<ListToolsViaHubResponse> {
    const serviceConfig = this.config.service as MCPConnectorHTTPServiceConfig;
    const baseUrl = serviceConfig.http.url.replace(/\/+$/, '');
    const headers = this.buildAuthHeaders();
    const axiosInstance: AxiosInstance = axios.create();

    try {
      const serversResponse = await axiosInstance.get<{ servers: Array<{ name: string }> }>(
        `${baseUrl}/api/servers`,
        { headers }
      );

      const serverNames = serversResponse.data.servers.map((s) => s.name);

      const servers = await Promise.all(
        serverNames.map(async (serverName) => {
          try {
            const infoRes = await axiosInstance.post<{
              server: {
                capabilities: {
                  tools: Array<{
                    name: string;
                    description: string;
                    inputSchema: OpenAPIV3.NonArraySchemaObject;
                  }>;
                };
              };
            }>(`${baseUrl}/api/servers/info`, { server_name: serverName }, { headers });

            const toolDefinitions = infoRes.data.server.capabilities.tools;

            const tools: Tool[] = toolDefinitions.map((tool) => ({
              name: tool.name,
              description: tool.description,
              inputSchema: tool.inputSchema as OpenAPIV3.NonArraySchemaObject,
            }));

            return { serverName, tools };
          } catch (err) {
            this.logger.error(
              `Failed fetching tools for server "${serverName}": ${(err as AxiosError).message}`
            );
            return null;
          }
        })
      );

      return {
        servers: servers.filter((s): s is { serverName: string; tools: Tool[] } => s !== null),
      };
    } catch (err) {
      throw new Error(`Failed to list Hub servers: ${(err as AxiosError).message}`);
    }
  }

  public async callToolViaHub({
    serverName,
    name,
    arguments: args,
  }: {
    serverName: string;
    name: string;
    arguments?: Record<string, unknown>;
  }): Promise<CallToolResponse> {
    const serviceConfig = this.config.service as MCPConnectorHTTPServiceConfig;
    const base = serviceConfig.http.url.replace(/\/+$/, '');
    const headers = this.buildAuthHeaders();
    const axiosInstance: AxiosInstance = axios.create();

    try {
      const toolExecutionResponse = await axiosInstance.post(
        `${base}/api/servers/tools`,
        { server_name: serverName, tool: name, arguments: args ?? {} },
        { headers }
      );

      return {
        content: toolExecutionResponse.data.result.content,
      };
    } catch (err) {
      const msg = (err as AxiosError).message;

      this.logger.error(`callToolViaHub failed for ${serverName}.${name}: ${msg}`);
      throw new Error(`Failed to call tool via hub: ${msg}`);
    }
  }

  protected getResponseErrorMessage(error: AxiosError<unknown, unknown>): string {
    return error.message;
  }
}
