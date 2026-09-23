# AgentBuilder plugin

Home of the **Agent Builder** framework.

Note: as many other platform features, agentBuilder isolates its public types and static utils, exposed from packages,
from its APIs, exposed from the plugin.

The agentBuilder plugin has 4 main packages:

- `@kbn/agent-builder-common`: types and utilities which are shared between browser and server
- `@kbn/agent-builder-server`: server-specific types and utilities
- `@kbn/agent-builder-browser`: browser-specific types and utilities.
- `@kbn/agent-builder-genai-utils`: server-side utilities for our built-in tools and agents.

## Enabling tracing

AgentBuilder agents are compatible with the Kibana inference tracing.

You can enable tracing on your local instance by adding the following config parameters to `kibana.dev.yml`:

```yaml
elastic.apm.active: false
elastic.apm.contextPropagationOnly: false
telemetry.enabled: true
telemetry.tracing.enabled: true

telemetry.tracing.exporters.phoenix.base_url: {phoenix server url}
telemetry.tracing.exporters.phoenix.public_url: {phoenix server url}
telemetry.tracing.exporters.phoenix.project_name: {your project name}
```

> **Note:** `elastic.apm.active: false` and `elastic.apm.contextPropagationOnly: false` are required — Elastic APM and OpenTelemetry tracing cannot run simultaneously.

To run phoenix locally and configuring Kibana inference tracing accordingly:

```bash
docker run -p 6006:6006 -p 4317:4317 -i -t arizephoenix/phoenix:latest
```

and then edit the Kibana config:

```yaml
elastic.apm.active: false
elastic.apm.contextPropagationOnly: false
telemetry.enabled: true
telemetry.tracing.enabled: true

telemetry.tracing.exporters.phoenix.base_url: 'http://localhost:6006'
telemetry.tracing.exporters.phoenix.public_url: 'http://localhost:6006'
telemetry.tracing.exporters.phoenix.project_name: '1chat'
```

You can then view traces in the Phoenix Web UI `http://localhost:6006`

## Overview

The agentBuilder plugin exposes APIs to interact with agentBuilder primitives.

The main primitives are:

