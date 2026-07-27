# Apply the Templates Engine to Agent Builder Conversations

## Context

We want a lightweight **templates engine** in the `agent_builder` plugin: templates are hardcoded (no storage, no versioning) and carry a `metadata: Record<string, string>` map that gets applied to a new or existing conversation. The implementation adds a `metadata` field to conversations, a static template registry, and apply logic in the conversation client (`conversation/client/client.ts`).

Scope:
- **Hardcoded templates** — a static TS registry (`Record<string, ConversationTemplate>`). No ES index, no CRUD routes, no versioning.
- Templates carry only a `metadata` map. Title/agent_id always come from the caller.
- Application works in two modes: **on create** (pass `template_id` in the create request) and **on an existing conversation** (`applyTemplate` method on the client).
- Server-side only — no UI.

## Reference implementations

- Cases `ParsedTemplateDefinition` pattern (field shape): `x-pack/platform/plugins/shared/cases/common/types/domain/template/v1.ts`.
- Conversation client and storage patterns: `agent_builder/server/services/conversation/client/{client.ts,storage.ts,converters.ts,types.ts}`.
- Space filter: `createSpaceDslFilter` (`agent_builder/server/utils/spaces`).

## Part A — Hardcoded template registry

### A1. Domain types
New file: `x-pack/platform/packages/shared/agent-builder/agent-builder-common/templates/index.ts`
(Plain TS, export from `agent-builder-common/index.ts`.)

```ts
export interface ConversationTemplateDefinition {
  metadata?: Record<string, string>;
}

export interface ConversationTemplate {
  id: string;
  name: string;
  description?: string;
  definition: ConversationTemplateDefinition;
}
```

### A2. Static registry
New file: `x-pack/platform/plugins/shared/agent_builder/server/services/conversation/templates/registry.ts`

```ts
import type { ConversationTemplate } from '@kbn/agent-builder-common';

const TEMPLATES: ReadonlyArray<ConversationTemplate> = [
  // templates added here by feature teams
];

export const getTemplate = (id: string): ConversationTemplate | undefined =>
  TEMPLATES.find((t) => t.id === id);
```

No service class needed — `getTemplate` is a pure function imported directly by the conversation client.

## Part B — `metadata` on conversations + apply logic

### B1. Domain type
`agent-builder-common/chat/conversation.ts`, `interface Conversation`:
```ts
/** Arbitrary key/values seeded from a template or set by callers. */
metadata?: Record<string, string>;
```

### B2. Persistence
`conversation/client/storage.ts`:
- Add `metadata?: Record<string, string>` to `ConversationProperties`.
- Add `metadata: types.object({ dynamic: false, properties: {} })` to `storageSettings.schema.properties` (same treatment as `state`).

### B3. Converters
`conversation/client/converters.ts` — carry `metadata` (conditional spread, matching `origin`/`workspace_id` style) through:
- `convertBaseFromEs`
- `toEs`
- `createRequestToEs`

### B4. Request types
`conversation/client/types.ts`:
- `metadata` is already in `ConversationCreateRequest` (via `Omit<Conversation,…>`).
- Add optional `template_id?: string` to `ConversationCreateRequest` (transient — consumed by the client before `createRequestToEs`, never persisted).
- Add `metadata` to `ConversationUpdateRequest`'s `Partial<Pick<…>>` list.

### B5. Client changes
`conversation/client/client.ts`:

**Apply on create** — in `create(conversation)`:
- If `conversation.template_id` is set, call `getTemplate(conversation.template_id)`.
- If found, merge `metadata = { ...(template.definition.metadata ?? {}), ...(conversation.metadata ?? {}) }` (request values win).
- Strip `template_id` before passing to `createRequestToEs`.

**Apply to existing conversation** — new method on `ConversationClient`:
```ts
applyTemplate(conversationId: string, templateId: string): Promise<Conversation>
```
- `getDocumentWithAccess({ conversationId, access: 'owner' })` — reuse existing access gate.
- `getTemplate(templateId)` — throw `Boom.notFound('Template not found')` if absent.
- Merge `metadata = { ...(template.definition.metadata ?? {}), ...(existing.metadata ?? {}) }` — existing conversation values win (caller clears first for full replace).
- Call `this.update({ id: conversationId, metadata }, { access: 'owner' })`.

### B6. No service wiring changes
Because `getTemplate` is a pure function (no deps), the conversation service and `createClient` signatures are unchanged.

## Files touched

**New:**
- `agent-builder-common/templates/index.ts`
- `agent_builder/server/services/conversation/templates/registry.ts`

**Edited:**
- `agent-builder-common/chat/conversation.ts` — add `metadata`
- `agent-builder-common/index.ts` — export templates types
- `agent_builder/server/services/conversation/client/client.ts` — apply-on-create, `applyTemplate`
- `agent_builder/server/services/conversation/client/storage.ts` — `metadata` mapping
- `agent_builder/server/services/conversation/client/converters.ts` — carry `metadata`
- `agent_builder/server/services/conversation/client/types.ts` — `template_id` on create, `metadata` on update

## Tests

- `conversation/templates/registry.test.ts`: `getTemplate` returns a known template by id; returns `undefined` for unknown id.
- `conversation/client/converters.test.ts`: `metadata` round-trips through `toEs`/`fromEs`/`createRequestToEs`.
- `conversation/client/client.test.ts`:
  - `create` with a valid `template_id` merges template metadata onto the conversation.
  - Request `metadata` overrides template metadata.
  - `create` with no `template_id` → no metadata.
  - `template_id` is not persisted (not present in the stored doc).
  - `applyTemplate` merges template metadata onto an existing conversation.
  - `applyTemplate` with unknown `template_id` → not-found error.
  - Existing conversation metadata takes precedence in `applyTemplate`.

## Verification

1. `node scripts/jest x-pack/platform/plugins/shared/agent_builder/server/services/conversation`
2. `node scripts/type_check --project x-pack/platform/plugins/shared/agent_builder/tsconfig.json`
3. `node scripts/type_check --project x-pack/platform/packages/shared/agent-builder/agent-builder-common/tsconfig.json`
4. `node scripts/eslint --fix $(git diff --name-only)`

## Deferred

- HTTP routes for template management (list, get) — not needed while templates are hardcoded.
- Per-conversation `metadata` exposed on the public HTTP list/get responses.
- Wiring `template_id` from the chat route / `execution/utils/conversations.ts` into `ConversationCreateRequest` — the client is ready; callers add it when needed.
