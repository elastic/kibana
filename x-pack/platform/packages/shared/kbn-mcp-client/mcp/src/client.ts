/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type {
  StreamableHTTPClientTransport,
  StreamableHTTPError,
} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { McpError, ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';
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
import { McpNotConnectedError } from './mcp_not_connected_error';

/**
 * MCP SDK modules are loaded lazily on `connect()` so that merely importing this package
 * does not pull the SDK into the Kibana server startup path. The loaded modules are cached
 * here for the error predicates below: until the SDK has been loaded, no SDK error instance
 * can exist, so the predicates safely return false.
 */
let streamableHttpSdk:
  | typeof import('@modelcontextprotocol/sdk/client/streamableHttp.js')
  | undefined;
let authSdk: typeof import('@modelcontextprotocol/sdk/client/auth.js') | undefined;
let typesSdk: typeof import('@modelcontextprotocol/sdk/types.js') | undefined;

/** JSON-RPC error code emitted by the MCP SDK when the connection closed. */
export const MCP_ERROR_CODE_CONNECTION_CLOSED = -32000;

export function isStreamableHTTPError(error: unknown): error is StreamableHTTPError {
  return streamableHttpSdk !== undefined && error instanceof streamableHttpSdk.StreamableHTTPError;
}

export function isUnauthorizedError(error: unknown): error is UnauthorizedError {
  return authSdk !== undefined && error instanceof authSdk.UnauthorizedError;
}

export function isMcpError(error: unknown): error is McpError {
  return typesSdk !== undefined && error instanceof typesSdk.McpError;
}

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

/**
 * McpClient is a wrapper around the MCP client SDK.
 * It provides a simple interface for connecting to an MCP client,
 * listing tools, and calling tools.
 */
export class McpClient {
  private client?: Client;
  private transport?: StreamableHTTPClientTransport;

  private connected: boolean = false;

  public name: string;
  public version: string;

  constructor(
    private readonly logger: Logger,
    private readonly clientDetails: ClientDetails,
    private readonly options: McpClientOptions = {}
  ) {
    this.name = clientDetails.name;
    this.version = clientDetails.version;
  }

  /**
   * Public getter for the connection status.
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Connect to the MCP client and return the connected status and capabilities.
   */
  async connect(): Promise<{ connected: boolean; capabilities?: ServerCapabilities }> {
    if (!this.connected) {
      this.logger.debug(`Attempting to connect to MCP server ${this.name}, ${this.version}`);
      try {
        const [{ Client: ClientClass }, streamableHttp, auth, types] = await Promise.all([
          import('@modelcontextprotocol/sdk/client/index.js'),
          import('@modelcontextprotocol/sdk/client/streamableHttp.js'),
          import('@modelcontextprotocol/sdk/client/auth.js'),
          import('@modelcontextprotocol/sdk/types.js'),
        ]);
        streamableHttpSdk = streamableHttp;
        authSdk = auth;
        typesSdk = types;

        if (!this.client || !this.transport) {
          const {
            headers = {},
            fetch: customFetch,
            maxRetries = 3,
            reconnectionDelayGrowFactor = 1.5,
            initialReconnectionDelay = 1000,
            maxReconnectionDelay = 10000,
          } = this.options;

          this.transport = new streamableHttp.StreamableHTTPClientTransport(
            new URL(this.clientDetails.url),
            {
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
            }
          );

          this.client = new ClientClass(
            {
              name: this.clientDetails.name,
              version: this.clientDetails.version,
            },
            {
              jsonSchemaValidator: new ZodJsonSchemaValidator(this.logger),
            }
          );
          // The SDK drops its transport when the connection closes. Track that so a pooled,
          // long-lived instance does not keep reporting itself as connected.
          this.client.onclose = () => {
            if (this.connected) {
              this.connected = false;
              this.logger.debug(`MCP server ${this.name}, ${this.version} closed the connection`);
            }
          };
        }

        // connect() performs the initialization handshake with the MCP server as per MCP protocol
        await this.client.connect(this.transport);
        this.connected = true;
        this.logger.debug(`Connected to MCP server ${this.name}, ${this.version}`);
      } catch (error) {
        const errorMessage = formatConnectionErrorMessage(error);
        this.logger.error(
          `Error connecting to MCP server ${this.name}, ${this.version}: ${errorMessage}`
        );
        if (isStreamableHTTPError(error)) {
          throw new Error(errorMessage);
        } else if (isUnauthorizedError(error)) {
          throw new Error(`Unauthorized error: ${errorMessage}`);
        } else {
          throw new Error(`Error connecting to MCP server: ${errorMessage}`);
        }
      }
    }
    // return the full list of capabilities as a by-product of the initialization handshake
    const capabilities = this.client?.getServerCapabilities();

    return {
      connected: this.connected,
      capabilities,
    };
  }

  /** Server capabilities from the initialize handshake; undefined until connected. */
  getServerCapabilities(): ServerCapabilities | undefined {
    if (!this.connected) {
      return undefined;
    }
    return this.client?.getServerCapabilities();
  }

  /**
   * Disconnect from the MCP client and return the disconnected status.
   */
  async disconnect(): Promise<void> {
    if (this.connected && this.client) {
      this.logger.debug(`Attempting to disconnect from MCP server ${this.name}, ${this.version}`);
      await this.client.close();
      this.connected = false;
      this.logger.debug(`Disconnected from MCP client ${this.name}, ${this.version}`);
    }
  }

  /**
   * List the tools available on the MCP client.
   */
  async listTools(): Promise<ListToolsResponse> {
    const client = this.getConnectedClient();

    this.logger.debug(`Listing tools from MCP server ${this.name}, ${this.version}`);
    const getNextPage = async (cursor?: string): Promise<Tool[]> => {
      const response = await client.listTools({
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
            annotations: tool.annotations,
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

  /**
   * Call a tool on the MCP client.
   * This method returns text content, plus resource links and embedded resources.
   * It does not support other content types such as images and audio.
   * @param {CallToolParams} params - The parameters for the tool call.
   */
  async callTool(params: CallToolParams): Promise<CallToolResponse> {
    const client = this.getConnectedClient();

    this.logger.debug(`Calling tool ${params.name} on MCP server ${this.name}, ${this.version}`);
    const response = await client.callTool({
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

  private getConnectedClient(): Client {
    if (!this.connected || !this.client) {
      throw new McpNotConnectedError(this.name, this.version);
    }
    return this.client;
  }
}
