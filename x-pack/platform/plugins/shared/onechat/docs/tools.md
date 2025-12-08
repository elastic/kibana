# Registering Built-in Tools

This document covers how to register platform tools in the Agent Builder framework.

> Also see the main [CONTRIBUTOR_GUIDE.md](../CONTRIBUTOR_GUIDE.md) for general information about built-in tools and agents.

## Registering the tool

Registering tools can be done using the `tools.register` API of the `onechat` plugin's setup contract.

```ts
class MyPlugin {
  setup(core: CoreSetup, { onechat }: { onechat: OnechatPluginSetup }) {
    onechat.tools.register(myToolDefinition);
  }
}
```

## Adding the tool to the allow list

To allow the agent builder owners to control which tools are added to our framework, we are maintaining a hardcoded
list of all internally registered tools. The intention is simply to trigger a code review from the team when
tools are added, so that we can review it.

To add a tool to the allow list, simply add the tool's id to the `AGENT_BUILDER_BUILTIN_TOOLS` array,
in `x-pack/platform/packages/shared/onechat/onechat-server/allow_lists.ts`

(Kibana will fail to start otherwise, with an explicit error message explaining what to do)

## Making sure the tool's namespace is registered as being internal

Platform tools should all be namespaced under protected namespaces, to avoid id collisions with user-created tools. 
When introducing a new protected namespace (e.g. when adding a new category of tools), it must be added
to the `protectedNamespaces` array in `x-pack/platform/packages/shared/onechat/onechat-common/base/namespaces.ts`

## Built-in tool examples

### Basic example

A simple example, with a tool just doing some math:

```ts
onechat.tools.register({
  id: 'platform.examples.add_42',
  type: ToolType.builtin,
  description: 'Returns the sum of the input number and 42.',
  tags: ['example'],
  schema: z.object({
    someNumber: z.number().describe('The number to add 42 to.'),
  }),
  handler: async ({ someNumber }) => {
    return {
      results: [
        {
          type: ToolResultType.other,
          data: { value: 42 + someNumber },
        },
      ],
    };
  },
});
```

### Using scoped services

To let tools use services scoped to the current user during execution, we expose a set of services
from the `context` object, exposed as the second parameter of the tool's handler.

This context exposes, in addition to the `request` object, a panel of pre-scoped services such as:

- scoped ES client
- model provider (exposing a scoped inference client)
- scoped logger

```ts
onechat.tools.register({
  id: 'platform.examples.scoped_services',
  type: ToolType.builtin,
  description: 'Some example',
  tags: ['example'],
  schema: z.object({
    indexPattern: z.string().describe('Index pattern to filter on'),
  }),
  handler: async ({ indexPattern }, { request, modelProvider, esClient }) => {
    const indices = await esClient.asCurrentUser.cat.indices({ index: indexPattern });

    const model = await modelProvider.getDefaultModel();
    const response = await model.inferenceClient.chatComplete(somethingWith(indices));

    const myCustomScopedService = await getMyCustomScopedService(request);
    myCustomScopedService.doSomething(response);

    return {
      results: [{ type: ToolResultType.other, data: response }],
    };
  },
});
```

Refer to `ToolHandlerContext` in `x-pack/platform/packages/shared/onechat/onechat-server/tools/handler.ts` to
have access to the full list of services available from the handler context.

### Reporting tool progress

Agentic tool execution (performing LLM calls) can take some time.

To allow the user to know what the tool is currently doing, we expose a progress reporting API accessible via
the `events` service from the handler context, which can be used to report progress updates of the tool.

Those progress updates will be displayed in the UI (inside the thinking panel), improving the user experience by being transparent
regarding what is happening under the hood.

```ts
onechat.tools.register({
  id: 'platform.examples.progress_report',
  type: ToolType.builtin,
  description: 'Some example',
  tags: ['example'],
  schema: z.object({}),
  handler: async ({}, { events }) => {
    events.reportProgress('Doing something');
    const response = doSomething();

    events.reportProgress('Doing something else');
    return doSomethingElse(response);

    return {
      results: [{ type: ToolResultType.other, data: response }],
    };
  },
});
```

### Tool result types

For our framework to understand what kind of data is being returned by a tool, all tools
must return a list of results following a specific format.

- resource
- tabular_data
- query
- other
- error

This is useful to allow the framework to perform specific processing on the results. For example,
this is how we perform visualization rendering for the `tabular_data` type, by recognizing that
a tool returned some result which can be rendered as a visualization if we want to.

This is also how we render specific type of results differently in the UI, e.g we inline `query` results
in the thinking panel.

```ts
onechat.tools.register({
  id: 'platform.examples.result_types',
  type: ToolType.builtin,
  description: 'Some example',
  tags: ['example'],
  schema: z.object({
    indexPattern: z.string().describe('Index pattern to filter on'),
  }),
  handler: async ({ indexPattern }, { events, esClient }) => {
    const esqlQuery = await generateSomeQuery(indexPattern);
    const data = await executeEsql(esqlQuery, esClient);

    return {
      results: [
        { type: ToolResultType.query, data: { esql: esqlQuery } },
        { type: ToolResultType.tabular_data, data },
      ],
    };
  },
});
```

See the `ToolResultType` and corresponding types in `x-pack/platform/packages/shared/onechat/onechat-common/tools/tool_result.ts`

## Registering other types of tools

Platform contributors aren't stuck to using the `builtin` tool type. They are free to leverage the other
existing tool types, and create static instances of them.

E.g. registering a built-in `index_search` tool:

```ts
onechatSetup.tools.register({
  id: 'platform.core.some_knowledge_base',
  type: ToolType.index_search,
  description: 'Use this tool to retrieve documentation from our knowledge base',
  configuration: {
    pattern: '.my_knowledge_base',
  },
});
```

