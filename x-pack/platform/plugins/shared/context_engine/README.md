# Context Engine

Server-side plugin for the Context Engine.

## AI Indices API

AI Indices attach a logical name to an existing user index pattern or data
stream. AI Index records are stored in a hidden Kibana system index
(`.contextengine-ai-indices`), separate from the backing data.

| Method   | Path                                                            | Description                          |
| -------- | --------------------------------------------------------------- | ------------------------------------ |
| `PUT`    | `/api/context_engine/ai_index/{id}`                               | Create or update an AI Index         |
| `GET`    | `/api/context_engine/ai_index/{id}`                               | Get an AI Index by id                |
| `GET`    | `/api/context_engine/ai_index`                                    | List AI Indices available to the caller (max 100) |
| `POST`   | `/api/context_engine/ai_index/_query`                             | Run ES\|QL against AI Indices        |
| `GET`    | `/api/context_engine/ai_index/{id}/_describe`                     | Describe an AI Index for querying    |
| `DELETE` | `/api/context_engine/ai_index/{id}`                               | Delete an AI Index                   |
| `PUT`    | `/internal/context_engine/ai_index/{id}/feedback_analysis`        | Update the feedback analysis config  |

Notes:

- The API is gated behind the `contextEngine:enabled` advanced setting
  (disabled by default). All routes return 404 while the setting is off.
- The `contextEngine:feedbackLoopEnabled` (global) advanced setting gates the
  feedback loop (disabled by default): the always-scheduled hourly
  `contextEngine:signalGenerator` background task turns Agent Builder trace
  spans into per-space signals, and no-ops while the setting is off.
- The backing store is set via `dest`, an object of the form
  `{ "type": "data_stream" | "index", "value": "<data stream or index>" }`.
  `dest.value` must match `dest.type`. Every
  expression in `dest.value` must start with `ai-index-ds-` for data streams or
  `ai-index-idx-` for indices (e.g. `ai-index-ds-foo`, `ai-index-idx-foo*`);
  system indices are not allowed.
- `automations` is an array of `{ "type": "workflow", "value": "<name>" }`
  objects. Required, may be empty.
