/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';
import type { Logger } from '@kbn/core/server';
import type {
  ClientDetails,
  CallToolParams,
  CallToolResponse,
  ContentPart,
  ListToolsResponse,
  Tool,
  McpClientOptions,
} from './types';
import { isEmbeddedResourcePart, isResourceLinkPart, isTextPart } from './types';
import { ZodJsonSchemaValidator } from './json_schema_validator';

/**
 * Produces a human-readable error message from a connection error,
 * surfacing the `cause` that would otherwise be hidden behind
 * the opaque "fetch failed" message from Node.js.
 */
function formatConnectionErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error ? error.cause : undefined;

  if (cause instanceof Error) {
    return `${message} (cause: ${cause.message})`;
  }

  return message;
}

export class McpClient {
  private readonly client: Client;
  private readonly transport: StreamableHTTPClientTransport;

  private connected: boolean = false;

  public name: string;
  public version: string;

  constructor(
    private readonly logger: Logger,
    clientDetails: ClientDetails,
    {
      headers = {},
      fetch: customFetch,
      maxRetries = 3,
      reconnectionDelayGrowFactor = 1.5,
      initialReconnectionDelay = 1000,
      maxReconnectionDelay = 10000,
    }: McpClientOptions = {}
  ) {
    this.transport = new StreamableHTTPClientTransport(new URL(clientDetails.url), {
      requestInit: {
        headers,
      },
      ...(customFetch ? { fetch: customFetch } : {}),
      reconnectionOptions: {
        maxRetries,
        reconnectionDelayGrowFactor,
        initialReconnectionDelay,
        maxReconnectionDelay,
      },
    });

    this.name = clientDetails.name;
    this.version = clientDetails.version;

    this.client = new Client(
      {
        name: clientDetails.name,
        version: clientDetails.version,
      },
      {
        jsonSchemaValidator: new ZodJsonSchemaValidator(this.logger),
      }
    );
  }

  isConnected(): boolean {
    return this.connected;
  }

  async connect(): Promise<{ connected: boolean; capabilities?: ServerCapabilities }> {
    if (!this.connected) {
      this.logger.debug(`Attempting to connect to MCP server ${this.name}, ${this.version}`);
      try {
        await this.client.connect(this.transport);
        this.connected = true;
        this.logger.debug(`Connected to MCP server ${this.name}, ${this.version}`);
      } catch (error) {
        const errorMessage = formatConnectionErrorMessage(error);
        this.logger.error(
          `Error connecting to MCP server ${this.name}, ${this.version}: ${errorMessage}`
        );
        if (error instanceof Error) {
          throw error;
        }
        throw new Error(`Error connecting to MCP server: ${errorMessage}`);
      }
    }
    // return the full list of capabilities as a by-product of the initialization handshake
    const capabilities = this.client.getServerCapabilities();

    return {
      connected: this.connected,
      capabilities,
    };
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      this.logger.debug(`Attempting to disconnect from MCP server ${this.name}, ${this.version}`);
      try {
        await this.transport.terminateSession();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.debug(
          `Error terminating MCP session ${this.name}, ${this.version}: ${errorMessage}`
        );
      }
      await this.client.close();
      this.connected = false;
      this.logger.debug(`Disconnected from MCP client ${this.name}, ${this.version}`);
    }
  }

  async listTools(): Promise<ListToolsResponse> {
    if (!this.connected) {
      throw new Error(`MCP client not connected to ${this.name}, ${this.version}`);
    }

    this.logger.debug(`Listing tools from MCP server ${this.name}, ${this.version}`);
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

  /** Returns text, resource links, and embedded resources. Images and audio are dropped. */
  async callTool(params: CallToolParams): Promise<CallToolResponse> {
    if (!this.connected) {
      throw new Error(`MCP client not connected to ${this.name}, ${this.version}`);
    }

    this.logger.debug(`Calling tool ${params.name} on MCP server ${this.name}, ${this.version}`);
    const response = await this.client.callTool({
      name: params.name,
      arguments: params.arguments,
    });

    const content = (Array.isArray(response.content) ? response.content : []) as Array<
      ContentPart | null | undefined
    >;
    const allowedParts = content.filter(
      (part): part is ContentPart =>
        isTextPart(part) || isResourceLinkPart(part) || isEmbeddedResourcePart(part)
    );
    const textParts = allowedParts.filter(isTextPart);

    if (response.isError) {
      // Tool execution errors are returned as text content parts
      // See https://modelcontextprotocol.io/specification/2025-11-25/server/tools#error-handling
      const errorText = textParts.map((part) => part.text).join('\n') || 'Unknown tool error';
      throw new Error(
        `Error calling tool '${params.name}' with arguments '${JSON.stringify(
          params.arguments
        )}': ${errorText}`
      );
    }

    return {
      content: allowedParts,
    };
  }
}
