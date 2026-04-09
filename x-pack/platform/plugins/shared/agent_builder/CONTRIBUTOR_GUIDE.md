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

Registering tools can be done using the `tools.register` API of the `agentBuilder` plugin's setup contract.

```ts
class MyPlugin {
  setup(core: CoreSetup, { agentBuilder }: { agentBuilder: AgentBuilderPluginSetup }) {
    agentBuilder.tools.register(myToolDefinition);
  }
}
```

### Adding the tool to the allow list

To allow the agent builder owners to control which tools are added to our framework, we are maintaining a hardcoded
list of all internally registered tools. The intention is simply to trigger a code review from the team when
tools are added, so that we can review it.

To add a tool to the allow list, simply add the tool's id to the `AGENT_BUILDER_BUILTIN_TOOLS` array,
in `x-pack/platform/packages/shared/agent-builder/agent-builder-server/allow_lists.ts`

(Kibana will fail to start otherwise, with an explicit error message explaining what to do)

### Making sure the tool's namespace is registered as being internal

Platform tools should all be namespaced under protected namespaces, to avoid id collisions with user-created tools.
When introducing a new protected namespace (e.g. when adding a new category of tools), it must be added
to the `protectedNamespaces` array in `x-pack/platform/packages/shared/agent-builder/agent-builder-common/base/namespaces.ts`

### Built-in tool examples

#### Basic example

A simple example, with a tool just doing some math:

