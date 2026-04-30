# 022: Move Attachment Type Registry to agent_context_layer (Resolver Registry)

**Status**: Planning
**Depends on**: 018 (Extract SML into agent_context_layer — must be merged first)

## Problem

The attachment type system (`AttachmentTypeDefinition`, registry, contexts) lives inside `@kbn/agent-builder-server` and the `agent_builder` plugin. Every plugin that wants to register an attachment type must depend on `agentBuilder`. The type definition interface also has direct dependencies on agent_builder's tool system (`AttachmentBoundedTool`) and agent_builder's common types (`Attachment`, `VersionedAttachmentWithOrigin`), making it impossible to use outside the agent_builder ecosystem.

## Goals

1. Move `AttachmentTypeDefinition` and its registry to `agent_context_layer`, renaming to `ResolverTypeDefinition`
2. Make the resolver registry contract **generic** — core types (including **`ResolverBoundedTool`**) live in **`@kbn/agent-context-layer-common`** with **no** imports from agent_builder packages; AB-only types (`ToolHandlerContext`, etc.) stay in **`@kbn/agent-builder-server`** for adapter/runner code only (see **`getBoundedTools` and bounded-tool types**)
3. Downstream plugins register via `agentContextLayer.registerResolverType(...)` instead of `agentBuilder.attachments.registerType(...)`
4. agent_builder maps between the generic resolver types and its internal attachment types

## Key Design Changes

### Decouple from agent_builder types

The current `AttachmentTypeDefinition` has these agent_builder dependencies:

| Member | Current type | Problem | New generic type |
|--------|-------------|---------|-----------------|
| `format` param | `Attachment<TType, TContent>` (from `@kbn/agent-builder-common`) | Couples to AB's attachment model | `{ id: string; type: string; data: unknown }` |
| `format` return | `AgentFormattedAttachment` with `getBoundedTools(): AttachmentBoundedTool[]` | Couples format to tools; couples to AB tool types | **`ResolverFormattedContent` only** — representation only. **Bounded tools** live on **`ResolverTypeDefinition.getBoundedTools`** (see Bounded tools section). |
| `isStale` param | `VersionedAttachmentWithOrigin<TType, TContent>` (from `@kbn/agent-builder-common`) | Couples to AB's versioning model and invites implementors to call `getLatestVersion` inside the hook | **`ResolverStaleCheckItem`** — explicit snapshot for the **current / latest** version only (no `VersionedAttachment`, no `versions[]`). AB's adapter extracts `getLatestVersion(attachment)` (plus `origin`, `origin_snapshot_at`, etc.) and passes that into the resolver. Resolver `isStale` must not assume it can walk version history. |
| `validate` return | OK — already generic (`{ valid: true; data } | { valid: false; error }`) | No problem | Keep as-is |
| `resolve` | OK — already generic (`(origin: string, context) => content`) | No problem | Keep as-is |

### Bounded tools: `format` vs tools; **type + origin** as canonical ref

**Today:** `format()` returns `AgentFormattedAttachment`, which may include **`getBoundedTools()`** closing over that attachment's `data` / `id`, so two instances of the same type can expose different bounded tools (`select_tools.ts` / `prepare_conversation.ts`).

**After this plan:**

1. **`format` only formats** — returns `ResolverFormattedContent` (`getRepresentation` only). No tools on the format result.

2. **Bounded tools on the resolver type** — optional **`getBoundedTools`** lives on **`ResolverTypeDefinition`**, not on the format return value. It receives a **single instance snapshot** so implementations stay deterministic and testable without reading conversation storage.

3. **No conversation id required for addressing** — For any resolver/attachment type that implements **`resolve(origin, context)`**, the pair **`(type, origin)`** is sufficient to identify the referent **within the current request scope** (authenticated user + space + `savedObjectsClient` / other context). Callers **do not** need a `conversation_id` (or stored chat attachment row) to:
   - call `resolve(origin)` → obtain current `data`;
   - call `getBoundedTools({ type, origin, data, instanceId }, context)` → list instance-scoped tools;
   - execute a bounded tool for that same snapshot.

   **Canonical string form (optional, for APIs / logging):** e.g. `{type}://{percent-encoded-origin}` — meaning is defined by the type's `resolve`; the URI does not replace **`ResolverContext`** (auth, space, SO client).

