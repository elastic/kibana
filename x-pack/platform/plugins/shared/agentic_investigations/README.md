# Agentic investigations

Solution-agnostic base layer for the entities an agent and a human collaborate on. It owns their storage and their API, so a Worker in any solution can create them and any solution's UI can act on them.

Today it holds two entities: **impact** and **escalations**. **Investigations** are next, which is why the plugin is an umbrella rather than one plugin per entity. **Proposals** started here and now live in their own `proposals` plugin, which this one may depend on but which does not depend on this one.

Consumed by AlertZero (Security) and intended for Nightshift (Observability). Nothing in this plugin is solution-specific.

## What belongs here, and what does not

This layer owns the record and its API. It does not decide what to escalate, or what an investigation is about — a human or a Worker does.

## Entity directories

Every entity gets the same three homes, and nothing entity-specific lives above them:

```
common/
  constants.ts           umbrella: plugin id, API version, route base
  user.ts                who acted, shared by every entity
  index.ts               umbrella barrel, re-exports each entity barrel
  impact/                constants, schemas, step definitions, attachment type id
  escalations/           constants and schemas
server/
  plugin.ts config.ts types.ts
  features.ts            umbrella feature and its privileges
  services/              user resolution, shared by every entity
  impact/                routes, service, storage, step handlers, Agent Builder attachment
  escalations/           routes and service
public/
  plugin.ts index.ts types.ts
  impact/                browser step definitions and flyout attachment UI
  escalations/           browser hooks
  user_profiles/         browser hooks
```

Adding an entity means adding a directory in each of the three, an entity barrel, its privileges in `features.ts`, and a getter on the start contract. It should not require restructuring the umbrella itself.

## Privileges

One Kibana feature, `agenticInvestigations`.

| Feature privilege | API | UI |
| ----------------- | --- | -- |
| `all`             | —   | —  |
| `read`            | —   | —  |

The feature carries `minimumLicense: 'enterprise'`.

Impact has no privilege of its own yet. Reads and writes require the investigations sub-feature privilege, `manage_investigations`, which `includeIn: 'all'` joins to the base All level. A dedicated impact privilege can be split out later if read and write need to diverge. Escalations sit in their own sub-feature, joined to the base levels through `includeIn: 'all'` / `includeIn: 'read'`. Follow that sub-feature pattern for any new entity that is not intrinsic to an investigation.

**Note:** `minimal_all` and `minimal_read` are **not** equivalent to `all` and `read`. They only grant sub-features marked `groupType: 'independent'`, and only when the user holds them explicitly.

Proposals privileges are **not** here. They belong to the `proposals` feature, registered by the `proposals` plugin.

## Impact

An **Impact** record is the set of entities (users, hosts, services) an investigation is about. It lives in `.kibana-investigation-impact`, one document per space and conversation, and is the source for both the AlertZero landing-page pills and the investigation flyout. Nightshift writes the same document: `id` is the filter key, and `name`, `type`, `featureId`, and `streamName` carry the fields on its existing `InvestigationImpactEntity`.

- AlertZero may attach `{ id }` only. The pill label stays the id until Entity Store hydration. Nightshift attaches `{ id, name, type?, featureId?, streamName? }`.
- Writes are **upsert/merge**: attaching more entities unions them by `id` onto the existing document rather than appending a new one. A later attach fills in fields the first write omitted. That is load-bearing for hydrate-by-conversationId plus filtering on `entities.id`. The document `_id` is a hash of `(spaceId, conversationId)`. Attach reads that id and retries the union when a concurrent create or update wins the version check, so both writers' entities land on the one record.
- Evidence is not on this document. Nightshift's current evidence shape cannot represent non-local data, and that format is still open.
- HTTP: `POST /internal/investigations/impact` and `GET ...?conversationId=` both require `manage_investigations`. Bulk hydrate is in-process via `getImpactClient(request).listByConversationIds()`, which checks that same privilege and uses the request's space. The raw service stays internal to the routes.
- Workflow steps: `investigations.attachImpact` and `investigations.getImpact` both require `manage_investigations` and fail the step when it is missing. `getImpact` also fails if none is attached. Same fail-closed privilege check as proposal steps.
- Agent Builder attachment type `investigation_impact` (`isReadonly: true`) is registered for the investigation flyout (and allow-listed in `@kbn/agent-builder-server`). Nothing in this plugin writes the attachment onto a conversation yet — producers persist the Impact document; stamping it onto chat is a follow-up.

## Index naming

`.kibana-investigation-impact` is permanent. `.kibana*` is already granted to the `kibana_system` role, so the index needs no Elasticsearch-side system index registration — a dedicated prefix such as `.investigation-impact` would. `anonymization` ships `.kibana-anonymization-profiles` on the same reasoning. Each entity gets its own index rather than one index discriminated by a type field.

