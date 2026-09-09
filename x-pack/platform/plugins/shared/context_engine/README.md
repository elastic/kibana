# Context Engine

Server-side plugin for the Context Engine.

## AI Indices API

AI indices attach a logical name to an existing user index pattern or data
stream. AI index records are stored in a hidden Kibana system index
(`.contextengine-ai-indices`), separate from the backing data.

| Method   | Path                                                            | Description                          |
| -------- | --------------------------------------------------------------- | ------------------------------------ |
| `PUT`    | `/api/context_engine/ai_index/{id}`                               | Create or update an AI index         |
| `GET`    | `/api/context_engine/ai_index/{id}`                               | Get an AI index by id                |
| `GET`    | `/api/context_engine/ai_index`                                    | List AI indices (max 100)            |
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
- Deleting an AI index deletes **only** the AI index entry. Backing indices
  are left untouched and must be removed with the Delete index API if desired.
- `feedback_analysis` configures this index's feedback loop. See
  [Feedback analysis configuration](#feedback-analysis-configuration) below.

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

- `enabled` is *desired* state. A schedule also needs credentials bound to it,
  so the scheduler stays authoritative for whether analysis is really running.
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
per-space `context-engine-signals-<space>` index. The AI index detail page
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

## Improvements

An **improvement** is a proposed change to one AI index's KI pipeline, derived
from that index's signals. They live in the single global
`context-engine-improvements` index, exposed to the server as
`ContextEnginePluginStart.getImprovementsService(esClient)` and written by an
analysis run (see [Feedback analysis runs](#feedback-analysis-runs)). The review
UI that applies them comes later.

Unlike signals, the store is **global rather than per-space**: an improvement
targets an AI index's KI pipeline, and the AI index registry has no space
dimension. Two consequences are accepted deliberately — the analysis reads
signals across all spaces, so an improvement's rationale can cite evidence from
a space the reviewer cannot open; and a single index means one
`deleteByAiIndex` cleans up completely when an AI index is deleted.

The lifecycle is an **append log** rather than a mutable status field, so the
record of what the loop did to a user's index survives every transition:

- `improvement_id` is the stable lineage key, derived idempotently from
  `hash(ai_index_id + change_fingerprint)`. The fingerprint describes the
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
  one AI index are therefore expected to be serialized. Should it happen anyway,
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
  through and callers pass a request-scoped one.

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

Prior proposals go into the briefing grouped by what they would change — the
workflow, knowledge indicator or source named in `target` — rather than listed by
date. A run cannot be handed the history that matters to it, because until it has
read the signals it does not know what it is about to suggest; grouping by target
lets it look its own conclusion up once it has one. Targets are ordered by how
often they were rejected, so a long history is cut from the end that carries the
least settled decisions, and the totals above the list stay exact whether or not
it was cut.

The `platform.context_engine.ai_index` attachment is not used: it carries the
`save_automation` tool and instructions to ask the user questions, which belong
to the interactive setup conversation.

The `ai.agent` step runs under the workflow owner's identity — the user who
turned analysis on. The conversation it creates is private to that user, Agent
Builder's default: a run reads the index's data under the owner's privileges,
and its rounds quote what it read.

A managed workflow instance is keyed by `(workflowId, spaceId)`, but an AI index
is global and writable from any space, so the instance is installed in the
default space rather than the caller's. Enable, disable and delete therefore
address the same instance whichever space the write came from.

The workflow carries a `concurrency` guard keyed on the AI index with
`strategy: drop`, so two runs for one index never overlap.

`enablement: 'enforced'` makes the workflow instance's existence the desired
state, so reconciliation is install-or-uninstall: turning analysis off removes
the instance. Changing the interval reinstalls, since a scheduled trigger's
interval is written into the YAML at install time. Everything else about a run —
which agent, which signals, which actions — is read per run through the context
step.

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
per-space. The spaces a run drew from are recorded on each improvement's
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