```ts
agentBuilder.tools.register({
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
agentBuilder.tools.register({
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

Refer to `ToolHandlerContext` in `x-pack/platform/packages/shared/agent-builder/agent-builder-server/tools/handler.ts` to
have access to the full list of services available from the handler context.

#### reporting tool progress

Agentic tool execution (performing LLM calls) can take some time.

To allow the user to know what the tool is currently doing, we expose a progress reporting API accessible via
the `events` service from the handler context, which can be used to report progress updates of the tool.

Those progress updates will be displayed in the UI (inside the thinking panel), improving the user experience by being transparent
regarding what is happening under the hood.

```ts
agentBuilder.tools.register({
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
- esql_results
- query
- other
- error

This is useful to allow the framework to perform specific processing on the results. For example,
this is how we perform visualization rendering for the `esql_results` type, by recognizing that
a tool returned some result which can be rendered as a visualization if we want to.

This is also how we render specific type of results differently in the UI, e.g we inline `query` results
in the thinking panel.

```ts
agentBuilder.tools.register({
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
        { type: ToolResultType.esqlResults, data },
      ],
    };
  },
});
```

See the `ToolResultType` and corresponding types in `x-pack/platform/packages/shared/agent-builder/agent-builder-common/tools/tool_result.ts`

### Registering other types of tools

Platform contributors aren't stuck to using the `builtin` tool type. They are free to leverage the other
existing tool types, and create static instances of them.

E.g. registering a built-in `index_search` tool:

```ts
agentBuilderSetup.tools.register({
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
  setup(core: CoreSetup, { agentBuilder }: { agentBuilder: AgentBuilderPluginSetup }) {
    agentBuilder.agents.register(myAgentDefinition);
  }
}
```

### Adding the agent to the allow list

Similar to tools, we keep an hardcoded list of registered agents to trigger a code review from the team when
agents are added.

To add a tool to the allow list, simply add the tool's id to the `AGENT_BUILDER_BUILTIN_AGENTS` array,
in `x-pack/platform/packages/shared/agent-builder/agent-builder-server/allow_lists.ts`

(Kibana will fail to start otherwise, with an explicit error message explaining what to do)

### Making sure the agent's namespace is registered as being internal

Platform agents should all be namespaced under protected namespaces, to avoid id collisions with user-created agents.
When introducing a new protected namespace (e.g. when adding a new category of agents), it must be added
to the `protectedNamespaces` array in `x-pack/platform/packages/shared/agent-builder/agent-builder-common/base/namespaces.ts`

### Basic example

How registering a basic agent looks like:

```ts
agentBuilder.agents.register({
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
agentBuilder.agents.register({
  id: 'platform.core.dashboard',
  name: 'Dashboard agent',
  description: 'Agent specialized in dashboard related tasks',
  avatar_icon: 'dashboardApp',
  configuration: {
    research: {
      instructions:
        'You are a dashboard builder specialist assistant. Always uses the XXX tool when the user wants to YYY...',
    },
    answer: {
      instructions:
        'When answering, if a dashboard configuration is present in the results, always render it using [...]',
    },
    tools: [
      {
        tool_ids: [someListOfToolIds],
      },
    ],
  },
});
```

Refer to [`AgentConfiguration`](https://github.com/elastic/kibana/blob/main/x-pack/platform/packages/shared/agent-builder/agent-builder-common/agents/definition.ts)
for the full list of available configuration options.

## Registering attachment types

Attachments are used to provide additional context when conversing with an agent.

It is possible to register custom attachment types, to have control over how the data is exposed to the agent,
and how it is rendered in the UI.

### Server-side registration

You can register an attachment type by using the `attachments.registerType` API of the `agentBuilder` plugin's setup contract.

```ts
class MyPlugin {
  setup(core: CoreSetup, { agentBuilder }: { agentBuilder: AgentBuilderPluginSetup }) {
    agentBuilder.attachments.registerType(myAttachmentDefinition);
  }
}
```

Attachments are created in two ways; both use the same [`AttachmentTypeDefinition`](https://github.com/elastic/kibana/blob/main/x-pack/platform/packages/shared/agent-builder/agent-builder-server/attachments/type_definition.ts) (there is no separate `inline` / `reference` discriminator on the definition):

- **By-value:** the client sends `data`. The server runs `validate` and stores that payload. `origin` stays unset unless you later call `updateOrigin` (see below).
- **By-reference:** the client sends an **`origin` string** (for example a saved object ID). If the type implements the optional **`resolve`** hook, the framework calls it once at add time, persists the returned content as `data`, and records `origin` plus `origin_snapshot_at`. Optional **`isStale`** detects when the live source changed so the UI can offer a resync. See [By-reference attachments with `resolve`](#by-reference-attachments-with-resolve) and [Detecting stale attachments with `isStale`](#detecting-stale-attachments-with-isstale).

**Example of attachment type definition (by-value only, no `resolve`):**

```ts
const textDataSchema = z.object({
  content: z.string(),
});

const textAttachmentType: AttachmentTypeDefinition = {
  // unique id of the attachment type
  id: AttachmentType.text,
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
  format: (attachment) => {
    return { type: 'text', value: attachment.data.content };
  },
};
```

Refer to [`AttachmentTypeDefinition`](https://github.com/elastic/kibana/blob/main/x-pack/platform/packages/shared/agent-builder/agent-builder-server/attachments/type_definition.ts)
for the full list of available configuration options.

#### `getAgentDescription` — describing inline rendering to the agent

When your attachment type supports inline rendering, `getAgentDescription` should tell
the agent **what** it looks like when rendered inline. This description is injected into the
`ATTACHMENT TYPES` prompt block whenever an attachment of your type is present in the
conversation.

Keep the description focused on the **user-visible outcome** of rendering — not on when or why:

```ts
const myAttachmentType: AttachmentTypeDefinition = {
  id: 'image',
  validate: ...,
  format: ...,
  getAgentDescription: () =>
    'Represents an image attachment. Rendering this attachment inline displays the image inside the conversation UI.',
};
```

Do **not** include guidance on *when* to render inline — that is the responsibility of the
skill that owns the relevant task. See [Inline rendering guidance in skills](#inline-rendering-guidance-in-skills).

### Browser-side registration

Register a UI definition for your attachment type using the `attachments.addAttachmentType` API from the `agentBuilder` plugin's start contract:

```ts
class MyPlugin {
  start(core: CoreStart, { agentBuilder }: { agentBuilder: AgentBuilderPluginStart }) {
    agentBuilder.attachments.addAttachmentType('my_type', myAttachmentDefinition);
  }
}
```

#### Complete example

```ts
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCodeBlock } from '@elastic/eui';
import {
  ActionButtonType,
  type AttachmentUIDefinition,
} from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';

type MyAttachment = Attachment<'my_type'>;

export const myAttachmentDefinition: AttachmentUIDefinition<MyAttachment> = {
  getLabel: () => 'My attachment',
  getIcon: () => 'document',

  // Compact view rendered inline in the conversation
  renderInlineContent: ({ attachment, isSidebar }) => {
    if (isSidebar) {
      // For example: render a condensed view in the sidebar only
    }

    return (
      <EuiCodeBlock fontSize="s">{attachment.data.content}</EuiCodeBlock>
    );
  },

  // Expanded view rendered in the canvas flyout
  renderCanvasContent: ({ attachment }) => (
    <EuiCodeBlock fontSize="m" lineNumbers isCopyable>
      {attachment.data.content}
    </EuiCodeBlock>
  ),

  // Customize buttons based on viewport context
  getActionButtons: ({ attachment, isCanvas, isSidebar, openCanvas, setPreviewBadgeState, openSidebarConversation }) => {
    const buttons = [];

    if (isSidebar) {
      // add sidebar only buttons
    }

    if (isCanvas) {
      // add canvas only buttons
    }

    buttons.push({
      label: 'Copy',
      icon: 'copy',
      type: ActionButtonType.SECONDARY,
      handler: async () => navigator.clipboard.writeText(attachment.data.content),
    });

    // openCanvas is {undefined} when already in canvas mode
    if (openCanvas) {
      buttons.push({
        label: 'Open Canvas',
        icon: 'play',
        type: ActionButtonType.PRIMARY,
        handler: openCanvas,
      });
    }

    // openSidebarConversation is {undefined} when already in the sidebar
    if (openSidebarConversation) {
      buttons.push({
        label: 'Continue in sidebar',
        icon: 'discuss',
        type: ActionButtonType.SECONDARY,
        handler: openSidebarConversation,
      });
    }
    // Optional: if preview happens outside canvas, keep inline badge state in sync
    buttons.push({
      label: 'Preview',
      icon: 'eye',
      type: ActionButtonType.SECONDARY,
      handler: () => {
        setPreviewBadgeState?.('previewing');
      },
    });

    return buttons;
  },
};
```

#### Viewport

The `getActionButtons` params include flags to customize behavior per viewport:

- **`isSidebar`** - `true` when rendered in the sidebar (constrained width)
- **`isCanvas`** - `true` when rendered in the canvas flyout (expanded view)
- **`openCanvas`** - Callback to open canvas mode; `undefined` when already in canvas
- **`openSidebarConversation`** - Callback to open the agent builder sidebar with the current conversation loaded; `undefined` when already in the sidebar

#### Opening the sidebar from attachments

When an attachment is rendered inline in the full-screen Agent Builder experience, you can use `openSidebarConversation` to open the conversation in the sidebar on demand. This is useful when an action button navigates the user away from the full-screen experience (e.g., navigating to Discover or Dashboards). By calling `openSidebarConversation` after navigation, the user can continue the conversation in the sidebar while viewing the destination page.

```tsx
getActionButtons: ({ attachment, openSidebarConversation }) => {
  const buttons = [];

  buttons.push({
    label: 'Open in Discover',
    icon: 'discoverApp',
    type: ActionButtonType.PRIMARY,
    handler: async () => {
      // Navigate to Discover (this leaves the full-screen Agent Builder)
      await discoverLocator.navigate({ query: { esql: attachment.data.query } });
      // Open the sidebar so the conversation remains accessible
      openSidebarConversation?.();
    },
  });

  return buttons;
},
```

The callback handles setting the correct conversation context in localStorage before opening the sidebar, ensuring the sidebar loads the same conversation. It is `undefined` when already in the sidebar context.
- **`setPreviewBadgeState`** - Optional callback to control inline preview badge state when preview is driven outside the canvas

`setPreviewBadgeState` accepts:

- **`none`** - regular inline state
- **`preview_available`** - show "Preview Only" badge
- **`previewing`** - show "You're previewing this" badge and hide inline action buttons

#### Dynamic canvas buttons with registerActionButtons

For canvas content that needs to register buttons dynamically (e.g., a "Save" button that depends on runtime state like an API being available), use the `registerActionButtons` callback passed as the second argument to `renderCanvasContent`.

The `getActionButtons` function provides **static** buttons. The `registerActionButtons` callback allows canvas content to add **dynamic** buttons that are merged with the static ones.

The callbacks object also exposes `closeCanvas`, which allows canvas content to close the flyout from within attachment UI actions (for example after an "Edit in app" navigation).

```tsx
import React, { useEffect, useState } from 'react';
import {
  ActionButtonType,
  type ActionButton,
  type AttachmentRenderProps,
  type CanvasRenderCallbacks,
} from '@kbn/agent-builder-browser/attachments';

interface MyCanvasContentProps extends AttachmentRenderProps<MyAttachment> {
  callbacks: CanvasRenderCallbacks;
}

const MyCanvasContent: React.FC<MyCanvasContentProps> = ({
  attachment,
  callbacks: { registerActionButtons, updateOrigin, closeCanvas },
}) => {
  const [api, setApi] = useState<MyApi | undefined>();

  // Register buttons once the API is available
  useEffect(() => {
    if (!registerActionButtons || !api) {
      return;
    }

    registerActionButtons([
      {
        label: 'Save',
        icon: 'save',
        type: ActionButtonType.PRIMARY,
        handler: async () => {
          const savedObjectId = await api.save();
          // Link the attachment to the saved object
          await updateOrigin(savedObjectId);
        },
      },
    ]);
  }, [api, registerActionButtons, updateOrigin]);

  return (
    <MyEditor onApiReady={setApi} />
  );
};

// In the attachment definition:
export const myAttachmentDefinition: AttachmentUIDefinition<MyAttachment> = {
  // ...
  renderCanvasContent: (props, callbacks) => (
    <MyCanvasContent {...props} callbacks={callbacks} />
  ),
};
```

#### Closing the canvas from canvas content

Use `closeCanvas` when an action inside `renderCanvasContent` should dismiss the flyout.

```tsx
renderCanvasContent: (props, { closeCanvas }) => (
  <EuiButton
    onClick={async () => {
      await locator.navigate({ /* ... */ });
      closeCanvas();
    }}
  >
    Edit in app
  </EuiButton>
);
```

#### Linking by-value attachments to persistent storage with updateOrigin

The `updateOrigin` callback allows you to link a by-value attachment to its persistent storage location (e.g., a saved object) after it has been saved.

This callback is available in two places:
- **`getActionButtons` params** - for static action buttons defined at registration time
- **`renderCanvasContent` callbacks** - for dynamic buttons registered at runtime (see [Dynamic canvas buttons with registerActionButtons](#dynamic-canvas-buttons-with-registeractionbuttons) above)

**When to use `updateOrigin`:**

- When your attachment type supports a "Save" workflow where the user can persist a by-value attachment to external storage (e.g., saving a visualization to the library, saving a dashboard)
- After successfully saving the attachment to persistent storage, call `updateOrigin` to record the reference back to the attachment

**Why this matters:**

- Enables "Open in [App]" functionality by storing the saved object reference
- Allows the UI to show that an attachment is linked to a persistent resource
- Maintains the connection between the conversation attachment and its source

**Example: Save button that links to a saved object**

```tsx
getActionButtons: ({ attachment, updateOrigin, isCanvas }) => {
  const buttons = [];

  // Only show save button if not already linked to a saved object
  if (!attachment.origin && isCanvas) {
    buttons.push({
      label: 'Save to library',
      icon: 'save',
      type: ActionButtonType.PRIMARY,
      handler: async () => {
        // 1. Save to your persistent storage (e.g., saved objects)
        const savedObjectId = await myApi.saveToLibrary(attachment.data);

        // 2. Link the attachment to the saved object
        await updateOrigin(savedObjectId);
      },
    });
  }

  // Show "Open in App" if already linked (`origin` is a string, e.g. saved object id)
  if (attachment.origin) {
    buttons.push({
      label: 'Open in App',
      icon: 'popout',
      type: ActionButtonType.SECONDARY,
      handler: () => {
        window.open(`/app/myApp/${attachment.origin}`, '_blank');
      },
    });
  }

  return buttons;
},
```

**`origin` is a string:**

On the wire and in `Attachment`, **`origin` is always a string** (for example a saved object ID). The same string is passed to your type’s **`resolve`** hook when the attachment is added or resynced. `updateOrigin` and `updateAttachmentOrigin` also take that string — not an object.

#### Updating origin from outside attachment context

If you need to update an attachment's origin from outside the `getActionButtons` context (e.g., from a different plugin or component that has the conversation and attachment IDs), you can use the `updateAttachmentOrigin` API from the `agentBuilder` plugin's start contract:

```ts
// In your plugin
class MyPlugin {
  start(core: CoreStart, { agentBuilder }: { agentBuilder: AgentBuilderPluginStart }) {
    // Update an attachment's origin directly
    await agentBuilder.updateAttachmentOrigin(conversationId, attachmentId, savedObjectId);
  }
}
```

This is useful when the save operation happens outside the attachment's UI, such as when a separate "Save to library" workflow completes asynchronously. It is your responsibility to pass the `conversationId` and `attachmentId` to your plugin when navigating away from the chat - how you do this is up to you (e.g., URL parameters, local storage, or other mechanisms).

#### By-reference attachments with `resolve`

The optional `resolve` hook in `AttachmentTypeDefinition` enables **by-reference attachment creation**: instead of providing inline `data`, the caller provides an `origin` string (e.g. a saved object ID), and the framework calls `resolve` once at add time to fetch and store the content.

```ts
const myAttachmentType: AttachmentTypeDefinition<'my_type', MyContent> = {
  id: 'my_type',
  validate: (input) => { /* ... */ },
  format: (attachment) => { /* ... */ },

  /**
   * Called once when an attachment is added with an `origin`.
   * Returns the current content for that origin, or undefined if not found.
   */
  resolve: async (origin, context) => {
    const savedObject = await context.savedObjectsClient?.get('my_type', origin);
    if (!savedObject) return undefined;
    return { content: savedObject.attributes.content };
  },
};
```

- `origin` — the reference string passed by the caller (typically a saved object ID)
- `context.savedObjectsClient` — scoped to the current user; use it to fetch saved objects
- `context.request` / `context.spaceId` — available for other service lookups
- Return `undefined` if the origin cannot be resolved (the add operation will fail with an error)
- **Only called once** at add time; the resolved content is stored as `data` in the attachment version, and an `origin_snapshot_at` timestamp is recorded

Refer to [`AttachmentTypeDefinition`](https://github.com/elastic/kibana/blob/main/x-pack/platform/packages/shared/agent-builder/agent-builder-server/attachments/type_definition.ts) for the full type signature.

#### Detecting stale attachments with `isStale`

When an attachment is linked to a persistent origin (e.g. a dashboard saved object), the underlying data can change after the attachment was created. The optional `isStale` hook lets your attachment type detect this so the UI can prompt the user to refresh.

```ts
const myAttachmentType: AttachmentTypeDefinition<'my_type', MyContent> = {
  id: 'my_type',
  validate: (input) => { /* ... */ },
  format: (attachment) => { /* ... */ },
  resolve: async (origin, context) => { /* ... */ },

  /**
   * Called to check whether the stored attachment data is behind the current state
   * of the referenced origin. Return true if the attachment is stale.
   *
   * Only invoked for attachments that have a populated `origin`.
   * No automatic fallback — staleness detection is opt-in per type.
   */
  isStale: async (attachment, context) => {
    const savedObject = await context.savedObjectsClient?.get('my_type', attachment.origin);
    if (!savedObject) return false;
    // Compare the saved object's last-modified time against when the attachment was snapshotted
    return (
      Boolean(savedObject.updated_at) &&
      Boolean(attachment.origin_snapshot_at) &&
      new Date(savedObject.updated_at) > new Date(attachment.origin_snapshot_at)
    );
  },
};
```

- `attachment.origin_snapshot_at` — ISO timestamp of when `resolve` last ran; use it to compare against the origin's current version
- `context` — same `AttachmentResolveContext` as `resolve` (includes `savedObjectsClient`, `request`, `spaceId`)
- Return `true` if the stored data is outdated; the framework will call `resolve` again to fetch fresh content and surface a resync prompt in the UI
- Staleness checking is **only triggered for attachments with a populated `origin`**; inline-only types that never set `origin` will never have `isStale` called

**How the resync flow works end-to-end:**

1. User focuses the conversation input → the UI calls `GET /{conversationId}/attachments/stale`
2. The server calls `isStale` for each active attachment that has an `origin`
3. For stale attachments, `resolve` is called again to fetch fresh content
4. The UI shows a panel listing stale attachments, letting the user add the refreshed version or dismiss

Refer to [`AttachmentStaleCheckResult`](https://github.com/elastic/kibana/blob/main/x-pack/platform/packages/shared/agent-builder/agent-builder-common/attachments/stale_check.ts) for the result types returned by the stale check API.

#### Attachment lifecycle hook: onAttachmentMount

The `onAttachmentMount` lifecycle hook allows you to run side effects when an attachment is mounted to a conversation, and clean them up when the attachment is removed.

**When to use `onAttachmentMount`:**

- Setting up subscriptions that should live for the duration of the attachment's presence in the conversation
- Syncing attachment state with external systems
- Any side effect that needs cleanup when the attachment is removed

**Important:** This hook is called once per attachment (not per version). The framework tracks attachment presence at the conversation level, so you don't need to handle deduplication.

**Parameters:**

```ts
interface AttachmentLifecycleParams<TAttachment> {
  /** The attachment instance */
  attachment: TAttachment;
  /** The conversation ID containing this attachment */
  conversationId: string;
  /** Whether the attachment is rendered in the sidebar context */
  isSidebar: boolean;
}
```

**Example: Syncing attachment origin when a dashboard is saved**

```tsx
export const myAttachmentDefinition: AttachmentUIDefinition<MyAttachment> = {
  getLabel: () => 'My attachment',
  getIcon: () => 'document',

  onAttachmentMount: ({ attachment, conversationId }) => {
    // Set up a subscription when the attachment is added
    const subscription = someObservable$.subscribe((newValue) => {
      if (newValue !== attachment.origin) {
        // Update the attachment's origin using the plugin API
        agentBuilder.updateAttachmentOrigin(conversationId, attachment.id, newValue);
      }
    });

    // Return cleanup function - called when the attachment is removed from the conversation
    return () => {
      subscription.unsubscribe();
    };
  },

  // ... other definition properties
};
```

**Cleanup behavior:**

- The cleanup function is called when the attachment is removed from the conversation
- It's also called when the conversation component unmounts (e.g., navigating away)
- If `onAttachmentMount` returns `undefined` or `void`, no cleanup is performed

## Registering skills

**Note**: Skills are currently an experimental feature. You need to enable the `agentBuilder:experimentalFeatures` uiSetting to enable and use them.

Skills for Agent Builder are very close to the same concept is being used in Cursor or Claude for example.
They are markdown files the agent can access via the filestore, providing specific instructions to complete a task.
Skills can also expose tools when enabled, similar to how that works for attachments: when the agent reads the skill from the filestore,
the tools attached to it will be automatically enabled.

You can register a skill by using the `skills.register` API of the `agentBuilder` plugin's setup contract.

```ts
class MyPlugin {
  setup(core: CoreSetup, { agentBuilder }: { agentBuilder: AgentBuilderPluginSetup }) {
    agentBuilder.skills.register(mySkillDefinition);
  }
}
```

### Basic example

```ts
agentBuilder.skills.register({
  // unique identifier of the skill
  id: 'my-skill',
  // represents the name, which will be used as the filepath inside the skill directory
  name: 'my-skill',
  // the directory where the skill will be stored on the filesystem
  basePath: 'skills/platform',
  // short description of the skill, which will be exposed to the LLM for skill selection
  description: 'Just an example of skill',
  // full text content of the skill, which can be accessed via the filesystem
  content: 'full text content of the skill, in markdown format',
  // list of tools (from the tool registry) which will be enabled when the skill is read
  getRegistryTools: () => ['platform.core.generate_esql'],
  // list of inline tools which will be enabled when the skill is read
  getInlineTools: () => [myInlineToolDefinition],
});
```

### Defining new base paths for your skills

Base paths are enforced to a specific list of values using the `DirectoryPath` type.

To create new base paths to use for your skills, you need to add them to the [`SkillsDirectoryStructure`](x-pack/platform/packages/shared/agent-builder/agent-builder-server/skills/type_definition.ts)

### Defining sub-content for the skill

You can define sub-content for the skill, using the `referencedContent` property of the skill definition.
Those files will be exposed on the filesystem in the skill's directory, in the specified subfolder.

```ts
agentBuilder.skills.register({
  id: 'bake-me-something',
  name: 'bake-me-something',
  basePath: 'skills/platform',
  description: 'Pick and bake a tasty dessert',
  content: `
  1. select a recipe from the available list of recipes. Recipes can be found in the [recipes folder](./recipes).
  2. follow the instructions in the recipe to bake the dessert.
  3. enjoy your dessert!`,
  referencedContent: [
    { name: 'pie-recipe', relativePath: './recipes', content: '[some pie recipe]' },
    { name: 'brownie-recipe', relativePath: './recipes', content: '[some brownie recipe]' },
  ],
});
```

### Inline rendering guidance in skills

Whether and when the agent should render an attachment inline depends on the task it is
performing. Skills that create or modify attachments should therefore include explicit
guidance on this in their instructions.

**Rule of thumb:** tell the agent exactly which attachment to render and at what point in
the task.

**Examples:**

- A skill that creates a single visualization:
  > "Once you have created the visualization, render it inline so the user can see it."

- A skill that builds a dashboard (composed of multiple visualizations):
  > "Render the dashboard attachment inline once you have finished building it. Do NOT
  >  render each individual visualization inline — only the final dashboard."

This per-skill guidance is what controls inline rendering behaviour across different tasks:
the attachment type definition (via `getAgentDescription`) tells the agent *what* rendering
does; the skill tells it *when* to do it.

### Marking a skill as experimental

Individual built-in skills can be flagged as experimental by setting `experimental: true` on their definition. 
Experimental skills are only visible and usable when the `agentBuilder:experimentalFeatures` uiSetting is enabled.

**Example:**

```ts
agentBuilder.skills.register({
  id: 'my-experimental-skill',
  name: 'my-experimental-skill',
  basePath: 'skills/platform',
  description: 'An experimental skill only visible when experimental features are on',
  experimental: true,
  content: 'Skill instructions...',
});
```

## Semantic Metadata Layer (SML) — Developer Guide

### 1. What is SML?

The **Semantic Metadata Layer** is an indexing and search subsystem inside
Agent Builder. It allows solutions to expose their Kibana assets
(visualizations, dashboards, saved searches, …) so the AI agent can find and
attach them to a conversation.

#### High-level architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Solution plugin (e.g. agent_builder_platform)               │
│  ┌────────────────────────────┐                              │
│  │  SmlTypeDefinition         │ ← you provide this           │
│  │  • id                      │                              │
│  │  • list()                  │                              │
│  │  • getSmlData()            │                              │
│  │  • toAttachment()          │                              │
│  └────────────────────────────┘                              │
└──────────────────────────────────────────────────────────────┘
                          │
                          │ agentBuilder.sml.registerType(...)
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  agent_builder plugin (server)                               │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │ Type Registry │───▶│   Crawler    │───▶│  ES Indices   │  │
│  └──────────────┘    │ (Task Mgr)   │    │ .chat-sml-*   │  │
│                      └──────────────┘    └───────────────┘  │
│                                                 │            │
│                                                 ▼            │
│  ┌──────────────┐    ┌──────────────────────────────────┐   │
│  │  sml_search  │◀───│  SmlService.search()              │   │
│  │  sml_attach  │    │  (space + permission filtering)   │   │
│  └──────────────┘    └──────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

#### Key concepts

| Concept | Description |
|---|---|
| **SML Type** | A category of content you expose (e.g. `visualization`, `dashboard`). You implement `SmlTypeDefinition`. |
| **Crawler** | A Task Manager background task that periodically calls your `list()` and `getSmlData()` hooks, indexing content into system indices. Uses mark-and-sweep with `last_crawled_at` timestamps for efficient change detection. |
| **SML Document** | A single indexed chunk stored in the `.chat-sml-data` system index, containing title, content, permissions, and space information. |
| **`sml_search` tool** | A built-in Agent Builder tool the AI uses to keyword-search SML documents. Results are filtered by the requesting user's space and permissions. |
| **`sml_attach` tool** | A built-in Agent Builder tool the AI uses to convert SML search hits into conversation attachments. It accepts `chunk_ids` from `sml_search`;  `chunk_id` format is `attachment_type:origin_id:uuid`. |
| **Origin ID** | The unique identifier for the source asset (typically a saved object ID). Used to link SML documents back to their source. |

#### Data flow

1. **Crawl**: The crawler runs on a configurable interval (default 10 min).
   For each registered SML type it calls `list()` to enumerate items, detects
   changes via timestamps, and calls `getSmlData()` for new/updated items.
2. **Index**: Results are written to the `.chat-sml-data` system index.
   Crawler state (which items have been seen) is stored in a separate
   `.chat-sml-crawler-state` index.
3. **Search**: When the AI agent calls `sml_search`, the SML service queries
   the data index, filtering by the user's current space and checking Kibana
   privileges against each result's `permissions` array.
4. **Attach**: When the AI agent calls `sml_attach` with `chunk_ids`, the service loads each chunk, resolves the saved object via your `toAttachment()` hook, and adds the result as a conversation attachment (with `origin` when applicable).

#### Security model

- The crawler runs with **internal credentials** (`asInternalUser`) — it indexes
  content from all spaces.
- Access control is enforced at **query time**: results are filtered by space
  and by Kibana feature privileges (the `permissions` array you set in
  `getSmlData`).

---

### 2. How to add a new SML type

#### Step 1: Implement `SmlTypeDefinition`

Create a file in your plugin (e.g.
`server/sml_types/my_asset.ts`). You need to implement four things:

```typescript
import type { SmlTypeDefinition } from '@kbn/agent-builder-plugin/server';

export const myAssetSmlType: SmlTypeDefinition = {
  // Unique identifier — lowercase, alphanumeric, hyphens, underscores.
  // Must match /^[a-z][a-z0-9_-]*$/
  id: 'my-asset',

  // Optional: how often the crawler re-indexes this type.
  // Defaults to '10m' if omitted.
  fetchFrequency: () => '30m',

  // Yield pages of items to consider for indexing.
  // Called by the crawler with internal credentials.
  async *list(context) {
    // Use createPointInTimeFinder for efficient pagination
    const finder = context.savedObjectsClient.createPointInTimeFinder({
      type: 'my-saved-object-type',
      perPage: 1000,
      namespaces: ['*'],  // all spaces
      fields: ['title'],  // only fetch fields needed for the list
    });

    try {
      for await (const response of finder.find()) {
        yield response.saved_objects.map((so) => ({
          id: so.id,
          updatedAt: so.updated_at ?? new Date().toISOString(),
          spaces: so.namespaces ?? [],
        }));
      }
    } finally {
      await finder.close();
    }
  },

  // Fetch the full data for a single item to index.
  // Return undefined to skip the item (e.g. if it was deleted).
  getSmlData: async (originId, context) => {
    try {
      const so = await context.savedObjectsClient.get('my-saved-object-type', originId);
      const attrs = so.attributes as { title?: string; description?: string };

      return {
        chunks: [
          {
            type: 'my-asset',
            title: attrs.title ?? originId,
            content: [attrs.title, attrs.description].filter(Boolean).join('\n'),
            // Kibana feature privileges required to access this item.
            // Users without these privileges won't see the item in search results.
            permissions: ['saved_object:my-saved-object-type/get'],
          },
        ],
      };
    } catch {
      return undefined;
    }
  },

  // Convert an SML document back into a conversation attachment.
  // Called when the AI agent wants to "attach" a search result.
  toAttachment: async (item, context) => {
    const resolveResult = await context.savedObjectsClient.resolve(
      'my-saved-object-type',
      item.origin_id
    );
    if ((resolveResult.saved_object as { error?: unknown }).error) {
      return undefined;
    }

    return {
      type: 'my-asset',
      data: {
        title: resolveResult.saved_object.attributes.title,
        // ... whatever data the attachment renderer needs
      },
    };
  },
};
```

#### Step 2: Register the type during plugin setup

In your plugin's `setup` method:

```typescript
import { myAssetSmlType } from './sml_types/my_asset';

export class MyPlugin implements Plugin {
  setup(core: CoreSetup, { agentBuilder }: { agentBuilder: AgentBuilderPluginSetup }) {
    agentBuilder.sml.registerType(myAssetSmlType);
  }
}
```

That's it. The Agent Builder crawler will automatically pick up your type and
start indexing on the configured interval.

#### Key implementation notes

##### `list()` — Use `AsyncIterable` for memory safety

The `list` hook must return an `AsyncIterable<SmlListItem[]>`. Each yielded
array is one "page" of items. The crawler processes pages with O(page_size)
memory, so even types with millions of items won't cause OOM.

Use `createPointInTimeFinder` with `namespaces: ['*']` to enumerate across
all spaces. The crawler indexes everything; access control happens at query time.

##### `getSmlData()` — Chunks and permissions

You can return multiple chunks per item (e.g. if a dashboard has multiple
panels). Each chunk gets its own document in the SML index.

The `permissions` array should list the Kibana saved object privileges
required to access the underlying asset. Common patterns:

- `['saved_object:lens/get']` for Lens visualizations
- `['saved_object:dashboard/get']` for dashboards
- `['saved_object:search/get']` for saved searches

Users without the listed privileges won't see the item in `sml_search` results.

##### `toAttachment()` — Resolving saved objects

Use `savedObjectsClient.resolve()` instead of `get()` when possible — it
handles saved object aliasing (e.g. after a space migration).

Return `undefined` if the item can no longer be resolved. The `sml_attach`
tool will report a per-item error to the AI agent without failing the entire
call.

##### `fetchFrequency` — Choose an appropriate interval

- High-churn data (alerts, logs): `5m`–`10m`
- Medium-churn (visualizations, dashboards): `30m`–`1h`
- Low-churn (index patterns, static config): `1h`–`4h`

The default is `10m` if you don't specify `fetchFrequency`.

#### Real-world example: Visualizations

The visualization SML type is registered in
`x-pack/platform/plugins/shared/agent_builder_platform/server/sml_types/visualization.ts`.

It:
- Lists all `lens` saved objects across all spaces
- Extracts title, description, chart type, and ES|QL query as searchable content
- Sets `permissions: ['saved_object:lens/get']`
- Converts results back to Lens API format for the attachment renderer
- Uses a 1-hour crawl interval

```typescript
// Registration (in agent_builder_platform plugin setup):
setupDeps.agentBuilder.sml.registerType(visualizationSmlType);
```

The full implementation is ~130 lines and serves as the reference for new types.

