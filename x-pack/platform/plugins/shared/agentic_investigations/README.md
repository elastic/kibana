# Agentic investigations

Solution-agnostic base layer for the entities an agent and a human collaborate on. It owns their storage and their API, so a Worker in any solution can create them and any solution's UI can act on them.

Today it holds the investigation attachments (**impact**, **subjects**, **hypotheses**) and **escalations**. **Investigations** are next, which is why the plugin is an umbrella rather than one plugin per entity. **Proposals** started here and now live in their own `proposals` plugin, which this one may depend on but which does not depend on this one.

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
  subjects/              constants and schemas, including the alert snapshot and Slack thread fields
  hypotheses/            constants and schemas
  investigations/        status and query API constants, schemas, and response types
  escalations/           constants and schemas
server/
  plugin.ts config.ts types.ts
  features.ts            umbrella feature and its privileges
  services/              user resolution, shared by every entity
  investigation_attachments/  `defineInvestigationAttachment` factory and the agent tool helper
  impact/                routes, service, storage, step handlers, Agent Builder attachment, agent tool
  subjects/              service, claims, request-scoped client, storage, Agent Builder attachment
  hypotheses/            service, storage, Agent Builder attachment, agent tool
  investigations/        status and query routes, query service, in-progress state, privileges checker
  escalations/           routes and service
public/
  plugin.ts index.ts types.ts
  impact/                browser step definitions and flyout attachment UI
  subjects/              subject attachment UI (one row per subject, by type)
  hypotheses/            hypotheses attachment UI
  evidence/              evidence renderer (Markdown + line/bar chart), exported as `LazyEvidenceView`
  investigation_attachments/  attachment renderer registration helper
  investigations/        data layer: query API hooks (investigation, privileges), status, close preview and assignee hooks, query keys, the brief cards loader
  escalations/           browser hooks
  user_profiles/         browser hooks
  conversation_templates/  investigation and escalation conversation template UI
    registry/            `TemplateDefinition` and `registerTemplate`, called once from `plugin.ts`
    shared/              connected components shared by the templates and exported to solutions (assignees, status, close confirmation, escalation modal, proposed actions)
    templates/           one directory per template: its `register.ts` and its own flyout parts
      investigation/     also the investigation card and brief card, their view model, and the flyout's header title, live state (severity, running), and overview tab
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

Investigation data (impact, subjects, hypotheses, the query API) has two API privileges. `read_investigations` comes with base Read and All and lets a user get, list, and count investigations. Writes require the investigations sub-feature privilege, `manage_investigations`, which `includeIn: 'all'` joins to the base All level; it implies read everywhere (read routes accept either, and in-process reads check `read_investigations` or `manage_investigations`). In-process callers check both through `createInvestigationsPrivilegesChecker` (`assertCanRead`, `assertCanManage`), which fails closed without the security plugin. Escalation create and update stay `includeIn: 'none'`, so All does not grant them. Escalation view is `includeIn: 'read'`, so base Read and All can list. Follow the sub-feature pattern for any new entity that is not intrinsic to an investigation.

`read_investigations` is what the privileges probe reports as `investigations.read`; no route requires it yet.

The shared `POST /internal/investigations/_suggest_user_profiles` route accepts either `manage_investigations` or `manage_escalations`, so both investigation and escalation managers can suggest assignees and collaborators without holding the other entity's privilege.

**Note:** `minimal_all` and `minimal_read` are **not** equivalent to `all` and `read`. They only grant sub-features marked `groupType: 'independent'`, and only when the user holds them explicitly.

Proposals privileges are **not** here. They belong to the `proposals` feature, registered by the `proposals` plugin.

## By-reference investigation attachments

