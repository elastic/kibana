/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SubActionConnector, type ServiceParams } from '@kbn/actions-plugin/server';
import type { AxiosError } from 'axios';
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

  private registerSubActions() {
    this.registerSubAction({
      method: 'listTools',
      name: 'listTools',
      schema: null,
    });

    const callToolSchema: Type<CallToolRequest> = schema.object({
      name: schema.string({ minLength: 1 }),
      arguments: schema.maybe(schema.recordOf(schema.string(), schema.any())),
    });

    this.registerSubAction({
      method: 'callTool',
      name: 'callTool',
      schema: callToolSchema,
    });
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

  protected getResponseErrorMessage(error: AxiosError<unknown, unknown>): string {
    return error.message;
  }
}
