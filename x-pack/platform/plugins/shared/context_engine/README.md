# Context Engine

Server-side plugin for the Context Engine.

## AI Indices API

AI indices attach a logical name to a single user index or data stream. AI
index records are stored in a hidden Kibana system index
(`.contextengine-ai-indices`), separate from the backing data.

| Method   | Path                                                            | Description                          |
| -------- | --------------------------------------------------------------- | ------------------------------------ |
| `PUT`    | `/api/context_engine/ai_index/{id}`                               | Create or update an AI index         |
| `GET`    | `/api/context_engine/ai_index/{id}`                               | Get an AI index by id                |
| `GET`    | `/api/context_engine/ai_index`                                    | List AI indices (max 100)            |
| `POST`   | `/api/context_engine/ai_index/_query`                             | Run ES\|QL against AI indices        |
| `GET`    | `/api/context_engine/ai_index/{id}/_describe`                     | Describe an AI index for querying    |
| `DELETE` | `/api/context_engine/ai_index/{id}`                               | Delete an AI index                   |
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
  `dest.value` must match `dest.type` and name a single data stream or index;
  wildcards and comma-separated lists are rejected. It must start with
  `ai-index-ds-` for data streams or `ai-index-idx-` for indices (e.g.
  `ai-index-ds-foo`, `ai-index-idx-foo`), followed by a valid AI index id;
  system indices are not allowed.
- `automations` is an array of `{ "type": "workflow", "value": "<name>" }`
  objects. Required, may be empty.