- `sources` is an array whose entries are one of:
  - `{ "type": "esql", "value": "<ES|QL query>" }`, or
  - `{ "type": "connector", "value": "<connector id>" }` — an action-connector
    instance id (from Stack Management → Connectors). See
    [Connector sources](#connector-sources) below.
  Required, may be empty.
- Deleting an AI Index deletes **only** the AI Index entry. Backing indices
  are left untouched and must be removed with the Delete index API if desired.
- `feedback_analysis` configures this index's feedback loop. See
  [Feedback analysis configuration](#feedback-analysis-configuration) below.

## Listing AI Indices

`GET /api/context_engine/ai_index` returns the AI Indices the caller can use
in the current space. AI Index records are stored per space, so the list
starts from the entries registered in the request's space (from the URL:
`/s/{spaceId}/api/...`, default space otherwise). An entry is then listed
when the caller can read its backing index, including when that index is
empty or does not exist yet. It is not listed when the caller lacks `read` on
the backing index.

To decide, Kibana runs one small search per AI Index as the current user, in
a single `msearch`. Any error, timeout or failed shard on that search hides
the entry. The search deliberately does not set `ignore_unavailable`: with it,
an index the caller cannot read would look empty and be listed anyway. The
agent prompt's AI-index catalog uses the same rule.

## Querying AI Indices

`POST /api/context_engine/ai_index/_query` runs caller-supplied ES|QL as the
current user. Body: `{ query, params?, limit? }`. Two things are server-owned
and cannot be overridden:

- **Space filter.** Documents are visible when they carry no
  `permissions.kibana.privileges` element (public), or when one is scoped to
  the request's space or to `*`. The space comes from the request URL
  (`/s/{spaceId}/api/...`, default space otherwise), so a caller cannot read
  another space's documents on any path. `contextEngine:enabled` is a per-space
  setting, so the route 404s in any space where it is off.
- **Row limit.** `limit` defaults to 100 and cannot exceed 1000. A trailing
  `LIMIT` in the query is capped to it; otherwise one is appended.

The query is otherwise a pass-through: it decides which indices it reads
(`FROM ai-index-idx-a,ai-index-ds-b` and `FROM ai-index-*` both work) and
Elasticsearch index privileges bound what it can reach. Elasticsearch 4xx
errors (bad ES|QL, missing index privilege) are returned with their status.

## Describing AI Indices

`GET /api/context_engine/ai_index/{id}/_describe` is the step before writing a
query. It returns `{ response: string }`: a free-form text context block meant
to be handed to an agent as-is, not parsed.

```
AI index: sales-knowledge
Curated sales knowledge.
Query with ES|QL against: ai-index-idx-sales-knowledge

Fields
@timestamp: date, searchable, aggregatable
content.semantic: semantic_text, searchable
title: text, searchable
type: keyword, searchable, aggregatable

Semantic fields
content.semantic

Knowledge item types
"document": 41
"detection rule": 3

Tags
"billing": 12

Example queries (adapt field names for non-canonical indices)

Full text search, lexical and semantic fused together (?query)
FROM ai-index-idx-sales-knowledge METADATA _id, _index, _score
| FORK
    ( WHERE MATCH(title, ?query) OR ... | SORT _score DESC | LIMIT 20 )
    ( WHERE MATCH(title.semantic, ?query) OR ... | SORT _score DESC | LIMIT 20 )
| FUSE
...

Filter by knowledge item type and tag (?type, ?tag; tags is multi-valued, so MATCH)
...

Count by type
...
```

- The `Query with ES|QL against` line is `dest.value`, the string to put after
  `FROM`.
- `Fields` lists every mapped field, mapping-defined runtime fields included
  (`path: type`, then `searchable` and/or `aggregatable` when true), one per
  line, sorted by path and capped at 500;
  the heading becomes `Fields (showing 500 of N)` when capped. Types come from
  `_mapping`; `searchable`/`aggregatable` from `_field_caps`. A path mapped to
  different types across the matched indices is reported as `conflict`.
- `Semantic fields` lists the searchable `semantic_text` fields among those
  shown, detected from the mapping type. Omitted when there are none.
- `Knowledge item types` and `Tags` show the top 20 `type` / `tags` values by
  document count in the current space, one `"value": count` per line. Each
  section is omitted unless its field is an aggregatable `keyword` — always the
  case on canonical KI indices, but a custom index that maps `type` / `tags` as
  `text`, or inconsistently across a pattern, gets no counts. One `terms`
  aggregation backs both; it errors rather than return undercounts if a shard
  fails. Both sections are also omitted when the caller lacks `read` on the
  backing indices; the rest of the block still renders.
- `Example queries` are three fixed ES|QL shapes written for the canonical KI
  schema (`title`, `description`, `content`, their `.semantic` multi-fields,
  `type`, `tags`) with only the `FROM` target substituted. They use named
  parameters (`?query`; `?type` and `?tag`) meant for `_query`'s `params`. They
  run as-is on canonical indices; for other mappings the agent adapts field
  names from `Fields`.

Describe runs no ES|QL. It issues `_mapping` and `_field_caps` (both needed:
`_field_caps` reports `semantic_text` as `text`) plus the one aggregation, all
as the current user. 404 when the AI Index is not registered; Elasticsearch 4xx
from `_mapping` / `_field_caps` (missing `view_index_metadata`) is returned
with its status. The aggregation is the exception: its 403 (missing `read`)
drops the counts sections instead. Each `_mapping` /
`_field_caps` response is capped at 20 MB before the field cap applies; a
target broad enough to exceed it returns 400.

### Privileges

`contextEngine:read` grants the routes; it grants **no** Elasticsearch index
privileges. Callers also need, on every backing index (`ai-index-*`):

- `read` to be listed. Without it the AI Index is left out of the list; there
  is no error. (The one case that looks different is a wildcard `dest.value`
  matching nothing the caller can read: Elasticsearch reports it as
  "no such index", so it shows up as an empty AI Index. See
  [Listing AI Indices](#listing-ai-indices));
- `read` to query, or Elasticsearch returns 403;
- `view_index_metadata` to describe (`_mapping` and `_field_caps`), or
  Elasticsearch returns 403. The counts aggregation also needs `read`; without
  it the two counts sections are omitted and the rest of the block is returned.

Kibana adds only the space filter. For the built-in SML index
(`ai-index-idx-sml-data`), Elasticsearch additionally applies implicit
document-level security mirroring Kibana object privileges, so callers only see
knowledge indicators for dashboards, rules or connectors they could open. Custom
AI Indices get the space filter alone; they are queried like any other index.

## Agent Builder tools

The `contextEngineAgentBuilder` plugin adds three read-only tools under
`platform.context_engine.*`. Each one runs the same code as the matching route
above, as the same user, so a tool and its route always return the same thing:

| Tool                | Route                    | Result                                                                            |
| ------------------- | ------------------------ | --------------------------------------------------------------------------------- |
| `list_ai_indices`   | `GET …/ai_index`         | `{ id, esql_target, description, managed, assigned_to_agent? }` per listed entry  |
| `describe_ai_index` | `GET …/{id}/_describe`   | `{ response }`, the text block describing the index                               |
| `query_ai_indices`  | `POST …/ai_index/_query` | `{ columns, values }`                                                             |

`assigned_to_agent` only appears when an agent calls the tool during a chat. It
says whether that agent is set up with the index. Over MCP there is no agent, so
the field is missing.

`query_ai_indices` has no `time_range` or `filter` parameters. Time constraints
go in the ES|QL itself or in `params`. Its rows come back as a plain `other`
result, not `esql_results`. This is deliberate. In chat, an `esql_results`
result gets a "See in Discover" link that opens the raw query in Discover, and
when the agent asks for a chart the UI runs the raw query again in Lens. Both
run the query as written, without the space filter and row limit the server
adds, so they could show documents from other spaces.

To see the tools, a caller needs Agent Builder's `read` privilege; that is the
only check the MCP server does. To use them, the caller also needs Context
Engine's `read` privilege. Every tool checks this itself and returns an error
result when it is missing.

The space always comes from the request; it cannot be passed as a parameter. In
Agent Builder chat, it is the agent's space. Over MCP, it is the space in the
URL the MCP server is served from (`/s/{spaceId}/api/agent_builder/mcp`).

## Feedback analysis configuration

Signal *generation* is global — one background task, one advanced setting.
Signal *analysis* is per AI Index, because the improvement it proposes targets
that index's KI pipeline. The configuration therefore lives on the AI Index
record:

```json
{
  "enabled": true,
  "agent_id": "my-analysis-agent",
  "schedule": { "interval": "24h" },
  "signal_time_range": { "type": "relative", "from": "now-30d" },
  "signal_filter": "tags: query_error",
  "allowed_actions": ["add_ki", "edit_ki"]
}
```

- `enabled` is *desired* state, reconciled onto the scheduler after the write.
  Enabling it schedules the analysis under the credentials of whoever asked, so
  the scheduler stays authoritative for whether analysis is really running.
- `agent_id` is the Agent Builder agent that analyzes this index's signals. It
  is also the agent the interactive "Analyze & improve" hand-off opens.
- `schedule.interval` defaults to `24h` and must be at least 15 minutes. Every
  run is an LLM analysis over a window of signals, so the interval is a cost
  control rather than only a scheduling detail.
- `signal_time_range` defaults to `now-30d` and is a **read filter only**: it
  narrows which signals a run selects over, and never deletes or retains
  them. A `relative` window must cover at least one schedule interval, or
  signals arriving between runs would never be analyzed. Overlapping windows
  are harmless, because re-proposals are de-duplicated downstream. An
  `absolute` window is an open-ended "since this date", so it is always
  accepted.
- `signal_filter` is KQL narrowing which signals a run analyzes, applied on top
  of `signal_time_range`. It is validated as KQL when written, so a typo cannot
  silently disable every scheduled run. It belongs here rather than in the
  generation pipeline: generation is global and stateful, so dropping a signal
  at write time would drop it for every consumer, permanently, whereas a read
  filter is per index and reversible.
- `allowed_actions` defaults to the full [improvement action
  taxonomy](common/http_api/improvement_actions.ts) and bounds what the
  analysis may propose for this index. Deployments routinely want an agent that
  may suggest KIs but never touch workflows, and an agent asked in a prompt to
  avoid an action is not prevented from taking it — so the allowed set is
  config that the apply step enforces, not prompt text. An empty list is
  observe-only: the run still reports what it found but may not propose a
  change.

The dedicated `PUT .../feedback_analysis` route replaces only this block,
leaving the rest of the record untouched. Unlike a full AI Index replace it is
permitted on **managed** AI Indices: their definition is owned by the plugin
that registers them, but which agent analyzes them and how often is operator
preference. Without that carve-out, the indices that ship by default would be
the only ones that could never be analyzed.

## Connector sources

A `connector` source references an action-connector instance whose type opts
in to the Context Engine — i.e. its spec declares `contextEngine` in
`supportedFeatureIds`. The value stored on the source is the connector
**instance id** (not the connector type). Human-readable names are resolved
at render time via the Actions API, so renaming a connector in Stack
Management does not leave a stale label on the AI Index.

Which connector types are eligible is derived at runtime from the Actions
plugin's connector-types registry:

```
GET /api/actions/connector_types?feature_id=contextEngine
```

To make a new connector eligible, add `'contextEngine'` to the
`supportedFeatureIds` list on the connector spec (in `kbn-connector-specs`).
No changes to the Context Engine plugin are required.

## Signals

Signals are observations classified from Agent Builder traces and stored in the
per-space `context-engine-signals-<space>` index. The AI Index detail page
renders a read-only **Signals** panel: a preaggregated grouped-by-tag list, a
drill-down into a group's individual signals (each with a trace waterfall in a
flyout), and an "Analyze & improve" button that opens Agent Builder when a chat
opener has been registered.

The panel is backed by two internal, read-only routes (reads run as the current
user against the current space's signals index):

| Method | Path                                      | Description                                            |
| ------ | ----------------------------------------- | ------------------------------------------------------ |
| `GET`  | `/internal/context_engine/signals/groups` | Signals grouped by tag (a terms aggregation over tags) |
| `GET`  | `/internal/context_engine/signals`        | The individual signals for a `tag` (paginated)         |

Both routes are gated by the same `contextEngine:enabled` advanced setting as
the AI Index API (they return 404 while it is off).

### Self-referential exclusion

The feedback loop does not generate signals about itself. Two filters exclude
its own reads.

**By target index.** `server/tasks/self_referential.ts` recognizes reads of the
loop's own observability surface: the `context-engine-` user namespace (signals,
improvements), the `.contextengine-` system namespace (the AI index registry),
and `traces-agent_builder.otel-*`. `build` in `server/tasks/transform.ts` drops
those spans before round context is computed, so an analysis round emits no
signals and does not affect the `looped` / `fell_back_to_raw` counters of the
round it shares a trace with. Matching is on namespace prefixes. A bare `FROM *`
is not treated as self-referential.

**By round.** `generate_signals` drops every span whose round loaded the
`analyze-and-improve` skill, identified from the round's `load_skill` span. The
lookup is scoped by `trace_id`, so a round whose skill load and queries fall in
different batches is still excluded. The watermark advances over the dropped
rounds.

The round filter depends on the agent calling `load_skill`; an agent carrying
the same guidance in its instructions goes unmarked.

## Improvements

An **improvement** is a proposed change to one AI Index's KI pipeline, derived
from that index's signals. They live in the `context-engine-improvements` index,
exposed to the server as
`ContextEnginePluginStart.getImprovementsService(esClient, spaceId)` and written
by an analysis run (see [Feedback analysis runs](#feedback-analysis-runs)). The
review UI that applies them comes later.

Improvements are **scoped to the space of the AI Index they target**, which is
the space the service is constructed for. Every read filters on it and every
write stamps it, so `list`, `get`, `transition` and `deleteByAiIndex` cannot
reach another space's rows, and the same AI Index id in two spaces keeps two
independent sets of improvements. Documents written before the store was
space-scoped carry no `space` and are treated as belonging to the default
space.

The lifecycle is an **append log** rather than a mutable status field, so the
record of what the loop did to a user's index survives every transition:

- `improvement_id` is the stable lineage key, derived idempotently from
  `hash(space + ai_index_id + change_fingerprint)`. The fingerprint describes the
  proposed fix (e.g. `remove_workflow:<workflow_id>`) and contains no free text,
  so a re-run over the same latent problem appends a revision instead of
  creating a near-duplicate row.
- `revision_id` is the ES `_id`; every write, including APPLY / REJECT, appends
  a revision carrying `previous_revision_id`.
- `latest: true` marks the head of each lineage, and `list`/`get` filter on it.
  A boolean flag rather than `collapse`, because `collapse` makes
  `track_total_hits` count hits instead of groups and the review UI needs an
  exact total to paginate.
- Transitions are serialized by retiring the current head under
  `if_seq_no`/`if_primary_term` before appending. A reviewer who loses that race
  appends nothing and gets a conflict, so the log can never hold both an
  `applied` and a `rejected` head for the same improvement.
- A batch `write` skips only the lineages that lost that race, rather than
  abandoning the batch. A bulk applies each operation independently, so the
  other heads are already retired by then; dropping them would leave those
  lineages with no `latest` revision at all.
- OCC only guards a lineage that already has a head. The first revision of a
  brand-new `improvement_id` has nothing to guard it, so two runs writing the
  same new improvement concurrently can both append a head. Analysis runs for
  one AI Index are therefore expected to be serialized. Should it happen anyway,
  it is self-healing rather than permanent: a head lookup returns every head of
  a lineage and the next `write` or `transition` retires all of them, so the
  lineage converges back to a single head.
- `failed` is a status, not an error return: an approval whose apply step errors
  stays visible and retryable, with the reason on `resolution.error`.
- A rejection keeps the reviewer's rationale on `resolution.reason`, so the next
  run knows a fix was considered and turned down rather than re-proposing it.

### Privileges

`context-engine-improvements` is a **user-owned index**, and needs no grant on
the `kibana_system` role. The work is split so that no single actor needs both
halves:

- **Kibana** installs the `context-engine-improvements` index template at start,
  which needs only the cluster-level `manage_index_templates` it already holds.
- **The caller** creates the index on the first write, and Elasticsearch applies
  the template's mappings to it. Every subsequent read and write is authorized
  against that caller too, so `getImprovementsService` takes the client to act
  through, alongside the space to scope to, and callers pass a request-scoped
  client.

This is what keeps the store off the internal user. Applying mappings lazily per
operation instead — the usual storage-adapter pattern — would need `manage` on
the index from whoever performed it, including anyone merely reading the review
UI. Writers need `create_index` plus `write`; readers need `read`.

## Feedback analysis runs

A **run** is one pass of the loop over a single AI index: read that index's
signals, work out what would make it serve agents better, and record the
proposals in the improvements store. Runs are scheduled per AI index by
`feedback_analysis` (see [Feedback analysis configuration](#feedback-analysis-configuration)).

| Step                                | Description              |
| ----------------------------------- | ------------------------ |
| `context-engine.getFeedbackContext` | Everything one run reads |
| `context-engine.recordImprovements` | Record what a run proposed |

Both are workflow steps, not HTTP routes, and both reach plugin services
directly: the signal selection code and the improvements service, whose write is
a read-modify-write under optimistic concurrency control.

Both steps require the `context_engine:feedbackLoop` advanced setting and act as
the workflow owner. A scheduled run is a managed workflow owned by a real user;
nothing here reads or writes as Kibana.

### The runner

The runner is the `system-context-engine-feedback-analysis` managed workflow,
installed once per AI index with the index id and interval templated in. Its
shape is three steps: fetch the context, run the index's agent against it with
a forced output schema, record the result.

The briefing is handed over as the agent's `message`. It instructs the agent to
load the `analyze-and-improve` skill before reading anything, so the run carries
the analysis playbook whichever agent the index is configured with.

The briefing does not carry prior proposals, only how many there are and where
they stand. A run cannot be handed the history that matters to it, because until
it has read the signals it does not know what it is about to suggest, and an
index accumulates more targets than fit in a prompt. So the briefing hands over
an ES|QL query instead: once the run knows what it wants to change, it reads that
target's lineage out of `context-engine-improvements` itself, filtering
`ai_index_id` and `latest`, then `target.ki_id`, `target.workflow_id` or
`target.subject`. This is why `resolution` is mapped where `payload` is not —
ES|QL can only select mapped fields, and a rejection without `resolution.reason`
tells the run nothing it can act on. The query lives in the briefing rather than
only in the skill because the briefing is the one part of a run that cannot be
replaced by configuring a different agent.

The `platform.context_engine.ai_index` attachment is not used: it carries the
`save_automation` tool and instructions to ask the user questions, which belong
to the interactive setup conversation.

The `ai.agent` step runs under the workflow owner's identity — the user who
turned analysis on. The conversation it creates is private to that user, Agent
Builder's default: a run reads the index's data under the owner's privileges,
and its rounds quote what it read.

The instance is installed in the space of the AI index it analyzes, so enable,
disable and delete address that space's schedule and no other. The workflow
document id has to carry the space itself: it is the ES `_id` and is unique per
index regardless of the document's `spaceId`, so suffixing it with the AI index
id alone would point two spaces holding the same id at one shared document. The
space is folded in as a hash rather than appended, because space ids and AI
index ids both allow hyphens (`<space>-<aiIndexId>` would make `('a-b', 'c')`
and `('a', 'b-c')` collide) and space ids have no length cap while the `_id`
does.

The workflow carries a `concurrency` guard keyed on the AI index with
`strategy: drop`, so two runs for one index never overlap.

Turning analysis on installs the instance and then enables it; turning it off
uninstalls it. Both steps matter, because installing a managed workflow only
writes its document: enabling is what registers the scheduled trigger with Task
Manager, under an API key minted from the request that enabled it. That is where
the owner identity above comes from, and why the template ships `enabled: false`
— an installed-but-never-enabled instance would look configured and never run.
Disabling needs no such care, since uninstalling drops the trigger along with the
document.

Enabling an already-enabled instance re-mints that key, so every write of the
configuration reconciles rather than only the writes that change it. The schedule
then belongs to whoever saved it last instead of expiring with the account that
first turned it on.

The definition is `enablement: 'restorable'` rather than `'enforced'` for the
same reason: enforced enablement reapplies the template's `enabled` on every
managed update, which would unschedule a running instance the next time this
definition ships a new version.

Changing the interval reinstalls, since a scheduled trigger's interval is written
into the YAML at install time. Everything else about a run — which agent, which
signals, which actions — is read per run through the context step.

Reconciliation is best-effort and happens after the configuration is stored. A
failure to reconcile does not fail the configuration write.

### Selecting an index's signals

A run selects over everything `signal_time_range` and `signal_filter` admit,
with no restriction by signal type. A signal's type governs how it is
*attributed* to an AI index. A signal is admitted by any of three paths:

1. **Retrieval.** A `ki_retrieval` tool call names the KI index it read in
   `data.target_index`, matched exactly against the AI index's `dest.value`.
2. **Fallback.** A `raw_access` tool call names no KI index. It is attributed
   two ways: by target, against the raw indices the index's own ES|QL sources
   read; and by conversation, against conversations tied to the index by the
   first pass.
3. **Everything else.** A signal that is not a tool call carries no `query_kind`
   or `target_index`, so the window and the index's `signal_filter` are what
   scope it. It reaches the run's total but forms no pattern, since patterns are
   keyed on fields it does not have.

**Only the AI index's own space is read.** Signals live one index per space, so
a run reads `context-engine-signals-<space>` for the space its AI index belongs
to and nothing else, which keeps an improvement's evidence inside the space its
reviewer can open. The space is recorded on each improvement's
`provenance.signal_spaces`.

Signals are folded into ranked patterns — grouped by tag, target index and tool,
and scored by frequency weighted by tag. The grouping is a `multi_terms`
aggregation over the whole window, so a pattern's count is the number of signals
that occurred, not the number a run read. Each bucket carries its own `top_hits`,
so the example query and provenance ids attached to a pattern are drawn from the
signals in that pattern: a group that has a count always has evidence to go with
it. No documents are read outside the aggregation.

Bucketing is on the multi-valued `tags` field, so a signal tagged both
`query_error` and `coverage_gap` counts in both patterns, and an untagged signal
produces no bucket. The evidence hits arrive newest first, but an errored signal
is preferred as the example where the bucket has one, since a failing query
describes a pattern better than a successful one.

A run happens only when there are patterns, not merely signals.

### What a run may propose

The run answers with structured output. Its schema is built from the index's
`allowed_actions`, narrowing the `action` enum to what is permitted, or omitting
the improvements array for an observe-only index. The policy is enforced again
on write, re-read from the index.

The server derives each `improvement_id` from the action and its target; a run
cannot name its own.

A bad proposal is skipped, not fatal. Every rejection comes back as a `skipped`
entry with a reason: `invalid`, `action_not_allowed`, `duplicate`, `conflict`,
or `limit_exceeded`.