Entities recorded on an investigation (impact, subjects, hypotheses) are **by-reference Agent Builder attachments backed by a hidden index**. `server/investigation_attachments/defineInvestigationAttachment` gives each one:

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
- **The agent tool `agentic_investigations.set_impact`** (in the `agentic_investigations` tool namespace, reserved for built-in tools in `@kbn/agent-builder-common`) writes a partial snapshot: each field it sends (`summary`, `evidence`, `entities`) replaces the stored one, and fields it leaves out are kept. `entities` replaces the whole list (deduped by id, `id` defaults to the name, at most 10), and `entities: []` removes them; `summary: null` and `evidence: null` remove those. Because the list is replaced, an agent call that sends `entities` also replaces entities a route or step attached. It warns the agent, without failing, when a single entity carries evidence (use the summary and top-level evidence instead) and when the stored impact has both top-level evidence and entities (remove one with `evidence: null` or `entities: []`). It requires `manage_investigations`, writes the index immediately, and adds or updates the `investigation_impact` attachment through the run's attachment state.
- HTTP: `POST /internal/investigations/impact` and `GET ...?conversationId=` both require `manage_investigations`. Bulk hydrate is in-process via `getImpactClient(request).listByConversationIds()`, which checks the read privilege (`read_investigations` or `manage_investigations`) and uses the request's space. The raw service stays internal to the routes.
- Workflow steps: `investigations.attachImpact` requires `manage_investigations` and `investigations.getImpact` the read privilege; both fail the step when it is missing. `getImpact` also fails if none is attached, and returns `entities: []` for an impact recorded as a summary only. Same fail-closed privilege check as proposal steps.
- Agent Builder attachment type `investigation_impact` (`isReadonly: true`, hidden in the chat) is registered for the investigation flyout (and allow-listed in `@kbn/agent-builder-server`). The attach HTTP route and `investigations.attachImpact` call `attachImpactToInvestigation`, the route path above; the attachment `origin` is the Impact document id. `resolve()` loads the current document, so a later merge does not leave the flyout on a stale snapshot. The renderer shows the summary (Markdown), the evidence chart, and the entities; the details flyout also shows each entity's evidence.
- `scripts/seed_impact_attachment.sh` creates an investigation conversation, attaches entities through the internal API, and checks that the conversation has one `investigation_impact` attachment.

## Subjects

An **investigation subject** is what an investigation is about. It lives in `.kibana-investigation-subject`, **one document per space, conversation, and subject**, so an investigation that a follow-up extends holds several (at most 100). The document `_id` (also the attachment id and origin) is a hash of `(spaceId, conversationId, subjectType, subjectId)`.

- **Types**: `alert`, `significant_event`, `manual` (a question a user asked), and `slack_thread` (a Slack thread asking a question; its id is `team:<T>/channel:<C>/thread:<thread_ts>`).
- **Fields**: `subjectType`, `subjectId` (named so they do not collide with the document `id`), `summary?` (an event title, the question), `triggerType?` (`automatic` | `manual`), `snapshot?` (alerts only), `slack?` (Slack threads only: `channel`, `thread_ts`, `status_message_ts?`, `permalink?`, and `seen_events?`, the at most 50 delivered Slack events the writer already handled, each as `{ event_id, execution_id }` with the run that handled it, newest last), `createdAt`, `createdBy?`, `updatedAt?`.
- **Alert snapshot** (`alertSubjectSnapshotSchema`): a loose object. The fields the renderer reads are declared with the bounds of Nightshift's `alertSnapshotSchema`, so every Nightshift snapshot validates; other fields are kept. At most 50 keys and 64 000 serialized characters. Stored but not indexed.
- **Writes** come from the routes and steps that start or follow up on an investigation, outside agent turns. There is **no agent tool**. `SubjectsService.upsertSubjects` (and `getSubjectsClient(request).upsertSubjects(conversationId, subjects)` on the start contract) validates the input, then for each subject writes the index and attaches it through the public attachment client (owner check first; `writeAndAttach`). A later write for a recorded subject replaces the fields it sends and keeps the rest; `slack` merges field by field, so a writer can add `status_message_ts` alone. An unchanged subject is not re-stamped.
- **Lookup**: `findConversationIdsBySubjects([{ type, id }])` returns the investigations (open or closed, unchecked for access) holding any of the subjects. Callers read the conversations to filter.
- **Race-safe start** (`claimSubjects`): claims live in a sibling index, `.kibana-investigation-claim`, one document per space and subject (`_id` = hash of `(spaceId, type, id)`), holding the claiming conversation id. A sibling index rather than a second document kind in the subject index keeps every subject index document an attachment document. A start claims every subject before creating the conversation, all or nothing, in a fixed order so overlapping starts contend for the same subject first. A subject held by another investigation returns `{ claimed: false, heldBy }`, and the claims this call made are handed over to that investigation (the caller follows up on it with all its subjects), so a concurrent start that read one of them is not pointed at the abandoned investigation. A narrow window remains between a claim and its hand-over, in which a concurrent start can still be told the abandoned id. A claim is held without a check for 2 minutes (the gap before its conversation exists); after that it is taken over when the caller's `isHolderOpen(conversationId)` says the holder is closed or gone. `heldBy` may name a conversation that does not exist yet, so a follow-up has to get or create it. Claim reads use the same `withTransientSearchRetry` as the attachment indexes, so the first start on a fresh cluster does not fail while the claim index is created.
- **Hidden in the chat** (`hiddenInConversation`, see above): the agent reads the subjects, the investigation overview shows them, the chat does not.
- The renderer shows one compact row per subject, the same in the details flyout and in the inline fallback: an icon for the type, the subject's name on one truncated line (alert → rule name; Slack thread → the question, else `#channel`; significant event and question → the summary), and under it "Trigger · Alert|Significant event|Slack|Question". The whole row is the link: an alert to its snapshot's `url` when that is safe, a Slack thread to `slack.permalink` in a new tab (HTTPS only); significant events and questions have no link. Reasons, statuses, and summaries beyond the name stay out of the row.
- Privilege: writes need `manage_investigations`; reads accept `read_investigations` or `manage_investigations`. The attachment types' `resolve` and `isStale` (all three entities) check the read privilege too, and then that the caller can read the document's conversation (a scoped `bulkGet`): they read by an origin the caller supplies, Agent Builder's public attachment route accepts an origin without data, and document ids are derived from the conversation id.

