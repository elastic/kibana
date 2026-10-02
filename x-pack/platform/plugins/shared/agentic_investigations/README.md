# Agentic investigations

Solution-agnostic base layer for the entities an agent and a human collaborate on. It owns their storage and their API, so a Worker in any solution can create them and any solution's UI can act on them.

Today it holds two entities: **impact** and **escalations**. **Investigations** are next, which is why the plugin is an umbrella rather than one plugin per entity. **Proposals** started here and now live in their own `proposals` plugin, which this one may depend on but which does not depend on this one.

It also owns the browser UI of the `investigation` and `escalation` conversation templates: the Agent Builder conversation details flyout, its tabs, and the connected components behind them. See [Template UI and gating](#template-ui-and-gating).

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
  evidence/              evidence schema (Markdown + static chart), shared by every entity
  investigation_attachments/  base types of by-reference investigation attachment documents
  impact/                constants, schemas, step definitions, attachment type id
  escalations/           constants and schemas
server/
  plugin.ts config.ts types.ts
  features.ts            umbrella feature and its privileges
  services/              user resolution, shared by every entity
  investigation_attachments/  `defineInvestigationAttachment` factory and the agent tool helper
  impact/                routes, service, storage, step handlers, Agent Builder attachment, agent tool
  escalations/           routes and service
public/
  plugin.ts index.ts types.ts
  impact/                browser step definitions and flyout attachment UI
  evidence/              evidence renderer (Markdown + line/bar chart), exported as `LazyEvidenceView`
  investigation_attachments/  attachment renderer registration helper
  escalations/           browser hooks
  user_profiles/         browser hooks
  conversation_templates/  investigation and escalation conversation template UI
    registry/            `TemplateDefinition` and `registerTemplate`, called once from `plugin.ts`
    shared/              connected components shared by the templates and exported to solutions (assignees, status, close confirmation, escalation modal, proposed actions)
    templates/           one directory per template: its `register.ts` and its own flyout parts
  hooks/                 capability and open-in-chat hooks
```

Adding an entity means adding a directory in each of the three, an entity barrel, its privileges in `features.ts`, and a getter on the start contract. It should not require restructuring the umbrella itself.

## Privileges

One Kibana feature, `agenticInvestigations`.

| Feature privilege | API | UI |
| ----------------- | --- | -- |
| `all`             | `read_investigations` | —  |
| `read`            | `read_investigations` | —  |

The feature carries `minimumLicense: 'enterprise'`.

Sub-features are registered in this order: **Investigations**, then **Escalations**. That order drives placement in the Roles and Spaces feature pickers.

Impact has no privilege of its own yet. Reads and writes require the investigations sub-feature privilege, `manage_investigations`, which `includeIn: 'all'` joins to the base All level. A dedicated impact privilege can be split out later if read and write need to diverge. Escalation create and update stay `includeIn: 'none'`, so All does not grant them. Escalation view is `includeIn: 'read'`, so base Read and All can list. Follow the sub-feature pattern for any new entity that is not intrinsic to an investigation.

`read_investigations` is what the privileges probe reports as `investigations.read`; no route requires it yet.

The shared `POST /internal/investigations/_suggest_user_profiles` route accepts either `manage_investigations` or `manage_escalations`, so both investigation and escalation managers can suggest assignees and collaborators without holding the other entity's privilege.

**Note:** `minimal_all` and `minimal_read` are **not** equivalent to `all` and `read`. They only grant sub-features marked `groupType: 'independent'`, and only when the user holds them explicitly.

Proposals privileges are **not** here. They belong to the `proposals` feature, registered by the `proposals` plugin.

## By-reference investigation attachments

Entities an agent records on an investigation (impact today; subjects and hypotheses next) are **by-reference Agent Builder attachments backed by a hidden index**. `server/investigation_attachments/defineInvestigationAttachment` gives each one:

- **Storage**: a `StorageIndexAdapter` index (`.kibana-investigation-<entity>`, see [Index naming](#index-naming)) with keyword `spaceId` and `conversationId`, read and written as the internal user. Callers authorize first and pass the request's space. Mapping changes must stay additive.
- **Service** (`InvestigationAttachmentDocService`): `get` (space-checked), `upsert` (read-modify-write under `if_seq_no`/`if_primary_term`, retried on a lost race, then a conflict error), `revert`, `listByConversationIds` (≤ 1000), `searchConversationIds(filter)` for list filters that start from the index, and `deleteByConversationIds` / `deleteAllInSpace` for maintenance. Document ids are a hash of their key parts (`hashInvestigationAttachmentId`). Every read goes through `withTransientSearchRetry`: on a fresh cluster the hidden index may not exist yet (reads as empty) or may have no allocated shard for a moment after the first write created it (`no_shard_available_action_exception`, or an all-shards-failed 503 `search_phase_execution_exception`), which is retried after 200, 400, and 800 ms before the error is rethrown.
- **Agent Builder type**: `isReadonly`, so the generic attachment tools cannot edit it. `validate` accepts every stored document shape (it runs whenever data is passed), `resolve` loads the document by origin, `isStale` compares the attachment with the index ignoring `updatedAt`, and `format` gives the LLM a compact text. The type id must be on `AGENT_BUILDER_BUILTIN_ATTACHMENTS` in `@kbn/agent-builder-server`.
- **Two write paths**, both index first:
  - Routes and workflow steps (`writeAndAttach` / `attachWithPublicClient`): owner check on the conversation, index write, then create or update the attachment through the public attachment client from a fresh read. A user-removed (inactive) attachment is left removed. A failed attachment write reverts the index write.
  - Agent tools (`writeFromTool` / `attachFromTool`): index write, then add or update the attachment through the run's attachment state manager. Agent Builder persists that state when the round ends, so the index is the source of truth if the round fails first. A user-removed attachment is not re-added.
- **Hidden in the chat** (`hiddenInConversation: true`): both write paths write the conversation attachment with Agent Builder's `hidden` flag. The model still gets the attachment, but the chat shows no input pill, no "Added" reference, no inline card and no timeline event for it, and Agent Builder records no attachment change event (so no `ai.attachmentAdded` / `ai.attachmentUpdated` workflow trigger fires for it). The investigation overview, which reads the index, still shows it. The attachment is hidden when it is created; updates send only its data.
- **Agent tools** are owned by each entity and built with `createInvestigationTool`: availability and every call check the privilege, the conversation id comes from the run stack (a standalone run is refused), and errors become tool error results. Tool ids must be on `AGENT_BUILDER_BUILTIN_TOOLS`.
- **Renderers** register with `registerInvestigationAttachmentRenderer` (public): one lazily loaded content component for the inline chat render and the conversation details flyout. A hidden type keeps its inline renderer as a fallback, for a `<render_attachment>` tag a model emits anyway.

Readers start from the index, never from `conversation.attachments`.

## Impact

An **Impact** record is what an investigation found was affected: a `summary`, its `evidence`, and the `entities` (users, hosts, services) involved. It lives in `.kibana-investigation-impact`, one document per space and conversation, and is the source for both the AlertZero landing-page pills and the investigation flyout. `id` is the entity filter key; `name`, `type`, `featureId`, and `streamName` carry the fields Nightshift reports.

- **Evidence** is `{ description?: Markdown, chart?: { type: line|bar, title, x_axis, y_axis, stacked?, series[1..5], annotations[≤5] } }` (`common/evidence`). It can sit on the impact (`evidence`) or on each entity (`entities[].evidence`). It is stored but not indexed. The browser renders it with `LazyEvidenceView`.
- Every field but the ids and `createdAt` is optional on the stored document. Documents written before summary and evidence existed (entities only) still validate.
- **Route and step writes** union entities by `id` onto the existing document rather than appending a new one. A later attach fills in fields the first write omitted, and per-entity evidence a later write sends replaces the earlier one. Summary and evidence are kept. AlertZero may attach `{ id }` only; the pill label stays the id until Entity Store hydration. The document `_id` is a hash of `(spaceId, conversationId)`. Attach reads that id and retries the union when a concurrent create or update wins the version check, so both writers' entities land on the one record.
- **The agent tool `investigations.set_impact`** writes a partial snapshot: each field it sends (`summary`, `evidence`, `entities`) replaces the stored one, and fields it leaves out are kept. `entities` replaces the whole list (deduped by id, `id` defaults to the name, at most 10), and `entities: []` removes them; `summary: null` and `evidence: null` remove those. Because the list is replaced, an agent call that sends `entities` also replaces entities a route or step attached. It warns the agent, without failing, when a single entity carries evidence (use the summary and top-level evidence instead) and when the stored impact has both top-level evidence and entities (remove one with `evidence: null` or `entities: []`). It requires `manage_investigations`, writes the index immediately, and adds or updates the `investigation_impact` attachment through the run's attachment state.
- HTTP: `POST /internal/investigations/impact` and `GET ...?conversationId=` both require `manage_investigations`. Bulk hydrate is in-process via `getImpactClient(request).listByConversationIds()`, which checks that same privilege and uses the request's space. The raw service stays internal to the routes.
- Workflow steps: `investigations.attachImpact` and `investigations.getImpact` both require `manage_investigations` and fail the step when it is missing. `getImpact` also fails if none is attached, and returns `entities: []` for an impact recorded as a summary only. Same fail-closed privilege check as proposal steps.
- Agent Builder attachment type `investigation_impact` (`isReadonly: true`, hidden in the chat) is registered for the investigation flyout (and allow-listed in `@kbn/agent-builder-server`). The attach HTTP route and `investigations.attachImpact` call `attachImpactToInvestigation`, the route path above; the attachment `origin` is the Impact document id. `resolve()` loads the current document, so a later merge does not leave the flyout on a stale snapshot. The renderer shows the summary (Markdown), the evidence chart, and the entities; the details flyout also shows each entity's evidence.
- `scripts/seed_impact_attachment.sh` creates an investigation conversation, attaches entities through the internal API, and checks that the conversation has one `investigation_impact` attachment.

## Template UI and gating

The public plugin registers the conversation template UI for `investigation` and `escalation` once in `start`, through `registerTemplate` in `public/conversation_templates/registry/register_template.ts`, with one `TemplateDefinition` per template in `public/conversation_templates/templates/<template>/register.ts`. Solutions do not register these templates themselves; Agent Builder throws on a second registration.

- **Registration** depends only on Agent Builder being available. It does not read any solution setting or capability, so a user who reaches an investigation through any solution (for example Nightshift) gets the same flyout.
- **Write actions** are registered unconditionally and decide at render time, inside their lazy chunks, whether the user may use them. Each check passes on this plugin's UI capability or, without it, on the matching API privilege, so a user who holds the privilege through another feature (AlertZero and Nightshift grant some) gets the same actions:

  | Action | UI capability | or API privilege |
  | ------ | ------------- | ---------------- |
  | Investigation status toggle, assignees, close modal | `agenticInvestigations.manageInvestigations` | `manage_investigations` |
  | Open escalation button and modal, escalation assignees | `agenticInvestigations.manageEscalations` | `manage_escalations` |
  | Escalation status toggle | both of the above | `manage_escalations` and `manage_investigations` |
  | Linked investigations on an escalation, existing escalations in the escalation modal | `agenticInvestigations.showEscalations` | `read_escalations` (or `manage_escalations`) |
  | Proposed actions | the optional `proposals` plugin; read-only without `proposals.decideProposals`, and deciding is authorized by the proposals API | |

  The status toggle and assignee pickers render disabled or read-only when the check fails; the other slots render nothing. When the UI capability is missing, the hooks (`useCanManageInvestigations`, `useCanManageEscalations`, `useCanReadEscalations`) ask `GET /internal/investigations/_privileges` once per page and share the answer; users with the capabilities never make that request. The route reports `{ investigations: { read, manage }, escalations: { read, manage } }` for the caller and needs no privilege of its own.
- **No solution gates.** A solution's license or tier, its feature privileges and its settings do not gate the flyout. For example AlertZero's subscription check, its `securitySolution:enableAlertZero` setting and its `AccessBoundary` gate AlertZero's own pages, routes and attachment renderers, not this flyout. A solution that needs stricter rules on its own pages narrows the capabilities there (AlertZero's queue also requires AlertZero All for manage actions).
- **Icons.** The investigation template uses the solution-neutral `magnifyExclamation` (AlertZero used the security-specific `securitySignalDetected`) and the escalation template `warning`, kept from AlertZero.

The status and assignee signals and the shared query client in `public/` are module-level singletons. Solution pages must import them from `@kbn/agentic-investigations-plugin/public` so a change in the flyout reaches their queue views.

## Index naming

`.kibana-investigation-impact` is permanent. `.kibana*` is already granted to the `kibana_system` role, so the index needs no Elasticsearch-side system index registration — a dedicated prefix such as `.investigation-impact` would. `anonymization` ships `.kibana-anonymization-profiles` on the same reasoning. Each entity gets its own index rather than one index discriminated by a type field.

**Escalations are the documented exception:** they live in Agent Builder's `.chat-conversations` index (a conversation with `template_id: 'escalation'`), and this plugin owns no storage for them. The reasons are: (a) Agent Builder's conversation model already provides everything an escalation needs — metadata, access control, space scoping, OCC writes; (b) adding an escalations index would duplicate that infrastructure for no benefit; (c) the visibility and collaborator model that agents and investigations already use must apply to escalations for free. Any future entity that fits the conversation model should do the same rather than adding an index by default.

## Escalations

### Escalations are AlertZero-only for now

`xpack.agenticInvestigations.escalations.enabled` (default `true`, exposed to the browser) turns escalations off. `config/serverless.oblt.yml` sets it to `false`, so Observability serverless projects (every tier) have no escalations; stateful deployments and Security serverless keep the default. When it is `false`:

- The `agenticInvestigations` feature registers no Escalations sub-feature, so no role gets `read_escalations`, `manage_escalations`, `showEscalations` or `manageEscalations` from it.
- No escalation route is registered, and `getEscalationsService()` on the start contract throws. The shared `POST /internal/investigations/_suggest_user_profiles` route stays, because the investigation assignee picker uses it.
- The privileges probe reports `escalations: { read: false, manage: false }`, even when another feature grants the escalations API privileges.
- The browser registers no `escalation` template UI, and the investigation template has no "Open escalation" button or escalation modal.

It is a plugin flag rather than an `xpack.features.overrides` entry because an override that names an unregistered feature fails at startup, and the plugin is still disabled on Observability serverless.

### Model

An **escalation** is a durable, shareable record that an analyst creates when a collection of investigations warrants formal escalation. Unlike proposals — which live in a bespoke index — escalations live in Agent Builder's `.chat-conversations` index as conversations with `template_id: 'escalation'`. That choice buys the full conversation stack: OCC-safe metadata writes, access control, space scoping, and Agent Builder's conversation template validation.

`EscalationsService` is a thin orchestration façade over `agentBuilder.conversations.getScopedClient({ request })`. It owns no Elasticsearch client and no index.

### Privileges

Escalations use an `escalations` sub-feature on the `agenticInvestigations` Kibana feature:

The `escalations` sub-feature uses a `mutually_exclusive` privilege group, so a user receives exactly one of:

| Sub-feature privilege | API | UI |
| --- | --- | --- |
| `escalations_all` (`includeIn: 'none'`) | `read_escalations`, `manage_escalations` | `showEscalations`, `manageEscalations` |
| `escalations_read` (`includeIn: 'read'`) | `read_escalations` | `showEscalations` |

`manage_escalations` also grants access to the shared `POST /internal/investigations/_suggest_user_profiles` route (alongside `manage_investigations`). See the Privileges section above.

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
