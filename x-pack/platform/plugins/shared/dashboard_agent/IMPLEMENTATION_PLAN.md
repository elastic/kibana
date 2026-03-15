# Dashboard Agent - Implementation Plan

This document outlines the features implemented for dashboard attachment handling, including bidirectional sync between the agent and dashboard, canvas management, and sidebar integration.

## Overview

The implementation enables:
1. **Canvas close callback** - Close the canvas flyout when navigating away in sidebar mode
2. **Open sidebar after navigation** - Open the agent sidebar when navigating to Dashboard app from non-sidebar (full-screen) mode
3. **Conversation continuity** - Pass conversation ID to maintain the same conversation when opening sidebar

---

## 1. Canvas Close Callback (`closeCanvas`)

### Purpose
Allow canvas content renderers to programmatically close the canvas flyout (e.g., after navigating to another app).

### Changes

#### `agent-builder-browser/attachments/contract.ts`
Added `closeCanvas` to `CanvasRenderCallbacks`:

```typescript
export interface CanvasRenderCallbacks {
  registerActionButtons: (buttons: ActionButton[]) => void;
  updateOrigin: (origin: unknown) => Promise<UpdateOriginResponse | undefined>;
  closeCanvas: () => void;  // NEW
  conversationId: string | undefined;  // NEW (see section 3)
}
```

#### `agent_builder/.../canvas_flyout.tsx`
Pass `closeCanvas` from `useCanvasContext` to callbacks:

```typescript
const { canvasState, closeCanvas, setCanvasAttachmentOrigin } = useCanvasContext();
// ...
{uiDefinition.renderCanvasContent(
  { attachment, isSidebar },
  { registerActionButtons, updateOrigin, closeCanvas, conversationId }
)}
```

#### `dashboard_agent/public/attachment_types/index.tsx`
Pass `closeCanvas` to `DashboardCanvasContent`:

```typescript
renderCanvasContent: (props, callbacks) => {
  return (
    <DashboardCanvasContent
      {...props}
      closeCanvas={callbacks.closeCanvas}
      // ... other props
    />
  );
}
```

#### `dashboard_agent/public/attachment_types/dashboard_canvas_content.tsx`
Accept and forward `closeCanvas`:

```typescript
export const DashboardCanvasContent = ({
  closeCanvas,
  // ... other props
}: {
  closeCanvas: () => void;
  // ... other types
}) => {
  useRegisterActionButtons({
    closeCanvas,
    // ... other params
  });
}
```

#### `dashboard_agent/public/attachment_types/use_register_action_buttons.ts`
Use `closeCanvas` in the "Edit in Dashboards" button handler:

```typescript
handler: async () => {
  await locator.navigate({ ... });
  if (isSidebar) {
    closeCanvas();  // Close canvas when in sidebar mode
  } else {
    openChat({ conversationId: conversationIdRef.current });
  }
}
```

---

## 2. Open Sidebar After Navigation (`openChat`)

### Purpose
When in full-screen (non-sidebar) canvas mode, after navigating to Dashboard app, automatically open the agent sidebar to maintain context.

### Changes

#### `dashboard_agent/public/attachment_types/index.tsx`
Destructure `openChat` from `agentBuilder` and pass to component:

```typescript
export const registerDashboardAttachmentUiDefinition = ({
  agentBuilder: {
    events: { chat$ },
    attachments,
    addAttachment,
    openChat,  // NEW
  },
}: { ... }) => {
  // ...
  renderCanvasContent: (props, callbacks) => {
    return (
      <DashboardCanvasContent
        openChat={openChat}  // NEW
        // ... other props
      />
    );
  }
}
```

#### `dashboard_agent/public/attachment_types/dashboard_canvas_content.tsx`
Accept and forward `openChat`:

```typescript
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';

export const DashboardCanvasContent = ({
  openChat,
  // ... other props
}: {
  openChat: AgentBuilderPluginStart['openChat'];
  // ... other types
}) => {
  useRegisterActionButtons({
    openChat,
    // ... other params
  });
}
```

#### `dashboard_agent/public/attachment_types/use_register_action_buttons.ts`
Import type and use in handler:

```typescript
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';

interface UseRegisterActionButtonsParams {
  openChat: AgentBuilderPluginStart['openChat'];
  isSidebar: boolean;
  // ... other params
}

// In handler:
if (isSidebar) {
  closeCanvas();
} else {
  openChat({ conversationId: conversationIdRef.current });
}
```

---

## 3. Conversation ID Support

### Purpose
Enable opening the sidebar with a specific conversation to maintain continuity when transitioning from canvas to sidebar mode.