**Escalations are the documented exception:** they live in Agent Builder's `.chat-conversations` index (a conversation with `template_id: 'escalation'`), and this plugin owns no storage for them. The reasons are: (a) Agent Builder's conversation model already provides everything an escalation needs — metadata, access control, space scoping, OCC writes; (b) adding an escalations index would duplicate that infrastructure for no benefit; (c) the visibility and collaborator model that agents and investigations already use must apply to escalations for free. Any future entity that fits the conversation model should do the same rather than adding an index by default.

## Escalations

### Model

An **escalation** is a durable, shareable record that an analyst creates when a collection of investigations warrants formal escalation. Unlike proposals — which live in a bespoke index — escalations live in Agent Builder's `.chat-conversations` index as conversations with `template_id: 'escalation'`. That choice buys the full conversation stack: OCC-safe metadata writes, access control, space scoping, and Agent Builder's conversation template validation.

`EscalationsService` is a thin orchestration façade over `agentBuilder.conversations.getScopedClient({ request })`. It owns no Elasticsearch client and no index.

### Privileges

Escalations use an `escalations` sub-feature on the `agenticInvestigations` Kibana feature:

The `escalations` sub-feature uses a `mutually_exclusive` privilege group, so a user receives exactly one of:

| Sub-feature privilege | API | UI |
| --- | --- | --- |
| `escalations_all` (included in `all`) | `read_escalations`, `manage_escalations` | `showEscalations`, `manageEscalations` |
| `escalations_read` (included in `read`) | `read_escalations` | `showEscalations` |

### API

All routes are internal and versioned (`/internal/investigations/escalations`, version `1`):

- `GET /internal/investigations/escalations` — list non-closed escalations the caller can access; needs `read_escalations`
- `POST /internal/investigations/escalations` — create an escalation from a linked investigation; needs `manage_escalations`
- `PATCH /internal/investigations/escalations/{id}` — update title or append linked investigations; needs `manage_escalations`

### Create behaviour

`POST` takes `{ linked_investigation_id, visibility, collaborators? }`. The handler:

1. Fetches the investigation through the caller's scoped client — this enforces that the caller can see the investigation they are escalating.
2. Validates that the target is an `investigation` conversation (throws a `400` otherwise).
3. Resolves the escalation template's declared fields at runtime via `agentBuilder.conversationTemplates.get('escalation')`.
4. Copies the intersection of the investigation's metadata and those declared fields, **excluding `status`** (so the escalation opens with `status: 'open'` from the template default) and **excluding `linked_investigations`** (set separately to `[linked_investigation_id]`). This filter is what prevents a `400` from `workflow_execution_id`, which is declared on the investigation template but not on the escalation template.
5. Creates the conversation with `templateId: 'escalation'` and no explicit `agentId` — the default agent is used, so collaborators can always see the escalation regardless of their access to the investigation's agent.

### List behaviour

`GET` accepts optional `page` and `per_page` query parameters (defaults: `page=1`, `per_page=50`; maximum `per_page=50`; `page * per_page` must not exceed `10,000`). It returns:

```json
{
  "pagination": { "total": 42, "page": 1, "per_page": 50 },
  "results": [ /* ConversationWithoutRoundsWithPermissions */ ]
}
```

The filter is **fixed and server-side**: `template_id: "escalation" and not metadata.status: "closed"`. A few things to note:

- The filter uses `metadata.status`, not the bare `status` field. The bare `status` maps to the
  conversation-level `ConversationRoundStatus` (`in_progress`/`completed`/…); the escalation
  open/closed state lives in the template metadata.
- `not metadata.status: "closed"` keeps documents where the field is absent, so a freshly created
  escalation (whose metadata carries `status: "open"` from the template default) always appears.
- Access filtering is inherited from Agent Builder's `buildReadAccessFilter`: a caller sees public
  escalations, their own escalations, and private escalations they are listed in. No access control needs
  to be written in this plugin.
- Results are sorted `updated_at desc` (newest-first) with a `created_at` tiebreaker, which is the
  `client.search()` default when no explicit sort is requested.
- Results include no round data (`_source` is `CONVERSATION_LIST_SOURCE_FIELDS`). The response type
  is `EscalationConversationSummary` (`ConversationWithoutRoundsWithPermissions`), which is distinct
  from `EscalationConversation` (the create/update response that includes rounds).

### MVP limitations

- **Owner-only writes.** `patchMetadata` and `update` in Agent Builder are `access: 'owner'`. This conflicts with the epic requirement that participants can link further investigations. A follow-up is needed to widen the access check in Agent Builder's authorization layer.
- **Last-write-wins on concurrent appends.** The array union for `linked_investigations` is computed in the service (outside the OCC write callback), so two concurrent `PATCH` requests can each read stale state and one link can be silently lost. The fix is to move the union computation into `writeConversation`'s `fields` callback. Accepted for MVP; follow-up filed.
- **List caps at 10,000 results.** Offset pagination cannot go beyond Elasticsearch's default result window. Escalations beyond that threshold are unreachable through this API. `search_after` would be needed for deeper paging.
- **Closed escalations are never returned.** The `status: "closed"` filter is not toggleable. A separate endpoint or a future filter parameter would be needed to retrieve closed escalations.