- `sources` is an array whose entries are one of:
  - `{ "type": "esql", "value": "<ES|QL query>" }`, or
  - `{ "type": "connector", "value": "<connector id>" }` — an action-connector
    instance id (from Stack Management → Connectors). See
    [Connector sources](#connector-sources) below.
  Required, may be empty.
- Deleting an AI index deletes **only** the AI index entry. Backing indices
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
current user. Body: `{ query, params?, limit? }`. Three things are server-owned
and cannot be overridden:

- **Lifecycle filter.** A query that reads a registered AI Index's backing
  store (by name, pattern, or as one of several `FROM` targets) gets the
  knowledge indicator lifecycle pipeline inserted after `FROM`: only
  indicators whose `governance.lifecycle.status` is unset or `active` and
  whose `expires_at` is unset or in the future are returned, and
  `governance.*` is dropped from the result. A top-level `WHERE` command on a
  lifecycle field switches off that filter: `WHERE expires_at < NOW()` the
  expiry filter, `WHERE governance.lifecycle.status == "deleted"` the status
  filter. Naming a lifecycle field in `KEEP`, `SORT` or `EVAL`, or in a
  `WHERE` inside a `FORK` branch, leaves both filters on, and naming any
  `governance.*` field keeps `governance` in the result. When a
  data stream is read, only the newest revision of each `id` per
  target is considered in every case (`METADATA _id, _index` are added when
  missing). An index outside the registry is read as-is on its own; in a query
  that also reads a registered dest, the pipeline applies to every row.
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
AI-index registry ID: sales-knowledge
Curated sales knowledge.
Backing Elasticsearch target (use only in ES|QL queries): ai-index-idx-sales-knowledge

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
| WHERE governance.lifecycle.status IS NULL OR governance.lifecycle.status == "active"
| WHERE expires_at IS NULL OR expires_at > NOW()
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

- The `Backing Elasticsearch target` line is `dest.value`, the string to put
  after `FROM`.
- `Fields` lists every mapped field, mapping-defined runtime fields included
  (`path: type`, then `searchable` and/or `aggregatable` when true), one per
  line, sorted by path and capped at 500;
  the heading becomes `Fields (showing 500 of N)` when capped. Types come from
  `_mapping`; `searchable`/`aggregatable` from `_field_caps`. A path mapped to
  different types across the matched indices is reported as `conflict`.
- `Semantic fields` lists the searchable `semantic_text` fields among those
  shown, detected from the mapping type. Omitted when there are none.
- `Knowledge item types` and `Tags` show the top 20 `type` / `tags` values by
  document count in the current space, active and unexpired only, one
  `"value": count` per line. Each
  section is omitted unless its field is an aggregatable `keyword` — always the
  case on canonical KI indices, but a custom index that maps `type` / `tags` as
  `text`, or inconsistently across a pattern, gets no counts. One ES|QL query
  per field backs both, through the same lifecycle pipeline as `_query`. Both
  sections are also omitted when the caller lacks `read` on the backing
  indices; the rest of the block still renders.
- `Example queries` are three fixed ES|QL shapes written for the canonical KI
  schema (`title`, `description`, `content`, their `.semantic` multi-fields,
  `type`, `tags`) with only the `FROM` target substituted. Each opens with the
  lifecycle pipeline for the dest type, so the filters the query API would add
  are visible and the same when run elsewhere. They use named
  parameters (`?query`; `?type` and `?tag`) meant for `_query`'s `params`. They
  run as-is on canonical indices; for other mappings the agent adapts field
  names from `Fields`.

Describe issues `_mapping` and `_field_caps` (both needed:
`_field_caps` reports `semantic_text` as `text`) plus the count queries, all
as the current user. 404 when the AI Index is not registered; Elasticsearch 4xx
from `_mapping` / `_field_caps` (missing `view_index_metadata`) is returned
with its status. The count queries are the exception: their 403 (missing `read`)
drops the counts sections instead. Each `_mapping` /
`_field_caps` response is capped at 20 MB before the field cap applies; a
target broad enough to exceed it returns 400.

### Privileges

`contextEngine:read` grants the routes; it grants **no** Elasticsearch index
privileges. Callers also need, on every backing index (`ai-index-*`):

- `read` to be listed. Without it the AI Index is left out of the list; there
  is no error;
- `read` to query, or Elasticsearch returns 403;
- `view_index_metadata` to describe (`_mapping` and `_field_caps`), or
  Elasticsearch returns 403. The counts aggregation also needs `read`; without
  it the two counts sections are omitted and the rest of the block is returned;
- `read` and `write` to create, update, or delete a knowledge indicator.

Two things decide what a caller can see: the space filter Kibana adds, and the
caller's own Elasticsearch permissions on the backing indices. Nothing checks
whether the caller could open the Kibana object a knowledge indicator describes.
That matters for the built-in SML index (`ai-index-idx-sml-data`): anyone with
Elasticsearch `read` on it may see knowledge indicators for dashboards, rules or
connectors they cannot open in Kibana. This is by design; the Elastic AI Index
is queried like any other index.

## Agent Builder tools

The `contextEngineAgentBuilder` plugin adds three read-only tools under
`platform.context_engine.*`. Each one runs the same code as the matching route
above, as the same user, so a tool and its route always return the same thing:

| Tool                | Route                                             | Result                                                                            |
| ------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------- |
| `list_ai_indices`   | `GET /api/context_engine/ai_index`                | `{ id, esql_target, description, managed, assigned_to_agent? }` per listed entry  |
| `describe_ai_index` | `GET /api/context_engine/ai_index/{id}/_describe` | `{ response }`, the text block describing the index                               |
| `query_ai_indices`  | `POST /api/context_engine/ai_index/_query`        | `{ columns, values }`                                                             |

`assigned_to_agent` is only set when an Agent Builder agent calls the tool. It
says whether that agent is configured with the index. Any other caller, such as
an MCP client, does not get the field.

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

In Agent Builder chat, any agent with at least one AI Index gets these three
tools automatically (while the `aiIndices` experimental feature is on). Its
system prompt tells it to list, then describe, then query, and leaves space
scoping to `query_ai_indices` rather than handing the agent a filter to copy.
The `ki-retrieval` skill teaches the same steps with the same tools.

The space always comes from the request; it cannot be passed as a parameter. In
Agent Builder chat, it is the agent's space. Over MCP, it is the space in the
URL the MCP server is served from: `/api/agent_builder/mcp` is the default
space and `/s/{spaceId}/api/agent_builder/mcp` is another space.

## Feedback analysis configuration

Signal *generation* is global — one background task, one advanced setting.
Signal *analysis* is per AI index, because the improvement it proposes targets
that index's KI pipeline. The configuration therefore lives on the AI index
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
  config that the run enforces when it records, not prompt text. An empty list is
  observe-only: the run still reports what it found but may not propose a
  change.

Only `enabled` is exposed in the UI. Every other field is a per-index override
of something that already has a server-side default, so the detail page sets
none of them and an index wanting different values is configured through this
route.

The dedicated `PUT .../feedback_analysis` route replaces only this block,
leaving the rest of the record untouched. Unlike a full AI index replace it is
permitted on **managed** AI indices: their definition is owned by the plugin
that registers them, but which agent analyzes them and how often is operator
preference. Without that carve-out, the indices that ship by default would be
the only ones that could never be analyzed.

## Connector sources

A `connector` source references an action-connector instance whose type opts
in to the Context Engine — i.e. its spec declares `contextEngine` in
`supportedFeatureIds`. The value stored on the source is the connector
**instance id** (not the connector type). Human-readable names are resolved
at render time via the Actions API, so renaming a connector in Stack
Management does not leave a stale label on the AI index.

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
per-space `context-engine-signals-<space>` index.

They have no panel on the AI index detail page. A `SignalsPanel` component
exists — a grouped-by-tag list, a drill-down into a group's individual signals
with a trace waterfall per signal, and an "Analyze & improve" button — but
nothing renders it: the suggestions they would evidence are shown in the panel
they would change instead (see [Improvements](#improvements)).

Its routes are still served — two internal, read-only ones, where reads run as
the current user against the current space's signals index:

| Method | Path                                      | Description                                            |
| ------ | ----------------------------------------- | ------------------------------------------------------ |
| `GET`  | `/internal/context_engine/signals/groups` | Signals grouped by tag (a terms aggregation over tags) |
| `GET`  | `/internal/context_engine/signals`        | The individual signals for a `tag` (paginated)         |

Both routes are gated by the same `contextEngine:enabled` advanced setting as
the AI index API (they return 404 while it is off).

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

## Session events

Harnesses such as Agent Builder save what happens in an agent session over HTTP. The route
is public and experimental:

```
POST /api/context_engine/memory/_save_event
```

```json
{
  "session_id": "3f9c2e1a-7b4d-4c8e-9a61-5d2f0b7e8c43",
  "ai_index_ids": ["ops-memory"],
  "events": [
    { "id": "evt-001", "type": "user", "turn_id": "turn-1", "event_at": "2026-11-16T09:58:00.000Z", "content": "Why is checkout latency up?" },
    { "id": "evt-002", "type": "tool", "turn_id": "turn-1", "event_at": "2026-11-16T09:58:32.000Z", "tool_call_id": "call-1", "tool_name": "search_logs", "status": "failed", "result": "Search timed out" }
  ]
}
```

Each event is one document in the `.context-engine-session-events` data stream, which
Elasticsearch owns. Readers group turns by `turn_id`, so there is no call to close a turn.
`type` is `user`, `assistant`, `reasoning`, `tool` or `meta`:

- `user` needs `content`; `assistant` may have `content` and `tool_calls`. The `content` of
  both is indexed for semantic search.
- `reasoning` may have `content`, which is stored but not indexed.
- `tool` needs `tool_call_id` and `tool_name`, and may have `status` (`successful`, `failed` or
  `null`). A `null` or missing status is stored as `unknown`.
- Every event needs `id`, `turn_id` and an ISO 8601 `event_at`, and may have a
  non-negative integer `seq`.

Any other field, such as a tool event's `result` or a tool call's `args`, is stored as sent in
`raw`, whatever its JSON type, and never read. `content` must be a string because it is
embedded, so a harness flattens content blocks into text first.

A request takes 1 to 1,000 events and up to 10 MB. The route validates the request as a whole,
so one bad event causes it to reject the request. The response has one result per event, in
request order:

- `created`: the event was saved.
- `failed`: Elasticsearch rejected the event, for example when its content could not be
  embedded. The reason is in `error`; resend the event to retry.

Elasticsearch generates each document's `_id`, so a resent event is stored again. Readers drop
duplicates by `session_id` and `id`, and a harness should send each event once and track what
it has sent.

The route runs synchronously, so a harness should send events in the background rather
than make the agent wait. It is gated by `contextEngine:enabled` and by the memory setting,
and returns 404 while either is off. The space comes from the request URL.

### Privileges and audit

The route needs `contextEngine:write`. Without `user_id`, the events belong to the caller's
user profile, as core's `userProfile.getCurrentProfileId()` resolves it: the profile of a UI
session, the API key owner's profile, or for basic authentication the profile Elasticsearch
activates for those credentials. A caller without a profile, such as a service account or an
API key whose owner never logged in to Kibana, gets a 403 unless it names `user_id`.

Naming another user in `user_id` also needs `contextEngine:manage_memory`, for example on the
API key of a harness that saves events for many users. It is not part of All, so an
administrator grants it explicitly. Without it the request gets a 403.

Each AI index in `ai_index_ids` must exist in the space, or the route returns 404. The caller
needs the Elasticsearch `write` privilege on each backing index, checked with `has_privileges`,
or the route returns 403. If any AI index fails, the route rejects the request and saves
nothing.

Each request writes one `memory_save_event` audit event. It records the user the events belong
to in `user.target.id`, the session in `kibana.saved_object`, and how many events were saved
and failed. It records rejected requests, failed writes, and batches where every event fails as
failures. Core adds the caller, the space and the request id.

## Session memory

Context Engine can remember and forget session memories over HTTP. Both routes are public
and experimental.

### Remember

```
POST /api/context_engine/memory/_remember
```

```json
{
  "session_id": "8f3c2a1e",
  "ai_index_ids": ["ops-memory"],
  "content": "checkout-service latency alert fired. Root cause is a connection pool limit after the 3.2 deploy.",
  "attributes": { "incident": "INC-4211" }
}
```

`session_id` and `content` are required. Pass `id` to revise an existing memory. The revision
replaces the memory in full, and the route does not check whether the id exists. Without `id`,
the route generates one. `ai_index_ids` lists the AI indices that dreaming promotes the memory
into. `attributes` is a map of string hints for dreaming.

The route returns `202` with `{ "id": "..." }` and writes the memory in the background, because
`semantic_text` inference runs inside the index request. The memory becomes searchable after
the background write completes. The route does not report a failed write in the response.
Instead, it logs the error to the Kibana logs and writes a failure audit event.

The space comes from the request URL. The route returns 404 while `contextEngine:enabled` or
the memory setting is off. Each AI index in `ai_index_ids` must exist in the request space, or
the route returns 404. The caller must hold the Elasticsearch `write` privilege on each
backing index, or the route returns 403. A rejected request writes nothing.

### Forget

```
POST /api/context_engine/memory/_forget
```

```json
{ "ids": ["7c1f0b2e-5a43-4b0e-9a57-2f0f6f1d3a10"] }
```

`ids` takes 1 to 100 ids, and the route collapses duplicates. Forgetting writes a tombstone and
keeps the memory's revisions until retention removes them.

The response lists one outcome per unique id, in request order: `forgotten`,
`already_forgotten`, `not_found`, or `failed`. A `failed` entry includes `error` when
Elasticsearch rejects the tombstone.

The space comes from the request URL. The route reports a memory of another user or another
space as `not_found`, so it never reveals that the memory exists. It returns 404 while
`contextEngine:enabled` is off, and does not check the memory setting, so forgetting still
works after memory is turned off.

### Privileges and audit

Both routes require `contextEngine:write`. Without `user_id`, they act on the caller's own
memories. A caller without a user profile gets a 403.

Naming another user in `user_id` also requires `contextEngine:manage_memory`. That privilege
is not part of All, so an administrator must grant it. Without it, the request gets a 403
and the route audits the attempt as a failure. On `_forget`, when `user_id` does not match a
memory's owner, the route returns `not_found`.

`_remember` writes one `memory_remember` audit event per request, when the background write
finishes or when the route rejects the request. Because `_remember` does not check whether a
supplied `id` exists, a request with an unknown `id` creates a memory while auditing with
`event.type` set to `change`. `_forget` writes one `memory_forget` audit event per unique id.
Both events record the authenticated actor in `user.*`, the memory's owner in `user.target.id`,
and the memory in `kibana.saved_object`. Because memories are scoped by space and user and the
caller can choose `id`, two users can share the same id; combine the space, `user.target.id`,
and `kibana.saved_object.id` to identify a single memory. The routes record rejected requests,
background write errors, `not_found`, `failed`, and Elasticsearch errors as failures.

## Improvements

An **improvement** is a proposed change to one AI index's KI pipeline, derived
from that index's signals. Context Engine keeps no record of improvements or of
what reviewers decided about them: each one is put up as a
[proposal](../proposals/README.md), and the proposal is the record.

### Reviewing them

Improvements are reviewed as proposals, so the feedback loop is unavailable
where the proposals plugin is off: the run route returns 404 and the workflow
steps fail.

Each KI improvement becomes a gateless proposal that runs a Context Engine
action workflow as the approver, so an approval can never effect something the
reviewer could not do themselves. A proposal carries:

- the id `context-engine-<improvement_id>`, where `improvement_id` is
  `hash(space + ai_index_id + change_fingerprint)`. The fingerprint describes the
  proposed fix (for example `remove_ki:<ki_id>`) and contains no free text, so a
  re-run over the same latent problem derives the same id. The space is part of
  the hash because a proposal id is unique across spaces, not within one;
- the anchor `context-engine:<ai_index_id>` as its conversation id, which is how
  the proposals of one AI index are listed together. It is not a real
  conversation;
- the agent's rationale as its comment, and the action workflow and its single
  `actionInput`. The `actionInput` also carries a `provenance` object (the run's
  execution id, the signal ids, spaces and window it drew on, and the classifier
  tags), which the actions ignore; it is how a reviewer or a later run traces a
  proposal to its evidence.

| Improvement action | Action workflow                          |
| ------------------ | ---------------------------------------- |
| `add_ki`           | `system-context-engine-action-add-ki`    |
| `edit_ki`          | `system-context-engine-action-edit-ki`   |
| `remove_ki`        | `system-context-engine-action-remove-ki` |

Only KI improvements can be proposed so far, because they are the only ones with
an action workflow; a run skips the others as `action_not_allowed`. An added KI is
created under the id `improvement-<improvement_id>`, which is known before the
action runs.

A change is proposed once. The id is deterministic, so proposing a change that
already has a proposal, whatever became of it, is refused as a `duplicate`. A
failed gateless proposal is final and keeps its id, so the same improvement is not
proposed again.

The only route is `POST /internal/context_engine/ai_index/{id}/feedback_analysis/_run`,
which starts one analysis run off-schedule. It is gated by the
`contextEngine:feedbackLoopEnabled` setting on top of `contextEngine:enabled`.

One run analyzes an index at a time. The workflow declares
`concurrency: { key: <per index>, strategy: drop, max: 1 }`, so the engine
refuses an overlapping run whether it came from the schedule or from this route.
It refuses quietly: a dropped run is still given an execution document and its
id is still returned, only marked `skipped`. `_run` therefore reads the
execution back — an mget by id, so the skip is visible immediately — and answers
`409` rather than reporting a run that was thrown away.

### Privileges

The run's identity needs `manage_proposals` as well as the Context Engine write
privilege, because creating a proposal asserts it. An approver needs
`manage_proposals` and whatever the action workflow's steps check as them: the KI
write privilege for the three KI actions.

Proposals for an AI index are not removed when it is deleted.

## Feedback analysis runs

A **run** is one pass of the loop over a single AI index: read that index's
signals, work out what would make it serve agents better, and put what
it finds up for review as proposals. Runs are scheduled per AI index by
`feedback_analysis` (see [Feedback analysis configuration](#feedback-analysis-configuration)).

| Step                                | Description              |
| ----------------------------------- | ------------------------ |
| `context-engine.getFeedbackContext` | Everything one run reads |
| `context-engine.recordImprovements` | Put what a run proposed up for review |

Both are workflow steps, not HTTP routes, and both reach plugin services
directly: the signal selection code and the proposals provider, whose creation is
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

**Signals are evidence, not a precondition.** A run analyzes whether or not the
window held any: an indicator its source contradicts, an automation producing
nothing, a source nothing covers are all visible without a failed retrieval, and
an index nobody has queried yet is when a bad setup is cheapest to fix. The
briefing says which kind of run it is, and asks for grounding either way — signal
ids when there are groups, and what was actually read when there are not, which
is why `signal_ids` is optional on a proposal.
The agent is skipped only for `can_analyze: false`: an index with no signals, no
indicators, no sources and no automations, where there is nothing to read at all.

The briefing lists the AI index's earlier proposals, most recent first, up to 50:
what each was, where it stands, and the reviewer's reason or the action's error.
They are read from the proposals plugin, listed under the index's anchor. A run
that finds more than fit is told how many are not shown. Since a proposal can
only be made once, the run is told that proposing a listed change again is
refused as a duplicate, and that it should read a reviewer's reason rather than
assume the change was wrong. This is server-side rather than a query the agent
runs, so the agent does not depend on how the proposals plugin stores its data;
the cost is that the briefing carries a fixed page of history instead of the
history of the one target the run settles on.

The `platform.context_engine.ai_index` attachment is not used: it carries the
install and save tools and the authority to write to the index, which belong to
the interactive setup conversation. How that conversation asks the user is in
the Context Engine agent's instructions.

The `ai.agent` step runs under the workflow owner's identity — the user who
turned analysis on. The conversation it creates is private to that user, Agent
Builder's default: a run reads the index's data under the owner's privileges,
and its rounds quote what it read.

A managed workflow instance is keyed by `(workflowId, aiIndexId, spaceId)`: one
instance per AI index per space. Enable, disable and delete address the instance
for the space the request came from, so two spaces holding an AI index with the
same id have independent schedules.

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

**Every space is read**, because an AI index is global while signals are
per-space. The briefing names the spaces a run drew from; they are not
recorded on the proposals it makes.

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
entry with a reason: `invalid`, `action_not_allowed`, `duplicate`,
`limit_exceeded` or `proposal_failed`.

