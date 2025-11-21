import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

class McpClient {
  private client: Client;
  private transport: StreamableHTTPClientTransport;

  constructor(url: string, customHeaders?: Record<string, string>) {
    const headers: Record<string, string> = {
      ...(customHeaders ?? {}),
    };

    this.transport = new StreamableHTTPClientTransport(
      new URL(url),
      {
        requestInit: {
          headers,
        },
      },
    );

    this.client = new Client({
      name: "mcp-client",
      version: "1.0.0"
    });
  }

  async connect() {
    await this.client.connect(this.transport);
  }

  async disconnect() {
    await this.client.close();
  }

  async list_tools() {
    return await this.client.listTools();
  }

  async call_tool(params: { name: string, arguments: Record<string, unknown> }) {
    // We expect params to contain:
    // - name: the name of the tool to call
    // - arguments: the arguments to pass to the tool
    // We expect the caller of this function to handle input and schema validation.

    return await this.client.callTool({
      name: params.name,
      arguments: params.arguments
    })
  }
}
