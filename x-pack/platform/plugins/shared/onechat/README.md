# Onechat plugin

Home of the workchat framework.

Note: as many other platform features, onechat isolates its public types and static utils, exposed from packages,
from its APIs, exposed from the plugin.

The onechat plugin has 3 main packages:

- `@kbn/onechat-common`: types and utilities which are shared between browser and server
- `@kbn/onechat-server`: server-specific types and utilities
- `@kbn/onechat-browser`: browser-specific types and utilities.

## Overview

The onechat plugin exposes APIs to interact with onechat primitives.

The main primitives are:

- tools

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

#### emitting events

```ts
onechat.tools.register({
  id: 'my_es_tool',
  name: 'My Tool',
  description: 'Some example',
  schema: z.object({}),
  handler: async ({}, { events }) => {
    events.emit({
      type: 'my_custom_event',
      data: { stage: 'before' },
    });

    const response = doSomething();

    events.emit({
      type: 'my_custom_event',
      data: { stage: 'after' },
    });

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

### Event handling

Tool execution emits `toolCall` and `toolResponse` events:

```ts
import { isToolCallEvent, isToolResponseEvent } from '@kbn/onechat-server';

const { result } = await onechat.tools.execute({
  toolId: 'my_tool',
  toolParams: { someNumber: 9000 },
  request,
  onEvent: (event) => {
    if (isToolCallEvent(event)) {
      const {
        data: { toolId, toolParams },
      } = event;
    }
    if (isToolResponseEvent(event)) {
      const {
        data: { toolResult },
      } = event;
    }
  },
});
```

### Tool identifiers

Because tools are coming from multiple sources, and because we need to be able to identify
which source a given tool is coming from (e.g. for execution), we're using the concept of tool identifier
to represent more than a plain id.

Tool identifier come into 3 shapes:

- `PlainIdToolIdentifier`: plain tool identifiers
- `StructuredToolIdentifier`: structured (object version)
- `SerializedToolIdentifier`: serialized string version

Using a `plain` id is always possible but discouraged, as in case of id conflict,
the system will then just pick an arbitrary tool in any source available.

E.g. avoid doing:

```ts
await onechat.tools.execute({
  toolId: 'my_tool',
  toolParams: { someNumber: 9000 },
  request,
});
```

And instead do:

```ts
import { ToolSourceType, builtinSourceId } from '@kbn/onechat-common';

await onechat.tools.execute({
  toolId: {
    toolId: 'my_tool',
    sourceType: ToolSourceType.builtIn,
    sourceId: builtinSourceId,
  },
  toolParams: { someNumber: 9000 },
  request,
});
```

Or, with the corresponding utility:

```ts
import { createBuiltinToolId } from '@kbn/onechat-common';

await onechat.tools.execute({
  toolId: createBuiltinToolId('my_tool'),
  toolParams: { someNumber: 9000 },
  request,
});
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