## Hypotheses

**Investigation hypotheses** are the candidate causes an investigation considered. They live in `.kibana-investigation-hypotheses`, one document per space and conversation (`_id` = hash of `(spaceId, conversationId)`), holding the full list (at most 50): `{ candidate, confidence (0..1), status: investigating | dismissed | confirmed, reason?, evidence?: Evidence[≤3] }`. Stored but not indexed.

- **The agent tool `agentic_investigations.set_hypotheses`** takes the full list on every call and replaces the stored one, so a hypothesis it leaves out is gone. It warns, without failing, when more than one hypothesis is `confirmed` (the warning text of Nightshift's progress report), and notes when the user removed the attachment. It requires `manage_investigations`, writes the index immediately, and adds or updates the `investigation_hypotheses` attachment through the run's attachment state.
- **Hidden in the chat** (`hiddenInConversation`, see above): the agent reads the hypotheses, the investigation overview shows them, the chat does not.
- The renderer lists the hypotheses in the agent's order with a status badge, the confidence, and the reason (Markdown). The details flyout also shows each hypothesis's evidence with `EvidenceView`; the inline render leaves it out.

## Investigations query API

An **investigation** is an Agent Builder conversation on the `investigation` template; its id is the conversation id. The query API joins the conversation (title, timestamps, agent, `metadata.status|severity|summary|verdict`) with the side indexes (subjects, impact, hypotheses), the conversation's live proposals, and whether it is in progress. Response types live in `common/investigations/investigation.ts` and are exported (types only) from `common`.

| Route (internal, version `1`) | Privilege | Returns |
| --- | --- | --- |
| `GET /internal/investigations/investigations/{id}` | `read_investigations` or `manage_investigations` | `Investigation`: the summary below plus `hypotheses?` and `proposals[]` |
| `GET /internal/investigations/investigations` | same | `{ results: InvestigationSummary[], pagination: { total, page, per_page } }` |
| `GET /internal/investigations/investigations/_severity_counts` | same | `{ low, medium, high, critical }` for the filtered set |
| `GET /internal/investigations/_privileges` | none (reports the caller's own) | `{ read, manage }`: the caller's investigation API privileges, see [Template UI and gating](#template-ui-and-gating) |

`InvestigationSummary` is `{ id, title, title_pending, created_at, updated_at, agent_id, metadata: { status, severity?, summary?, verdict? }, in_progress, subjects[], impact?, pending_proposal_count? }`. `title_pending` is true while Agent Builder has not generated the conversation's title yet (`isInvestigationTitlePending` in `common`: an empty title or Agent Builder's `New conversation` placeholder); Agent Builder generates it from the first round of a conversation created without a title. A pending title never matches `query`. `pending_proposal_count` counts the proposals awaiting a decision (pending, not superseded, deadline not passed), in one terms aggregation per page through `ProposalsService.countPendingByConversationIds`, and is absent without the `proposals` plugin or `read_proposals`. A missing `metadata.status` reads as `open`. Subjects and impact entities are returned in snake_case (`trigger_type`, `feature_id`, `stream_name`).

- **Filters** (list and counts, ANDed): `id` (investigation ids, one value or repeated, at most 100; how a page of cards reads its investigations in one call), `status` (`open`|`closed`), `severity` (`none` matches investigations without one; it is applied in memory), `subject_type`, and `subject_id` (each one value or repeated, at most 20), `in_progress` (`true`|`false`), `entity` (an impacted entity id or name, exact), `query` (case-insensitive; every word must appear in the title, summary, or verdict), `created_after` / `created_before` (ISO 8601). List only: `sort_field` (`created_at` default, `updated_at`, `severity`), `sort_order` (`desc` default), `page`, `per_page` (default 20, at most 100). Strings are bounded at 256 characters (subject ids at 512).
- **Two phases.** Id, subject, and entity filters start from the given ids or the side indexes, read as the internal user in the request's space, and only produce candidate conversation ids; `in_progress=true` starts from the in-progress set. Those candidates are read with the caller's `bulkGet`; without such a filter the candidates come from the caller's conversation `search` (template, status, severity, and dates in its KQL filter, sorted by the requested date). Either way only conversations the caller can read appear. The remaining filters, the severity sort, and paging run in memory over at most **1000 candidates** (`MAX_INVESTIGATION_CANDIDATES`); `page * per_page` may not exceed it, and `total` is capped by it. Only the returned page is hydrated.
- **Fresh cluster.** The conversation reads (`get`, `bulkGet`, `search`) and the proposals read go through `retryWhileShardUnavailable`, the retry `withTransientSearchRetry` uses: right after the first investigation creates the conversation index, its shard can be unassigned for a moment, and a read in that window is retried after 200, 400, and 800 ms instead of failing with a 500.
- **Removed attachments.** A subject, impact, or hypotheses document whose conversation attachment exists but is inactive (the user removed it) is hidden; a document that was never attached (written during an agent turn that has not ended) stays visible. `get` reads the conversation's attachments directly. List rows carry only active attachment ids, so for the documents on a page that are missing from their row, the list runs one conversation search on `attachment_id` (which matches inactive attachments too), in chunks of 50: a held id that is still not active was removed. Only a conversation with several such documents in one search is read in full. A permanently deleted attachment cannot be told from one never attached, so its document shows again. Subject and entity filters match on the index, so a removed document can still match a filter even though it is not returned.
- **In progress** is computed on every read, never stored: Agent Builder has a `scheduled` or `running` execution for the conversation (`agentBuilder.execution.findExecutions`, up to 1000; a `running` one whose heartbeat is older than 5 minutes is dropped). A failed lookup is logged and counts as not in progress.
- **Proposals** come from the `proposals` plugin (`excludeSuperseded`, at most 100) as `{ id, title, comment, status, impact, confidence, category?, created_at, decided_at? }`. They are empty when the plugin is absent or the caller lacks `read_proposals`.
- **In-process client**: `getInvestigationsClient(request)` on the start contract offers `get(id)`, `list(query)`, `severityCounts(filters)`, `findOpenBySubjects([{ type, id }])` (open investigations the caller can read that still hold one of the subjects, most recently updated first, at most 100) with the read privilege, and `deleteAllInSpace()` with `manage_investigations`. The delete removes every subject, claim, impact, and hypotheses document in the request's space; conversations belong to Agent Builder and are left alone.
- **Cross-space maintenance**: `deleteSubjectInvestigationDataAcrossSpaces()` on the start contract removes, in every space, the subjects, impact, and hypotheses of every investigation that has subjects, and every subject claim. It takes no request and runs as the internal user, so the caller authorizes it (for example a solution's maintenance task that deletes all of its investigations). Investigations without subjects keep their data, because the impact index is shared with solutions that only attach impact. Agent Builder has no cross-space delete, so conversations stay.

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
- **Overview tab.** Sections, each only when there is data: Subject(s) (the query API's subjects as compact rows, where several alerts collapse into one "N alerts" row that expands to them, each with its start time, then a solution's own subject attachments such as security alerts), What happened (`metadata.summary`), Impact (with evidence), Conclusion (`metadata.verdict`), Proposed actions, Investigation trace (hypotheses with evidence). The data comes from `GET /internal/investigations/investigations/{id}`, read again every 5 s while `in_progress` is true; when that read fails the tab shows what the conversation carries. The header shows the severity and, while an agent works on it, a running indicator.
- **Untitled investigations.** Until Agent Builder has titled an investigation (`title_pending`), the header (`renderTitle`) and the brief card name it after its first subject (an alert's rule name, the question, a Slack thread's question), or else "New investigation".
- **Brief card.** The `investigation` template registers a `briefCard`: severity, title, running dot, a two-line summary, the impacted entities, and the pending proposals count. It shows no subjects; only the overview lists them. Cards rendered in the same tick share one list call (`id` filter). The same presentational card is on the start contract as `InvestigationCard` for solutions that list investigations from the query API (for example a solution's landing page).
- **Icons.** The investigation template uses the solution-neutral `magnifyExclamation` (AlertZero used the security-specific `securitySignalDetected`) and the escalation template `warning`, kept from AlertZero.

The status and assignee signals and the shared query client in `public/` are module-level singletons. Solution pages must import them from `@kbn/agentic-investigations-plugin/public` so a change in the flyout reaches their queue views.

To see the template UI without an agent run, `scripts/nightshift_seed_investigations.ts` seeds synthetic investigations (a completed alert investigation with impact, hypotheses, and proposed actions, a completed question, and an untitled one that was just started) and prints a link to each conversation in Agent Builder. Run it with `node -r @kbn/setup-node-env x-pack/platform/plugins/shared/agentic_investigations/scripts/nightshift_seed_investigations.ts` (`--help` for the connection flags, `--clean` to remove the seeds). Proposed actions need `xpack.proposals.enabled: true`.

## Index naming

`.kibana-investigation-impact`, `.kibana-investigation-subject`, `.kibana-investigation-claim`, and `.kibana-investigation-hypotheses` are permanent. `.kibana*` is already granted to the `kibana_system` role, so these indexes need no Elasticsearch-side system index registration — a dedicated prefix such as `.investigation-impact` would. `anonymization` ships `.kibana-anonymization-profiles` on the same reasoning. Each entity gets its own index rather than one index discriminated by a type field. No index name may be another's name followed by `-`: the storage adapter's index template matches `<name>-*`, so `.kibana-investigation-subject` would also match a `.kibana-investigation-subject-claim` index, and Elasticsearch refuses two same-priority templates with overlapping patterns. `server/index_names.test.ts` checks this.

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
4. Copies the intersection of the investigation's metadata and those declared fields, **excluding `status`** (so the escalation opens with `status: 'open'` from the template default) and **excluding `linked_investigations`** (set separately to `[linked_investigation_id]`). This filter is what prevents a `400` from `workflow_execution_ids`, which is declared on the investigation template but not on the escalation template.
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

## Investigation workflow executions

The shared `investigation` template stores an ordered `workflow_execution_ids` text array.
Seed it with the creating workflow's execution ID in `ai.conversation.create` metadata:

```yaml
metadata:
  workflow_execution_ids: ["{{ execution.id }}"]
```

When another workflow takes over an existing investigation, append its execution ID:

```yaml
- name: append_workflow_execution
  type: investigations.appendWorkflowExecutionId
  with:
    conversationId: "{{ inputs.conversationId }}"
    workflowExecutionId: "{{ execution.id }}"
```

The step requires conversation `converse` access and the `investigation` template. It returns
`{ workflowExecutionId }`, preserves existing order, and skips the write when the ID is already
present. A missing list is initialized. Appends assume sequential handoffs; concurrent callers
can overwrite each other's additions.
