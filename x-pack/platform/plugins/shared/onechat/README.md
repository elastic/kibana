# Onechat plugin

Home of the workchat framework.

Note: as many other platform features, onechat isolates its public types and static utils, exposed from packages,
from its APIs, exposed from the plugin.

The onechat plugin has 3 main packages:

- `@kbn/onechat-common`: types and utilities which are shared between browser and server
- `@kbn/onechat-server`: server-specific types and utilities
- `@kbn/onechat-browser`: browser-specific types and utilities.

## Enable all feature flags

All features in the Onechat plugin are developed behind UI settings (feature flags). By default, in-progress or experimental features are disabled. To enable all features for development or testing, add the following to your `kibana.dev.yml`:

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

A tool can be thought of as a LLM-friendly function, with the metadata required for the LLM to understand its purpose
and how to call it attached to it.

Tool can come from multiple sources: built-in from Kibana, from MCP servers, and so on. At the moment,
only built-in tools are implemented

### Registering a built-in tool

#### Basic example

```ts
class MyPlugin {
  setup(core: CoreSetup, { onechat }: { onechat: OnechatPluginSetup }) {
    onechat.tools.register({
      id: 'my_tool',
      name: 'My Tool',
      description: 'My very first tool',
      meta: {
        tags: ['foo', 'bar'],
      },
      schema: z.object({
        someNumber: z.number().describe('Some random number'),
      }),
      handler: ({ someNumber }, context) => {
        return 42 + someNumber;
      },
    });
  }
}
```

#### using the handler context to use scoped services

```ts
onechat.tools.register({
  id: 'my_es_tool',
  name: 'My Tool',
  description: 'Some example',
  schema: z.object({
    indexPattern: z.string().describe('Index pattern to filter on'),
  }),
  handler: async ({ indexPattern }, { modelProvider, esClient }) => {
    const indices = await esClient.asCurrentUser.cat.indices({ index: indexPattern });

    const model = await modelProvider.getDefaultModel();
    const response = await model.inferenceClient.chatComplete(somethingWith(indices));

    return response;
  },
});
```

#### reporting tool progress

```ts
onechat.tools.register({
  id: 'my_es_tool',
  name: 'My Tool',
  description: 'Some example',
  schema: z.object({}),
  handler: async ({}, { events }) => {
    events.reportProgress('Doing something');

    const response = doSomething();

    events.reportProgress('Doing something else');

    return doSomethingElse(response);

    return response;
  },
});
```

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

Registering a built-in agent is done using the `agents.register` API of the onechat setup contract:

#### Basic example

```ts
class MyPlugin {
  setup(core: CoreSetup, { onechat }: { onechat: OnechatPluginSetup }) {
    onechat.agents.register({
      id: 'platform.core.dashboard',
      name: 'Dashboard agent',
      description: 'Agent specialized in dashboard related tasks',
      configuration: {
        instructions: 'You are a dashboard specialist [...]',
        tools: [
          {
            tool_ids: [
              'platform.dashboard.create_dashboard',
              'platform.dashboard.edit_dashboard',
              '[...]',
            ],
          },
        ],
      },
    });
  }
}
```

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
