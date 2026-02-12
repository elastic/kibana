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