4. **`instanceId` for stable tool names** — Bounded tool IDs often embed a per-attachment id. When there is no conversation attachment id, use a **stable synthetic** id derived from **`(type, origin)`** (and keep it consistent between list and execute). When agent_builder has a real conversation attachment id, the adapter may pass that as `instanceId` instead for parity with today's logs / tool ids.

   **Important:** Tool implementations that currently use a fixed ID (e.g. `GET_ALERT_DETAILS_TOOL_ID = 'get_alert_details'`) should embed `instanceId` in the tool ID after migration (e.g. `get_alert_details_${instanceId}`) to avoid collision when multiple attachments of the same type are active in a conversation.

5. **Types without `resolve`** — Inline-only attachments (no `origin`) still need **`data`** (and optionally a client-supplied `instanceId`) in the snapshot for `getBoundedTools`; conversation storage is one way to persist `data`, but not part of the **addressing** contract for reference-backed types.

6. **Type-level `getTools()`** — Unchanged: when any attachment of this type is present, these **global** tool IDs are registered in AB's tool registry. These are AB tool registry IDs and are meaningful only to agent_builder — documented as such in JSDoc. **`getBoundedTools`** remains for **instance-scoped** tools (schemas/handlers tied to this origin's resolved `data`).

### `getBoundedTools` and bounded-tool types: `ResolverBoundedTool` (common) vs `AttachmentBoundedTool` (Agent Builder)

**`getBoundedTools` (on `ResolverTypeDefinition`):**

- Optional hook: given a **single instance** snapshot (`ResolverBoundedToolItemSnapshot` — `type`, optional `origin`, `data`, `instanceId`) and `ResolverFormatContext` (request + space), returns the list of **instance-scoped** tools the model may call for that attachment.
- Callers (`prepare_conversation`, `select_tools`, and future HTTP/MCP harnesses) use **`definition.getBoundedTools?.(snapshot, context)`** — not anything on the `format` return value.
- Tool ids returned from resolver code should **embed `instanceId`** when multiple instances of the same type can appear in one conversation (see Bounded tools section above).

**Move + rename (dependency direction):**

- **Today (intermediate / leaky):** The agent_context_layer may type `getBoundedTools` results using **`AttachmentBoundedTool`** from `@kbn/agent-builder-server/attachments/tools`, or alias it as `ResolverBoundedToolDefinition`. That makes **agent_context_layer → agent_builder** for types, which is the wrong direction for a platform registry.
- **Target:** Introduce **`ResolverBoundedTool`** in **`@kbn/agent-context-layer-common`** next to `ResolverTypeDefinition`, `ResolverFormatContext`, and `ResolverBoundedToolItemSnapshot`.
  - It should be the **minimal** contract for tools **authored by resolver plugins**: e.g. `id`, `description`, `schema` (Zod object), and `run(input, context: ResolverFormatContext) => MaybePromise<unknown>` — **no** `ToolHandlerContext` / `ToolHandlerReturn` / other AB-only types in the common package.
- **`ResolverTypeDefinition`** should use **`TBoundedTool = ResolverBoundedTool`** (or a generic default bound to `ResolverBoundedTool`) for the return type of **`getBoundedTools`**.
- **Keep `AttachmentBoundedTool`** in **`@kbn/agent-builder-server`** as the **execution-layer union** (builtin, ES|QL, index search, workflow, etc.) that the runner and tool registry actually dispatch.
- **Adapter in agent_builder:** Map **`ResolverBoundedTool` → `BuiltinAttachmentBoundedTool`** (or the narrow member of the union that matches) for the common case; types that need non-builtin bounded tools stay an explicit, AB-coupled extension and are not required to flow through the common `ResolverBoundedTool` shape.

**Doc / code-name cleanup:** Prefer the single name **`ResolverBoundedTool`** in the common package; retire **`ResolverBoundedToolDefinition`** as a separate concept once the type lives in common (or keep the latter as a deprecated type alias only during migration).

### Format return: generic representation

Current:
```typescript
format: (...) => AgentFormattedAttachment  // has getRepresentation(), getBoundedTools()
```

New:
```typescript
format: (...) => ResolverFormattedContent  // getRepresentation() only
```

**Bounded tools:** implemented as **`ResolverTypeDefinition.getBoundedTools`**. Resolver-authored tools use **`ResolverBoundedTool`** in common: `run(input, ResolverFormatContext)`. Agent_builder's adapter maps **`ResolverBoundedTool` → `AttachmentBoundedTool`** (typically **`BuiltinAttachmentBoundedTool`**) and bridges **`ResolverFormatContext` → `ToolHandlerContext`** where handlers still expect AB's tool runtime types (data comes from `snapshot.data` instead of `attachment.data`).