- [tools](#tools)

Additionally, the plugin implements [MCP server](#mcp-server) that exposes agentBuilder tools and [A2A server](#a2a-server) that exposes agentBuilder agents for agent-to-agent communication.

## Tools

A tool can be thought of as an agent-friendly function, with the metadata required for the agent to understand its purpose
and how to call it.

Tools can come from multiple sources:
- built-in from Kibana
- created by users
- from MCP servers

### Type of tools

- builtin: "Code" tools, which expose a handler that executes an arbitrary function.
- esql: ES|QL tools, which are defined by a templated ES|QL query and its corresponding parameters.
- index_search: An agentic search tool that can be scoped to an index pattern.
- workflow: A tool that executes a workflow.
- mcp: A tool provided by an external MCP (Model Context Protocol) server.

### Registering a tool

Please refer to the [Contributor guide](./CONTRIBUTOR_GUIDE.md) for info and examples details.

### Executing a tool

Executing a tool can be done using the `execute` API of the agentBuilder tool start service:

```ts
const { result } = await agentBuilder.tools.execute({
  toolId: 'my_tool',
  toolParams: { someNumber: 9000 },
  request,
});
```

It can also be done directly from a tool definition:

```ts
const tool = await agentBuilder.tools.registry.get({ toolId: 'my_tool', request });
const { result } = await tool.execute({ toolParams: { someNumber: 9000 } });
```

#### Pre-approving destructive APIs

A tool run has no live user, so a destructive Elasticsearch or Kibana API the tool reaches
through `execute_api` is refused rather than executed. Pass `approvals.autoApprovedApis` to
grant specific APIs for the run:

```ts
const { result } = await agentBuilder.tools.execute({
  toolId: 'my_tool',
  toolParams: { someNumber: 9000 },
  request,
  approvals: {
    autoApprovedApis: [{ target: 'elasticsearch', api: 'indices.create' }],
  },
});
```

This covers the run and the sub-agents it spawns. Every destructive API outside the list is
still refused, and omitting the field refuses all destructive APIs. An entry naming an API that
does not exist on its target is rejected with a bad-request error.

An entry can also be a namespace wildcard such as `indices.*`, or `*` for every API on that
target. Prefer the narrowest grant that works: `indices.*` includes `indices.delete`, and `*`
lets the agent perform any destructive operation the run's credentials allow, with nobody to
confirm it.

The HTTP API and the `ai.agent` workflow step take the same grant keyed by target, as the
`approvals` body property of `POST /api/agent_builder/tools/_execute` and as the `approvals`
input of the step:

```json
{
  "approvals": {
    "auto_approved_apis": {
      "elasticsearch": ["indices.create", "indices.update_aliases"],
      "kibana": ["alerting.delete-alerting-rule-id"]
    }
  }
}
```

### Error handling

All agentBuilder errors inherit from the `AgentBuilderError` error type. Various error utilities
are exposed from the `@kbn/agent-builder-common` package to identify and handle those errors.

Some simple example of handling a specific type of error:

```ts
import { isToolNotFoundError } from '@kbn/agent-builder-common';

try {
  const { result } = await agentBuilder.tools.execute({
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

## Hooks

The hooks API lets you register lifecycle callbacks around agent execution. Register hooks
in your plugin `setup` by calling `agentBuilder.hooks.register`.

### Lifecycle: user prompt → response

A **conversation round** is one turn in the chat: the user sends a message and the agent produces a full response (possibly after multiple LLM calls and tool calls).

| Order | Hook | Layer | When it runs | What you can mutate |
|-------|------|--------|----------------|---------------------|
| 1 | `beforeAgent` | Agent | After conversation transformation (e.g. HITL), before agent execution | `nextInput` (user message, attachments, etc.) |
| 2 | `beforeToolCall` | Runner | Before each tool invocation | `toolParams` |
| 3 | `afterToolCall` | Runner | After each tool returns | `toolReturn` (tool result) |
| 4 | (steps 2–3 repeat as the agent loops: model → tools → model → …) | | | |

Example: register hooks for every lifecycle event in a single call. `priority` apply to all entries; each lifecycle entry has `mode` and `handler`:

```ts
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import { HookLifecycle, HookExecutionMode } from '@kbn/agent-builder-common';

export const registerAgentBuilderHooks = (agentBuilder?: AgentBuilderPluginSetup) => {
  if (!agentBuilder) return;

  agentBuilder.hooks.register({
    id: 'example-hooks',
    hooks: {
      [HookLifecycle.beforeAgent]: {
        mode: HookExecutionMode.blocking,
        handler: (context) => {
          console.log('beforeAgent');
          return {
            nextInput: {
              ...context.nextInput,
              message: context.nextInput.message
                ? `${context.nextInput.message} (hooked)`
                : undefined,
            },
          };
        },
      },
      [HookLifecycle.beforeToolCall]: {
        mode: HookExecutionMode.blocking,
        handler: (context) => {
          console.log('beforeToolCall');
          return {
            toolParams: {
              ...context.toolParams,
              _hooked: true,
            },
          };
        },
      },
      [HookLifecycle.afterToolCall]: {
        mode: HookExecutionMode.blocking,
        handler: (context) => {
          console.log('afterToolCall');
        },
      },
    }
  });
};
```


### Execution order
The hook execution respects the priority field  and after that the registration order.

* before* hooks: First to last
* after* hooks: Last to first (reverse)

#### Execution flow
```
Before hooks run in order:

    hook_1 beforeAgent
    hook_2 beforeAgent
    hook_3 beforeAgent

    hook_1 beforeToolCall
    hook_2 beforeToolCall
    hook_3 beforeToolCall

After hooks run in reverse order:

    hook_3 afterToolCall
    hook_2 afterToolCall
    hook_1 afterToolCall
```

## MCP Server

The MCP server provides a standardized interface for external MCP clients to access agentBuilder tools. It's available on `/api/agent_builder/mcp` endpoint.

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

### Local OAuth setup (serverless only)

MCP clients can authenticate with an OAuth 2.1 access token instead of an API key. Clients discover how to do so from the OAuth 2.0 Protected Resource Metadata that Kibana serves at `/.well-known/oauth-protected-resource`, which is populated from `xpack.security.mcp.oauth2.metadata`. That setting only exists in serverless, so this flow needs a serverless Kibana pointed at an Elasticsearch that runs the UIAM OAuth authorization server.

1. Add the following to `config/kibana.dev.yml`, adjusting the URLs if you serve Kibana over HTTPS or on a different port:

   ```yaml
   server.publicBaseUrl: http://localhost:5601
   xpack.security.mcp.oauth2.metadata:
     authorization_servers: [https://localhost:8444/oauth2]
     resource: http://localhost:5601/api/agent_builder/mcp
   ```

   `server.publicBaseUrl` determines the resource metadata URL that Kibana advertises in the `WWW-Authenticate` header when an MCP request is rejected with a 401. Without it, Kibana falls back to the incoming request URL, which is not necessarily reachable by the client.

   > **Note:** `xpack.security.mcp` is only accepted in serverless. While these keys are in `kibana.dev.yml`, a non-serverless Kibana refuses to start with `[config validation of [xpack.security].mcp]: a value wasn't expected to be present`, so comment them out before going back to `yarn start`.

2. Start Elasticsearch with the UIAM OAuth authorization server by passing `--uiam-oauth`. For example:

   ```bash
   yarn es serverless --projectType elasticsearch --uiam-oauth
   ```

   That flag defaults to `false` even though `--uiam` defaults to `true`, so it has to be passed explicitly. It starts an additional `uiam-oauth` container that serves the authorization server on `https://localhost:8444`, alongside the UIAM service itself on `https://localhost:8443`. Leave UIAM itself enabled: the MCP client management UI used in step 4 is hidden when it is off.

3. Run Kibana in serverless mode, for example:

   ```bash
   yarn serverless-es
   ```

4. Register an OAuth client from **Agents > Tools > Manage all tools > Manage MCP > Manage MCP clients (OAuth) > Add MCP client**. The dialog shown after creation has the client ID and MCP server URL that your client needs. Redirect URIs are client-specific, and the authorization server accepts any localhost port but matches the path exactly, so refer to [Create an OAuth client in Elastic Agent Builder](https://www.elastic.co/docs/deploy-manage/app-connections/create-oauth-client) for the value your client expects.

5. Configure your MCP client with that client ID and server URL, then complete the browser-based authorization. [Connect an MCP host to Elastic Agent Builder](https://www.elastic.co/docs/deploy-manage/app-connections/connect-mcp-host) covers the setup for Claude Code and Claude Desktop.

#### Troubleshooting

Node-based clients may reject the self-signed certificate that the OAuth container serves on `https://localhost:8444` and fail during the token exchange. If you hit a certificate error, point Node at the Kibana development CA in the shell that runs the client:

```bash
# Run from the Kibana root, in the same shell as your MCP client
export NODE_EXTRA_CA_CERTS="$(pwd)/src/platform/packages/shared/kbn-dev-utils/certs/ca.crt"
```

Whether this is needed depends on the client: some ship their own trust store, and others ignore the variable entirely.

## A2A Server

The A2A (Agent-to-Agent) server provides a standardized interface for external A2A clients to communicate with agentBuilder agents, enabling agent-to-agent collaboration following the A2A protocol specification.

Agentcards for agentBuilder agents are exposed on `GET /api/agent_builder/a2a/{agentId}.json`. The protocol endpoint is: `POST /api/agent_builder/a2a/{agentId}`.

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
