# @kbn/agent-builder-browser

Browser-side types and utilities for the agentBuilder framework.

## Registering a custom conversation event type

Custom event types must be registered on **both** sides — the server controls persistence and
validation; the browser controls rendering.

### Server side (`plugin.ts` → `setup`)

```ts
// In your plugin's setup():
setupDeps.agentBuilder.conversationEvents.register({
  type: 'my_plugin.note',
  payloadSchema: z.object({ title: z.string().optional(), text: z.string() }),
});
```

### Browser side (`plugin.ts` → `start`)

Split the renderer component into its own file so it is loaded lazily — only when an event of
this type first appears in the timeline, not at plugin startup.

**`my_note_renderer.tsx`** — the async chunk:
```tsx
import React from 'react';

// All heavy imports (EUI components, charting libraries, etc.) go here.
const MyNoteRenderer: React.FC<{ data: { title?: string; text: string } }> = ({ data }) => (
  <div>
    {data.title && <strong>{data.title}</strong>}
    <p>{data.text}</p>
  </div>
);

export default MyNoteRenderer; // default export required for React.lazy()
```

**`my_note_definition.ts`** — the definition, imported during `start()`:
```tsx
import React, { Suspense, lazy } from 'react';
import { EuiSkeletonText } from '@elastic/eui';
import { z } from '@kbn/zod/v4';
import type { ConversationEventUIDefinition } from '@kbn/agent-builder-browser';

// Fetched on first render, not at plugin start.
const MyNoteRenderer = lazy(() => import('./my_note_renderer'));

export const myNoteDefinition: ConversationEventUIDefinition = {
  type: 'my_plugin.note',
  payloadSchema: z.object({ title: z.string().optional(), text: z.string() }),
  render: (event) => (
    <Suspense fallback={<EuiSkeletonText lines={2} />}>
      <MyNoteRenderer data={event.data} />
    </Suspense>
  ),
  getHeader: (event) => ({ icon: 'editorComment', label: 'Note' }),
};
```

**`plugin.ts`** — registration:
```ts
// In your plugin's start():
startDeps.agentBuilder.conversationEvents.register(myNoteDefinition);
```

### Notes

- **Registration must happen during `start()`.** The conversation timeline mounts after all
  `start()` hooks have run; a type registered after that will not be visible until the page
  reloads.
- **Type names are validated** against the same rules as the server registry:
  - Must not contain `::` (the internal id-generation delimiter).
  - Must not be one of the reserved words (`execution`, `step`).
  - Must not shadow a built-in timeline event type (`user_message`, `agent_message`, etc.).
- **Payload schema is validated at render time** with `safeParse`. A malformed payload shows a
  `RenderError` callout instead of mounting the renderer, so a bad event cannot crash the chat.
- **`getHeader` is optional.** Omit them for events that don't need header rendered.
- **The `conversationEvents` key on the start contract** is the stored-event type registry.