## New Types in agent_context_layer

```typescript
// Canonical home: @kbn/agent-context-layer-common (e.g. resolver_types.ts).
// agent_context_layer/server/services/resolver/types.ts re-exports and may alias AttachmentBoundedTool → ResolverBoundedTool during migration only.

import type { MaybePromise } from '@kbn/utility-types';
import type { ZodObject } from '@kbn/zod/v4';
// KibanaRequest, SavedObjectsClientContract as today

export type ResolverValidationResult<TValidatedData = unknown> =
  | { valid: true; data: TValidatedData }
  | { valid: false; error: string };

export interface ResolverFormatContext {
  request: KibanaRequest;
  spaceId: string;
}

export interface ResolverResolveContext extends ResolverFormatContext {
  savedObjectsClient?: SavedObjectsClientContract;
}

export interface ResolverFormattedContent {
  getRepresentation?: () => MaybePromise<{ type: 'text'; value: string }>;
}

/**
 * Single attachment instance as seen by bounded tools — **no conversation_id**.
 * **By-reference:** set `origin`; `data` should match `resolve(origin)` (or AB's latest stored snapshot).
 * **Inline-only:** omit `origin`; pass `data` and a stable `instanceId` (e.g. attachment id).
 * `hidden` is an AB/UI concern and is intentionally absent here.
 */
export interface ResolverBoundedToolItemSnapshot<TContent = unknown> {
  type: string;
  origin?: string;
  data: TContent;
  /** Stable id for tool names / logs — real attachment id or synthetic from (type, origin). */
  instanceId: string;
}

/**
 * Snapshot passed to isStale — no VersionedAttachment / versions[].
 * AB adapter fills `data` from getLatestVersion(attachment) (must match current_version).
 * Include origin_snapshot_at when the resolver needs timestamp checks (e.g. dashboard).
 */
export interface ResolverStaleCheckItem<TContent = unknown> {
  id: string;
  type: string;
  origin: string;
  data: TContent;
  origin_snapshot_at?: string;
}

/** Minimal instance-scoped tool for resolver plugins — no Agent Builder imports. */
export interface ResolverBoundedTool {
  id: string;
  description: string;
  schema: ZodObject<any>;
  run: (input: unknown, context: ResolverFormatContext) => MaybePromise<unknown>;
}

export interface ResolverTypeDefinition<
  TType extends string = string,
  TContent = unknown,
  TBoundedTool extends ResolverBoundedTool = ResolverBoundedTool
> {
  id: TType;
  validate: (input: unknown) => MaybePromise<ResolverValidationResult<TContent>>;
  format: (
    item: { id: string; type: string; data: TContent },
    context: ResolverFormatContext
  ) => MaybePromise<ResolverFormattedContent>;
  resolve?: (
    origin: string,
    context: ResolverResolveContext
  ) => MaybePromise<TContent | undefined>;
  isStale?: (
    item: ResolverStaleCheckItem<TContent>,
    context: ResolverResolveContext
  ) => MaybePromise<boolean>;
  /**
   * Returns tool IDs from the agent_builder tool registry to expose when attachments of this type
   * are active. These IDs are meaningful only within agent_builder's tool registry.
   */
  getTools?: () => string[];
  /**
   * Instance-scoped tools for this resolver type. Not on `format` return value.
   * Snapshot: **by-ref** → `type` + `origin` (+ `data` from `resolve`) + `instanceId`; **inline** →
   * `type` + `data` + `instanceId`, `origin` omitted. **Never requires `conversation_id`.**
   *
   * Tool IDs returned should embed `instanceId` to avoid collision when multiple attachments of the
   * same type are present in a conversation.
   */
  getBoundedTools?: (
    item: ResolverBoundedToolItemSnapshot<TContent>,
    context: ResolverFormatContext
  ) => MaybePromise<TBoundedTool[]>;
  getAgentDescription?: () => string;
  isReadonly?: boolean;
}

```

## Contract Changes

### agent_context_layer Setup

```typescript
interface AgentContextLayerPluginSetup {
  registerType: (definition: SmlTypeDefinition) => void;              // existing
  registerResolverType: (definition: ResolverTypeDefinition) => void;  // NEW
}
```

### agent_context_layer Start

```typescript
interface AgentContextLayerPluginStart {
  // ... existing SML methods ...
  getResolverType: (typeId: string) => ResolverTypeDefinition | undefined;  // NEW
  hasResolverType: (typeId: string) => boolean;                              // NEW
  listResolverTypes: () => ResolverTypeDefinition[];                          // NEW
}
```

