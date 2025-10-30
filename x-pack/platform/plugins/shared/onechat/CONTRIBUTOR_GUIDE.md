# Agent Builder - contributor guide

This document is intended for platform contributors to the Agent Builder framework,
explains the base concepts and how to register "platform" tools and agents.

(But please also check the [README.md](./README.md) too for more general information about Agent Builder)

## Difference between built-in tools and agents and their user-created counterparts

Platform and user-created tools and agents share the same concepts and API, but have some notable differences:

### read-only

Platform tools and agents are read-only, and cannot be modified or deleted by the user.

### space awareness

- User-created tools are **space-aware** (accessible exclusively from the space they were created in).
- Platform tools and agents are **space agnostic**: they are accessible from any space.
  - _(as long as the user has access to it and the feature is enabled for that space)_

### id namespacing

- User-created tools and agents are free to use any id they want, as long as they are unique and not inside platform reserved namespaces.
- Platform tools and agents should be namespaced, using reserved namespaces (e.g. `platform.core.*`)
- This is meant both for categorization, and to avoid id collisions (e.g. we introduce in a later version a tool with the same id as a tool a user created)

### built-in tool type

Platform tools can use the internal `builtin` tool type, allowing them to register tools executing arbitrary code from
the Kibana server, where user-created tools can only use the other (serializable) tool types.

## Registering Built-in tools

### Registering the tool

Registering tools can be done using the `tools.register` API of the `onechat` plugin's setup contract.

```ts
class MyPlugin {
  setup(core: CoreSetup, { onechat }: { onechat: OnechatPluginSetup }) {
    onechat.tools.register(myToolDefinition);
  }
}
```

### Adding the tool to the allow list

To allow the agent builder owners to control which tools are added to our framework, we are maintaining a hardcoded
list of all internally registered tools. The intention is simply to trigger a code review from the team when
tools are added, so that we can review it.

To add a tool to the allow list, simply add the tool's id to the `AGENT_BUILDER_BUILTIN_TOOLS` array,
in `x-pack/platform/packages/shared/onechat/onechat-server/allow_lists.ts`

(Kibana will fail to start otherwise, with an explicit error message explaining what to do)

### Making sure the tool's namespace is registered as being internal

Platform tools should all be namespaced under protected namespaces, to avoid id collisions with user-created tools. 
When introducing a new protected namespace (e.g. when adding a new category of tools), it must be added
to the `protectedNamespaces` array in `x-pack/platform/packages/shared/onechat/onechat-common/base/namespaces.ts`

### Built-in tool examples

#### Basic example

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

#### using scoped services

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

#### reporting tool progress

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

#### Tool result types

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

### Registering other types of tools

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

## Registering built-in agents

### Registering the agent

```ts
class MyPlugin {
  setup(core: CoreSetup, { onechat }: { onechat: OnechatPluginSetup }) {
    onechat.agents.register(myAgentDefinition);
  }
}
```

### Adding the agent to the allow list

Similar to tools, we keep an hardcoded list of registered agents to trigger a code review from the team when
agents are added.

To add a tool to the allow list, simply add the tool's id to the `AGENT_BUILDER_BUILTIN_AGENTS` array,
in `x-pack/platform/packages/shared/onechat/onechat-server/allow_lists.ts`

(Kibana will fail to start otherwise, with an explicit error message explaining what to do)

### Making sure the agent's namespace is registered as being internal

Platform agents should all be namespaced under protected namespaces, to avoid id collisions with user-created agents.
When introducing a new protected namespace (e.g. when adding a new category of agents), it must be added
to the `protectedNamespaces` array in `x-pack/platform/packages/shared/onechat/onechat-common/base/namespaces.ts`

### Basic example

How registering a basic agent looks like:

```ts
onechat.agents.register({
  id: 'platform.core.dashboard',
  name: 'Dashboard agent',
  description: 'Agent specialized in dashboard related tasks',
  avatar_icon: 'dashboardApp',
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
```


### Specific research and answer instructions

It is possible to specify specific research and answer instructions for an agent, to avoid
mixing instructions, which can sometimes be confusing for the agent. It also allows to specify
different instructions for each step of the agent's flow..

```ts
onechat.agents.register({
  id: 'platform.core.dashboard',
  name: 'Dashboard agent',
  description: 'Agent specialized in dashboard related tasks',
  avatar_icon: 'dashboardApp',
  configuration: {
    research: {
      instructions: 'You are a dashboard builder specialist assistant. Always uses the XXX tool when the user wants to YYY...'
    },
    answer: {
      instructions: 'When answering, if a dashboard configuration is present in the results, always render it using [...]',
    },
    tools: [
      {
        tool_ids: [someListOfToolIds],
      },
    ],
  },
});
```

Refer to [`AgentConfiguration`](https://github.com/elastic/kibana/blob/main/x-pack/platform/packages/shared/onechat/onechat-common/agents/definition.ts)
for the full list of available configuration options.

## Registering attachment types

Attachments are used to provide additional context when conversing with an agent.

It is possible to register custom attachment types, to have control over how the data is exposed to the agent,
and how it is rendered in the UI.

### Server-side registration

You can register an attachment type by using the `attachments.registerType` API of the `onechat` plugin's setup contract.

```ts
class MyPlugin {
  setup(core: CoreSetup, { onechat }: { onechat: OnechatPluginSetup }) {
    onechat.attachments.registerType(myAttachmentDefinition);
  }
}
```

There are two main categories of attachment types:
- `inline`: attachment is self-contained, with the data attached to it.
  `reference`: reference a persisted resource (for example, a dashboard, an alert, etc) by its id, and resolve it dynamically when needed.
  - (Not implemented yet)

**Example of inline attachment type definition:**

```ts
const textDataSchema = z.object({
  content: z.string(),
});

const textArrachmentType: InlineAttachmentTypeDefinition = {
  // unique id of the attachment type
  id: AttachmentType.text,
  // type: inline or reference
  type: 'inline',
  // validate and parse the input when received from the client
  validate: (input) => {
    const parseResult = textDataSchema.safeParse(input);
    if (parseResult.success) {
      return { valid: true, data: parseResult.data };
    } else {
      return { valid: false, error: parseResult.error.message };
    }
  },
  // format the data to be exposed to the LLM
  format: (input) => {
    return { type: 'text', value: input.content };
  },
}
```

Refer to [`AttachmentTypeDefinition`](https://github.com/elastic/kibana/blob/main/x-pack/platform/packages/shared/onechat/onechat-server/attachments/type_definition.ts)
for the full list of available configuration options.

### Browser-side registration

Not implemented yet 