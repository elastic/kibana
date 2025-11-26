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
import { ServerCapabilities } from '@modelcontextprotocol/sdk/types';

/**
 * McpClient is a wrapper around the MCP client SDK.
 * It provides a simple interface for connecting to an MCP client,
 * listing tools, and calling tools.
 */
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

  /**
   * Connect to the MCP client and return the connected status and capabilities.
   * @returns {Promise<{ connected: boolean; capabilities?: ServerCapabilities }>} The connected status and capabilities.
   */
  async connect(): Promise<{ connected: boolean; capabilities?: ServerCapabilities }> {

    if (!this.connected) {
      try {
        await this.client.connect(this.transport);
        this.connected = true;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (error instanceof StreamableHTTPError) {
          throw new Error(`${message}`);
        } else if (error instanceof UnauthorizedError) {
          throw new Error(`Unauthorized error: ${message}`);
        } else {
          throw new Error(`Error connecting to MCP client: ${message}`);
        }
      }
    }
    // return the full list of capabilities as a by-product of the initialization handshake
    const capabilities = this.client.getServerCapabilities();

    return {
      connected: this.connected,
      capabilities,
    };

  }

  /**
   * Disconnect from the MCP client and return the disconnected status.
   * @returns {Promise<boolean>} The disconnected status.
   */
  async disconnect(): Promise<boolean> {
    if (this.connected) {
      await this.client.close();
      this.connected = false;
    }
    return this.connected;
  }

  /**
   * List the tools available on the MCP client.
   * @returns {Promise<ListToolsResponse>} The list of tools.
   */
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

  /**
   * Call a tool on the MCP client.
   * @param {CallToolParams} params - The parameters for the tool call.
   * @returns {Promise<CallToolResponse>} The response from the tool call.
   */
  async callTool(params: CallToolParams): Promise<CallToolResponse> {
    if (!this.connected) {
      throw new Error('MCP client not connected');
    }
    const response = await this.client.callTool({
      name: params.name,
      _meta: {},
      arguments: params.arguments ?? {},
    });

    if (response.isError) {
      throw new Error(`Error calling tool ${params.name}: ${response.error}`);
    }

    const content = response.content as Array<{ type: string; text?: string; [key: string]: unknown } | null | undefined>;
    const textParts = content
      .filter((part): part is { type: 'text'; text: string } =>
        part != null && part.type === 'text' && typeof part.text === 'string'
      )
      .map((part): ContentPart => ({
        type: 'text',
        text: part.text,
      }));

    return {
      content: textParts,
    };
  }
}