### agent_builder Setup (removal)

Remove `attachments.registerType` from `AgentBuilderPluginSetup`. Downstream plugins no longer call it.

## What Moves

| Current location | New location | Notes |
|-----------------|-------------|-------|
| `@kbn/agent-builder-server/attachments/type_definition.ts` → `AttachmentTypeDefinition` | `@kbn/agent-context-layer-common` + ACL resolver service types → `ResolverTypeDefinition` | Core contract generified; **`ResolverBoundedTool`** in common; plugin/server re-export only |
| `@kbn/agent-builder-server/attachments/type_definition.ts` → `AttachmentFormatContext` | `agent_context_layer/server/services/resolver/types.ts` → `ResolverFormatContext` | Renamed |
| `@kbn/agent-builder-server/attachments/type_definition.ts` → `AttachmentResolveContext` | `agent_context_layer/server/services/resolver/types.ts` → `ResolverResolveContext` | Renamed |
| `@kbn/agent-builder-server/attachments/type_definition.ts` → `AttachmentValidationResult` | `agent_context_layer/server/services/resolver/types.ts` → `ResolverValidationResult` | Renamed |
| `agent_builder/server/services/attachments/attachment_type_registry.ts` | `agent_context_layer/server/services/resolver/resolver_type_registry.ts` | Registry implementation |
| (new) `ResolverBoundedTool` descriptor | `@kbn/agent-context-layer-common` | Minimal bounded-tool contract for `getBoundedTools`; no AB imports (see **`getBoundedTools` and bounded-tool types** section) |

## What Stays in agent_builder / @kbn/agent-builder-server

| Component | Reason |
|-----------|--------|
| `AgentFormattedAttachment` (representation only — `getBoundedTools` removed) | Wraps only `ResolverFormattedContent.getRepresentation`; bounded tools now on `ResolverTypeDefinition.getBoundedTools` |
| `AttachmentBoundedTool` and tool type aliases | **Execution union** for the runner/registry; adapter maps from common **`ResolverBoundedTool`** (builtin path) and handles AB-specific variants separately |
| `AttachmentStateManager` | Per-conversation lifecycle management |
| `validate_attachment.ts` | Calls resolve + type validation with AB-specific context |
| `Attachment`, `VersionedAttachment`, `VersionedAttachmentWithOrigin` | Common data model for conversations; `hidden` field stays here (UI/conversation concern only) |
| All attachment tools (read, add, update, list, diff) | Execution layer |
| `ToolHandlerContext`, `ToolHandlerReturn` | Used **inside agent_builder** when implementing adapter/runner behavior — **not** on `ResolverBoundedTool` in common (common uses `ResolverFormatContext` only for `run`) |

## Adapter Pattern in agent_builder

agent_builder maps between the generic `ResolverTypeDefinition` and its internal `AttachmentTypeDefinition`.

`hidden` is an AB/UI concern — it stays on `Attachment` in AB's data model. It is **not** passed to the resolver's `getBoundedTools` or `format`; the adapter strips it when building the snapshot.

```typescript
// In agent_builder's attachment_service.ts (sketch — expand as needed)
/** Stable id when there is no conversation row: hash(type, origin) or similar. */
const syntheticInstanceId = (type: string, origin: string) => { /* e.g. SHA-256 url-safe base64 */ };

const wrapResolverType = (resolverType: ResolverTypeDefinition): AttachmentTypeDefinition => ({
  ...resolverType,
  format: (attachment: Attachment, context) => {
    const result = resolverType.format(
      { id: attachment.id, type: attachment.type, data: attachment.data },
      // Note: hidden and origin intentionally excluded from resolver format input
      context
    );
    return result; // representation only — no getBoundedTools on format return
  },
  getBoundedTools: resolverType.getBoundedTools
    ? async (attachment: Attachment, context) => {
        const snapshot = {
          type: attachment.type,
          ...(attachment.origin !== undefined ? { origin: attachment.origin } : {}),
          data: attachment.data,
          instanceId:
            attachment.id ??
            (attachment.origin !== undefined
              ? syntheticInstanceId(attachment.type, attachment.origin)
              : stableHashForInlineData(attachment.data)),
          // hidden is intentionally absent
        };
        const generic = await resolverType.getBoundedTools!(snapshot, context);
        return generic.map(mapResolverBoundedToolToAttachmentBoundedTool);
      }
    : undefined,
  isStale: resolverType.isStale
    ? (attachment: VersionedAttachmentWithOrigin, context) => {
        const latest = getLatestVersion(attachment);
        if (!latest) {
          return false;
        }
        return resolverType.isStale!(
          {
            id: attachment.id,
            type: attachment.type,
            origin: attachment.origin,
            data: latest.data,
            origin_snapshot_at: attachment.origin_snapshot_at,
          },
          context
        );
      }
    : undefined,
});
```

