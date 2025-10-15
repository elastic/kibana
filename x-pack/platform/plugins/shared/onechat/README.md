# Onechat plugin

Home of the **Agent Builder** framework.

Note: as many other platform features, onechat isolates its public types and static utils, exposed from packages,
from its APIs, exposed from the plugin.

The onechat plugin has 4 main packages:

- `@kbn/onechat-common`: types and utilities which are shared between browser and server
- `@kbn/onechat-server`: server-specific types and utilities
- `@kbn/onechat-browser`: browser-specific types and utilities.
- `@kbn/onechat-genai-utils`: server-side utilities for our built-in tools and agents.

## Enable all feature flags

All features in the Onechat plugin are developed behind UI settings (feature flags). 
By default, in-progress or experimental features are disabled. 
To enable all features for development or testing, add the following to your `kibana.dev.yml`:

```yml
uiSettings.overrides:
  agentBuilder:enabled: true
```

This will ensure all Onechat features are available in your Kibana instance.

If running in Serverless or Cloud dev environments, it may be more practical to adjust these via API:

```
POST kbn://internal/kibana/settings
{
   "changes": {
      "agentBuilder:enabled": true
   }
}
```

## Enabling tracing

Onechat agents are compatible with the Kibana inference tracing.

You can enable tracing on your local instance by adding the following config parameters:

```yaml
telemetry.enabled: true
telemetry.tracing.enabled: true

telemetry.tracing.exporters.phoenix.base_url: {phoenix server url}
telemetry.tracing.exporters.phoenix.public_url: {phoenix server url}
telemetry.tracing.exporters.phoenix.project_name: {your project name}
```

To run phoenix locally and configuring Kibana inference tracing accordingly:

```bash
docker run -p 6006:6006 -p 4317:4317 -i -t arizephoenix/phoenix:latest
```

and then edit the Kibana config:

```yaml
telemetry.enabled: true
telemetry.tracing.enabled: true

telemetry.tracing.exporters.phoenix.base_url: 'http://localhost:6006/'
telemetry.tracing.exporters.phoenix.public_url: 'http://localhost:6006/'
telemetry.tracing.exporters.phoenix.project_name: '1chat'
```

## Overview

The onechat plugin exposes APIs to interact with onechat primitives.

The main primitives are:

- [tools](#tools)

Additionally, the plugin implements [MCP server](#mcp-server) that exposes onechat tools and [A2A server](#a2a-server) that exposes onechat agents for agent-to-agent communication.

## Tools

A tool can be thought of as an agent-friendly function, with the metadata required for the agent to understand its purpose
and how to call it.

Tools can come from multiple sources:
- built-in from Kibana
- created by users
- from external MCP servers (with API key or OAuth authentication)

### Type of tools

- builtin: "Code" tools, which expose a handler that executes an arbitrary function.
- esql: ES|QL tools, which are defined by a templated ES|QL query and its corresponding parameters.
- index_search: An agentic search tool that can be scoped to an index pattern.
- workflow: A tool that executes a workflow.
- mcp: Tools exposed by external Model Context Protocol (MCP) servers.

### Registering a tool

Please refer to the [Contributor guide](./CONTRIBUTOR_GUIDE.md) for info and examples details.

### Executing a tool

Executing a tool can be done using the `execute` API of the onechat tool start service:

```ts
const { result } = await onechat.tools.execute({
  toolId: 'my_tool',
  toolParams: { someNumber: 9000 },
  request,
});
```

It can also be done directly from a tool definition:

```ts
const tool = await onechat.tools.registry.get({ toolId: 'my_tool', request });
const { result } = await tool.execute({ toolParams: { someNumber: 9000 } });
```

### Error handling

All onechat errors inherit from the `OnechatError` error type. Various error utilities
are exposed from the `@kbn/onechat-common` package to identify and handle those errors.

Some simple example of handling a specific type of error:

```ts
import { isToolNotFoundError } from '@kbn/onechat-common';

try {
  const { result } = await onechat.tools.execute({
    toolId: 'my_tool',
    toolParams: { someNumber: 9000 },
    request,
  });
} catch (e) {
  if (isToolNotFoundError(e)) {
    throw new Error(`run ${e.meta.runId} failed because tool was not found`);
  }
}
```

## Agents

Agents can be either built-in or user-defined.

### Registering a built-in agent

Please refer to the [Contributor guide](./CONTRIBUTOR_GUIDE.md) for info and examples details.

## MCP Server

The MCP server provides a standardized interface for external MCP clients to access onechat tools. It's available on `/api/agent_builder/mcp` endpoint.

### Running with Claude Desktop

Configure Claude Desktop by adding this to its configuration:
```json
{
  "mcpServers": {
    "elastic": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "http://localhost:5601/api/agent_builder/mcp",
        "--header",
        "Authorization:${AUTH_HEADER}"
      ],
      "env": {
        "AUTH_HEADER": "ApiKey {...}"
      }
    }
  }
}
```

## Connecting to External MCP Servers

Onechat can connect to external MCP servers to expose their tools to your agents. External MCP servers support both API key and OAuth 2.1 authentication.

### Configuration

Add MCP server configurations to your `kibana.yml`:

```yaml
xpack.onechat.mcp.servers:
  - id: context7
    name: "Context7 Documentation"
    enabled: true
    url: "https://mcp.context7.com/mcp"
    # No auth required for Context7
  
  - id: paypal
    name: "PayPal MCP Server"
    enabled: true
    url: "https://api.paypal.com/mcp/v1"
    auth:
      type: oauth
      clientId: "YOUR_PAYPAL_CLIENT_ID"
      discoveryUrl: "https://api.paypal.com/.well-known/oauth-protected-resource"
      scopes: ["openid", "mcp"]
  
  - id: custom_mcp
    name: "Custom MCP Server"
    enabled: true
    url: "https://your-server.com/mcp"
    auth:
      type: apiKey
      headers:
        X-API-Key: "${CUSTOM_MCP_API_KEY}"
```

### OAuth Authentication

For MCP servers requiring OAuth 2.1 authentication:

1. **Register Your Application**: Register Kibana as an OAuth client with the MCP server provider (e.g., PayPal).
   - Set the redirect URI to: `https://your-kibana-instance/app/onechat/oauth/callback`
   - Note your `client_id`

2. **Configure the Server**: Add the OAuth configuration to `kibana.yml` as shown above.

3. **User Authentication**: 
   - When enabling MCP tools in the Agent Builder, users will see the OAuth connection status
   - Click "Connect to [Server Name]" to initiate the OAuth flow
   - Users will be redirected to the OAuth provider for authorization
   - After authorization, users are redirected back to Agent Builder
   - Tokens are stored securely in browser localStorage per user

4. **Automatic Token Management**:
   - Access tokens are automatically attached to tool execution requests
   - Expired tokens are automatically refreshed using refresh tokens
   - Users are prompted to re-authenticate if refresh fails

### OAuth Discovery

Onechat automatically discovers OAuth endpoints using the MCP specification:
- **RFC 9728**: Protected Resource Metadata
- **RFC 8414**: OAuth 2.0 Authorization Server Metadata  
- **OpenID Connect Discovery 1.0**: OIDC well-known endpoints

You can provide explicit `authorizationEndpoint` and `tokenEndpoint` if auto-discovery is not supported:

```yaml
auth:
  type: oauth
  clientId: "your-client-id"
  authorizationEndpoint: "https://provider.com/oauth/authorize"
  tokenEndpoint: "https://provider.com/oauth/token"
  scopes: ["openid", "mcp"]
```

### PayPal MCP Setup

To connect to PayPal's MCP server:

1. **Create a PayPal App**:
   - Visit [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
   - Create a new app or use an existing one
   - Add `https://your-kibana-instance/app/onechat/oauth/callback` as a redirect URI
   - Copy your `client_id`

2. **Configure Kibana**:
   ```yaml
   xpack.onechat.mcp.servers:
     - id: paypal
       name: "PayPal MCP Server"
       enabled: true
       url: "https://api.paypal.com/mcp/v1"
       auth:
         type: oauth
         clientId: "YOUR_CLIENT_ID"
         discoveryUrl: "https://api.paypal.com/.well-known/oauth-protected-resource"
         scopes: ["openid", "mcp"]
   ```

3. **Test the Connection**:
   - Open Agent Builder > Agents > Edit Agent
   - Go to "Enabled Tools" section
   - Find PayPal tools and click "Connect to PayPal"
   - Complete the OAuth flow
   - Enable desired PayPal tools for your agent

### Security Considerations

- **Token Storage**: OAuth tokens are stored in browser localStorage, scoped per-user
- **PKCE**: All OAuth flows use PKCE (Proof Key for Code Exchange) with S256 for enhanced security
- **No Server-Side Tokens**: Kibana backend does not store OAuth tokens; they are passed from the frontend on each request
- **XSS Protection**: Kibana's Content Security Policy (CSP) mitigates XSS risks to localStorage
- **Token Expiry**: Tokens are automatically validated and refreshed before use

### Troubleshooting

**"Not connected" status for OAuth server**:
- Ensure `clientId` is correct
- Verify redirect URI is configured in OAuth provider
- Check browser console for OAuth errors
- Try clearing localStorage and re-authenticating

**Tools not appearing**:
- Check Kibana logs for MCP connection errors
- Verify the MCP server URL is accessible
- Ensure the server is enabled in configuration
- Restart Kibana after configuration changes

**Authentication errors during tool execution**:
- Token may have expired - try disconnecting and reconnecting
- Verify the OAuth scopes include necessary permissions
- Check that the MCP server accepts the token format

## A2A Server

The A2A (Agent-to-Agent) server provides a standardized interface for external A2A clients to communicate with onechat agents, enabling agent-to-agent collaboration following the A2A protocol specification.

Agentcards for onechat agents are exposed on `GET /api/agent_builder/a2a/{agentId}.json`. The protocol endpoint is: `POST /api/agent_builder/a2a/{agentId}`.

## ES|QL Based Tools

The ES|QL Tool API enables users to build custom ES|QL-powered tools that the LLM can execute against any index. Here's how to create your first ES|QL tool using a POST request in Kibana DevTools:

```json
POST kbn://api/agent_builder/tools
{
  "id": "case_by_id",
  "description": "Find a custom case by id.",
  "configuration": {
    "query": "FROM my_cases | WHERE case_id == ?case_id | KEEP title, description | LIMIT 1",
    "params": {
      "case_id": {
        "type": "keyword",
        "description": "The id of the case to retrieve"
      }
    }
  },
  "type": "esql",
  "tags": ["salesforce"]
}
```

## Use custom LLM connector

Create new LLM connector in UI (in search bar type “connectors” ), fill it in with creds. In dev console:

```
GET kbn://api/actions/connectors # find id of your connector

POST kbn://internal/kibana/settings
{
   "changes": {
      "genAiSettings:defaultAIConnector": "{connecotor id}"
   }
}
```

Or, set the default LLM in the UI under Management > GenAI Settings.