### Changes

#### `agent_builder/public/embeddable/types.ts`
Add `conversationId` to `EmbeddableConversationProps`:

```typescript
export interface EmbeddableConversationProps {
  newConversation?: boolean;
  conversationId?: string;  // NEW - specific conversation ID to open
  sessionTag?: string;
  agentId?: string;
  // ... other props
}
```

#### `agent_builder/.../embeddable_conversations_provider.tsx`
Handle `conversationId` in initialization:

```typescript
useEffect(() => {
  if (hasInitializedConversationIdRef.current) return;

  if (contextProps.conversationId) {
    // NEW: If conversationId is explicitly provided, use it directly
    validateAndSetConversationId(contextProps.conversationId);
  } else if (contextProps.newConversation) {
    setConversationId(undefined);
  } else if (persistedConversationId) {
    validateAndSetConversationId(persistedConversationId);
  } else {
    setConversationId(undefined);
  }
  hasInitializedConversationIdRef.current = true;
}, [
  contextProps.conversationId,  // NEW dependency
  contextProps.newConversation,
  persistedConversationId,
  setConversationId,
  validateAndSetConversationId,
]);
```

#### `agent-builder-browser/attachments/contract.ts`
Add `conversationId` to `CanvasRenderCallbacks`:

```typescript
export interface CanvasRenderCallbacks {
  registerActionButtons: (buttons: ActionButton[]) => void;
  updateOrigin: (origin: unknown) => Promise<UpdateOriginResponse | undefined>;
  closeCanvas: () => void;
  conversationId: string | undefined;  // NEW
}
```

#### `agent_builder/.../canvas_flyout.tsx`
Pass `conversationId` to callbacks:

```typescript
const conversationId = useConversationId();
// ...
{uiDefinition.renderCanvasContent(
  { attachment, isSidebar },
  { registerActionButtons, updateOrigin, closeCanvas, conversationId }
)}
```

#### `dashboard_agent/public/attachment_types/index.tsx`
Pass `conversationId` to component:

```typescript
<DashboardCanvasContent
  conversationId={callbacks.conversationId}
  // ... other props
/>
```

#### `dashboard_agent/public/attachment_types/dashboard_canvas_content.tsx`
Accept and forward:

```typescript
export const DashboardCanvasContent = ({
  conversationId,
  // ... other props
}: {
  conversationId: string | undefined;
  // ... other types
}) => {
  useRegisterActionButtons({
    conversationId,
    // ... other params
  });
}
```

#### `dashboard_agent/public/attachment_types/use_register_action_buttons.ts`
Use ref pattern for stable reference and pass to `openChat`:

```typescript
interface UseRegisterActionButtonsParams {
  conversationId: string | undefined;
  // ... other params
}

export const useRegisterActionButtons = ({
  conversationId,
  // ... other params
}) => {
  const conversationIdRef = useLatest(conversationId);

  // In handler:
  openChat({ conversationId: conversationIdRef.current });
}
```

---

## File Summary

### Modified Files

| File | Changes |
|------|---------|
| `agent-builder-browser/attachments/contract.ts` | Added `closeCanvas` and `conversationId` to `CanvasRenderCallbacks` |
| `agent_builder/public/embeddable/types.ts` | Added `conversationId` to `EmbeddableConversationProps` |
| `agent_builder/.../embeddable_conversations_provider.tsx` | Handle explicit `conversationId` in initialization |
| `agent_builder/.../canvas_flyout.tsx` | Pass `closeCanvas` and `conversationId` to callbacks |
| `dashboard_agent/public/attachment_types/index.tsx` | Destructure `openChat`, pass all new props |
| `dashboard_agent/public/attachment_types/dashboard_canvas_content.tsx` | Accept and forward new props |
| `dashboard_agent/public/attachment_types/use_register_action_buttons.ts` | Implement sidebar/canvas behavior logic |

---

## User Flow

### Sidebar Mode (isSidebar = true)
1. User clicks "Edit in Dashboards" button
2. Navigates to Dashboard app with current state
3. Canvas flyout closes automatically

### Full-Screen Mode (isSidebar = false)
1. User clicks "Edit in Dashboards" button
2. Navigates to Dashboard app with current state
3. Agent sidebar opens automatically with the same conversation

---

## Dependencies

- `@kbn/agent-builder-plugin/public` - For `AgentBuilderPluginStart` type
- `@kbn/agent-builder-browser/attachments` - For `CanvasRenderCallbacks` interface
- `react-use/lib/useLatest` - For stable refs in callbacks