Runner changes (`prepare_conversation`, `select_tools`): stop reading `formatted.getBoundedTools`; call **`definition.getBoundedTools?.(attachment, formatContext)`** (or equivalent) using the same `Attachment` snapshot as `format`. External HTTP / harness code can build the same snapshot from **`type` + `origin`** (resolve → `data`) without a conversation id — see Bounded tools section.

This adapter stays in agent_builder and owns all AB-specific mapping.

## Implementation Stories

### Story 1: Create resolver types and registry in agent_context_layer
- Add **`ResolverBoundedTool`** to **`@kbn/agent-context-layer-common`** and wire **`ResolverTypeDefinition.getBoundedTools`** to return **`ResolverBoundedTool[]`** (remove dependency of ACL resolver types on **`AttachmentBoundedTool`** / `@kbn/agent-builder-server` for this contract)
- **`@kbn/agent-builder-server`** dependency on agent_context_layer plugin/server only where still needed for execution — avoid importing AB tool types into common or into ACL **registry** contracts
- Add `@kbn/zod/v4` to **`agent_context_layer_common`** / plugin as needed for `schema` typing on **`ResolverBoundedTool`**
- Create `server/services/resolver/types.ts` with generic types
- Create `server/services/resolver/resolver_type_registry.ts`
- Update setup/start contracts
- Update plugin.ts

### Story 2: Update agent_builder — adapter pattern
- Remove `getBoundedTools` from `AgentFormattedAttachment` (only `getRepresentation` remains)
- Create adapter function to map `ResolverTypeDefinition` → `AttachmentTypeDefinition`
- Update **`prepare_conversation`** / **`select_tools`** to use **`definition.getBoundedTools`** instead of **`formatted.getBoundedTools`**
- Update `attachment_service.ts` to get resolver types from agent_context_layer start contract
- Remove `registerType` from AB's public setup contract
- Delete `attachment_type_registry.ts`
- Keep re-exports from `@kbn/agent-builder-server/attachments` for backward compat (deprecated)

### Story 3: Update downstream plugins (16 types across 5 plugins)
- Change from `agentBuilder.attachments.registerType(...)` to `agentContextLayer.registerResolverType(...)`
- Update type imports from `AttachmentTypeDefinition` to `ResolverTypeDefinition`
- Update `format` implementations: `attachment.data.X` → `item.data.X` (rename param; same values — confirmed no implementation uses `hidden` or `origin` in `format`)
- Update `isStale` implementations to accept **`ResolverStaleCheckItem`** — only `dashboard.ts` needs this change (the only isStale implementation)
- **Bounded tools:** move implementations from **`format` return** to **`ResolverTypeDefinition.getBoundedTools`**:
  - Data comes from `snapshot.data` instead of `attachment.data` (same values, different source)
  - Resolver-side **`ResolverBoundedTool.run`** uses **`ResolverFormatContext`** only; the AB adapter widens to **`ToolHandlerContext`** / **`ToolHandlerReturn`** when mapping to **`AttachmentBoundedTool`**
  - Tool IDs must embed `instanceId` to support multiple instances: e.g. `get_alert_details_${snapshot.instanceId}`
  - 8 observability types have getBoundedTools (alert, error, log, service, slo, host, transaction, monitor)
  - Connector returns `getBoundedTools: () => []` — trivial
  - 7 types have no getBoundedTools (ai_insight, entity_analytics_dashboard, service_map, security/alert, security/entity, security/rule, dashboard)

### Story 4: Bounded tools HTTP API (no conversation id in ref)
- **Addressing:** API or harness listing/running bounded tools for a **by-reference** referent uses **`resolverTypeId` + `origin`**. Server resolves with **`resolve(origin, context)`**, builds **`ResolverBoundedToolItemSnapshot`**, then lists or executes — **`conversation_id` not required**.
- **Optional later:** extend existing **`POST /api/agent_builder/tools/_execute`** with optional `attachment_ref: { type, origin }` so `tool_id` means the **bounded tool id** when that ref is present. Follow real `@kbn/config-schema` in `tools.ts`.

