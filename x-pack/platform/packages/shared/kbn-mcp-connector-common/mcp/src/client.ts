/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport, StreamableHTTPError } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { ClientDetails, CallToolParams, CallToolResponse, ContentPart, ListToolsResponse, Tool } from './types';

export class McpClient {
  private client: Client;
  private transport: StreamableHTTPClientTransport;

  public connected: boolean = false;

  constructor(clientDetails: ClientDetails, customHeaders?: Record<string, string>) {
    this.transport = new StreamableHTTPClientTransport(
      new URL(clientDetails.url),
      {
        requestInit: {
          headers: customHeaders ?? {},
        },
        reconnectionOptions: {
          maxRetries: 3,
          reconnectionDelayGrowFactor: 1.5,
          initialReconnectionDelay: 1000,
          maxReconnectionDelay: 10000,
        },
      },
    );

    this.client = new Client({
      name: clientDetails.name,
      version: clientDetails.version,
    });
  }

  async connect(): Promise<boolean> {
    if (!this.connected) {
      try {
        await this.client.connect(this.transport)
        this.connected = true;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (error instanceof StreamableHTTPError) {
          throw new Error(`StreamableHTTP error: ${message}`);
        } else if (error instanceof UnauthorizedError) {
          throw new Error(`Unauthorized error: ${message}`);
        } else {
          throw new Error(`Error connecting to MCP client: ${message}`);
        }
      }
    }
    return this.connected;
  }

  async disconnect(): Promise<boolean> {
    if (this.connected) {
      await this.client.close();
      this.connected = false;
    }
    return this.connected;
  }

  async listTools(): Promise<ListToolsResponse> {
    if (this.connected) {
      const getNextPage = async (cursor?: string): Promise<Tool[]> => {
        const response = await this.client.listTools({
          cursor,
        });

        if (response.isError) {
          throw new Error(`Error listing tools: ${response.error}`);
        }

        const { tools, nextCursor } = response;

        return [
          ...tools.map((tool): Tool => {
            return {
              description: tool.description,
              inputSchema: tool.inputSchema,
              name: tool.name,
            };
          }),
          ...(nextCursor ? await getNextPage(nextCursor) : []),
        ];
      };

      const tools: ListToolsResponse = {
        tools: await getNextPage(),
      };

      return tools;
    }

    throw new Error('MCP client not connected');
  }

  async callTool(params: CallToolParams): Promise<CallToolResponse> {
    if (this.connected) {
      const response = await this.client.callTool({
        name: params.name,
        _meta: {},
        arguments: params.arguments ?? {}
      })

      if (response.isError) {
        throw new Error(`Error calling tool ${params.name}: ${response.error}`);
      }

      if (
        typeof response.content === 'object' &&
        response.content !== null &&
        'type' in response.content &&
        (response.content as { type: unknown }).type === 'text'
      ) {
        return {
          content: response.content as ContentPart[],
        };
      }
    }

    throw new Error('MCP client not connected');
  }
}
