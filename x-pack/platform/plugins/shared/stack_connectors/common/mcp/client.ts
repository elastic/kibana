import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport, StreamableHTTPError } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

class McpClient {
  private client: Client;
  private transport: StreamableHTTPClientTransport;

  public connected: boolean = false;

  constructor(client_details: { name: string, version: string, url: string }, customHeaders?: Record<string, string>) {
    const details: Record<string, string> = {
      ...client_details,
    }

    const headers: Record<string, string> = {
      ...(customHeaders ?? {}),
    };

    this.transport = new StreamableHTTPClientTransport(
      new URL(details.url),
      {
        requestInit: {
          headers,
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
      name: details.name,
      version: details.version,
    });
  }

  async connect() {
    if (!this.connected) {
      try {
        await this.client.connect(this.transport)
        this.connected = true;
      } catch (error) {
        if (error instanceof StreamableHTTPError) {
          throw new Error(`StreamableHTTP error: ${error.message}`);
        } else if (error instanceof UnauthorizedError) {
          throw new Error(`Unauthorized error: ${error.message}`);
        } else {
          throw new Error(`Error connecting to MCP client: ${error.message}`);
        }
      }
    }
    return this.connected;
  }

  async disconnect() {
    if (this.connected) {
      await this.client.close();
      this.connected = false;
    }
    return this.connected;
  }

  async list_tools() {
    if (this.connected) {
      return await this.client.listTools();
    }

    throw new Error('MCP client not connected');
  }

  async call_tool(params: { name: string, arguments: Record<string, unknown> }) {
    if (this.connected) {
      return await this.client.callTool({
        name: params.name,
        arguments: params.arguments
      })
    }

    throw new Error('MCP client not connected');
  }
}