### Story 5: Backward compatibility + cleanup
- Deprecate re-exports from `@kbn/agent-builder-server/attachments`
- Update tests
- Update documentation

## Audit Results

### `hidden` field
- **Not used in any `format`, `getBoundedTools`, or `isStale` implementation** (confirmed by full audit)
- It is a UI/conversation management concern: controls whether the attachment renders in the chat UI, set to `true` for auto-injected screen context
- `hidden` stays on AB's `Attachment` model and is **not** included in `ResolverBoundedToolItemSnapshot` or `ResolverTypeDefinition` inputs
- **No UI attachment type registry needed** — `hidden` is already correct where it is

### `origin` field in `format`
- **Not used in any `format` implementation** (confirmed by full audit)
- All format implementations read only from `attachment.data` (and `attachment.id`)
- The `{ id, type, data }` signature is sufficient

### `isStale` implementations
- **Only one implementation: `dashboard.ts`** — reads `attachment.origin`, `attachment.origin_snapshot_at`, and `getLatestVersion(attachment).data`
- All three fields map directly to `ResolverStaleCheckItem.{origin, origin_snapshot_at, data}` — trivial migration

### `getBoundedTools` implementations
- **8 types have bounded tools** (all in observability_agent_builder): alert, error, log, service, slo, host, transaction, monitor
- **All share the same pattern:** close over fields from `attachment.data`; handler uses only `context.request` from `ToolHandlerContext`; return `{ results: [{ type: ToolResultType.other/error, data }] }`
- Connector returns `[]` (trivial)
- 7 types have no `getBoundedTools`
- All current tool IDs are **fixed strings** (e.g. `GET_ALERT_DETAILS_TOOL_ID`), not instance-scoped — needs to change to embed `instanceId`

### Plugin count
- **5 plugins** register attachment types (not 8 as originally estimated):
  1. `observability_agent_builder` — 9 types
  2. `security_solution` — 4 types
  3. `apm` — 1 type
  4. `agent_builder_platform` — 1 type (connector)
  5. `dashboard_agent` — 1 type (dashboard)
- Total: **16 type implementations**

## Loose Ends

### 1. `origin` field: confirmed absent from all `format` implementations
No action needed. `{ id, type, data }` is the complete resolver format input.

### 2. `isStale` — explicit latest snapshot (no `VersionedAttachment` in resolver)

**Contract:** Resolver `isStale` accepts **`ResolverStaleCheckItem`** only: identity (`id`, `type`), `origin`, **`data` for the latest / current version** (adapter must use `getLatestVersion` so it matches `current_version`), and optional **`origin_snapshot_at`** for types that compare against remote `updated_at`.

**Migration:** `dashboard.ts` uses `attachment.origin`, `attachment.origin_snapshot_at`, and `getLatestVersion(attachment)` — all map directly to `ResolverStaleCheckItem` fields.

### 3. Bounded tools for observability types (8 types)
Migrate `getBoundedTools` from `format()` return to `ResolverTypeDefinition.getBoundedTools(snapshot, context)`:
- `snapshot.data.X` replaces `attachment.data.X` (same values)
- Handler signature unchanged (`ToolHandlerContext`)
- Tool IDs must embed `snapshot.instanceId` for multi-instance safety

### 4. `getBoundedTools` removed from `AgentFormattedAttachment`
`AgentFormattedAttachment` becomes representation-only (`getRepresentation` only). All callers of `formatted.getBoundedTools` in `prepare_conversation.ts` and `select_tools.ts` are updated to call `definition.getBoundedTools(...)` instead.

### 5. `type` + `origin` uniqueness and security

**Uniqueness** of `(type, origin)` is **per request scope** (space, user, SO client), not a global UUID — same `origin` string can mean different objects in different spaces or for different resolver types. Document this for any URI / HTTP API.

**Security:** Listing or executing bounded tools must enforce the same authorization as **`resolve`** (and tool execution): do not allow cross-tenant probing by trying origins blindly.

## Estimated Impact

- ~25 files with type import changes
- ~10 files with registration call changes
- **16 attachment type implementations** across **5 downstream plugins** updating deps and registration
- 1 new service directory in agent_context_layer
- 1 file deleted from agent_builder
- Adapter + runner updates for bounded tools (modest growth vs today's ~20-line adapter sketch)
- All existing `format` implementations need parameter rename only (no logic changes)
- 1 `isStale` implementation needs signature update (dashboard)
- 8 `getBoundedTools` implementations need to move from format return to type definition + embed instanceId in tool IDs
