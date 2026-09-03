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

The feedback loop must not generate signals about itself. An analysis run reads
signals, traces and the AI index it is diagnosing through `execute_esql` — tool
calls that would otherwise be traced, turned into signals, and analyzed on the
next pass, until the loop's own reads are the dominant "evidence" in the store.

Two filters cover the two ways that happens, because neither is sufficient
alone.

**By target index.** `server/tasks/self_referential.ts` recognizes reads of the
loop's own observability surface: the `context-engine-` user namespace (signals,
improvements), the `.contextengine-` system namespace (the AI index registry),
and `traces-agent_builder.otel-*`. `build` in `server/tasks/transform.ts` drops
those spans **before** round context is computed, so an analysis round neither
emits signals nor inflates the `looped` / `fell_back_to_raw` counters of the
round it shares a trace with. Matching on namespace prefixes rather than on
individual index names means stores added later are covered without touching
the list. A bare `FROM *` is deliberately *not* treated as self-referential: it
reads everything, so it is a genuine coverage signal rather than the loop
observing itself.

**By round.** The target-index filter cannot see the largest leak: diagnosing an
AI index means querying that AI index, which is indistinguishable from an agent
genuinely retrieving from it. So `generate_signals` also drops every span whose
round loaded the `analyze-and-improve` skill, identified from the round's
`load_skill` span. That lookup is scoped by `trace_id` and not by the watermark,
so a round whose skill load and queries fall in different batches is still
excluded. The watermark still advances over the dropped rounds, which would
otherwise be re-read on every run.

The round filter depends on the agent actually calling `load_skill`; an agent
carrying the same guidance in its instructions would go unmarked.

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

**Workflow steps rather than HTTP routes.** The workflow is the only caller of
either, and both need plugin services a request could not otherwise reach: the
selection code the interactive hand-off will share, and the improvements
service, whose write is a read-modify-write under optimistic concurrency
control rather than a plain index operation. A step reaches those directly.

Both steps require the `context_engine:feedbackLoop` advanced setting and act as
the workflow owner. A scheduled run is a managed workflow owned by a real user,
so there is no path here that reads or writes as Kibana.

### The runner

The runner is the `system-context-engine-feedback-analysis` managed workflow,
installed once per AI index with the index id and interval templated in. Its
shape is three steps: fetch the context, run the index's agent against it with
a forced output schema, record the result.

The briefing is handed over as the agent's `message`. The existing
`platform.context_engine.ai_index` attachment is deliberately **not** used: it
carries the `save_automation` tool and instructions to ask the user questions,
both of which belong to the interactive setup conversation and neither of which
an unattended, propose-only run should have.

A **managed workflow rather than a Task Manager task** because the `ai.agent`
step already runs under the workflow owner's identity. A scheduled analysis has
no request to borrow credentials from, and the workflow owner is the user who
turned analysis on — which is also who the run should be acting as.

The workflow carries a `concurrency` guard keyed on the AI index with
`strategy: drop`. Two overlapping runs would read the same signals and propose
the same changes, and only the first would de-duplicate against the other.

`enablement: 'enforced'` makes the workflow instance's existence the desired
state, so reconciliation is install-or-uninstall: turning analysis off removes
the instance rather than leaving a disabled one behind. Changing the interval
reinstalls, because a scheduled trigger's interval is written into the YAML at
install time. Everything else about a run — which agent, which signals, which
actions — is read per run through the context endpoint, so only the interval
needs this.

Reconciliation is best-effort and happens after the configuration is stored.
The configuration is the record of intent; failing the write because Task
Manager could not be told would leave the caller retrying a change that has in
fact been made.

### Selecting an index's signals

A run selects over everything `signal_time_range` and `signal_filter` admit;
there is no restriction by signal type. What a signal's type governs is how it
is *attributed* to an AI index, because signals record that an agent ran a query,
not which AI index the query was meant to serve. A signal is admitted by any of
three paths:

1. **Retrieval.** A `ki_retrieval` tool call names the KI index it read in
   `data.target_index`, so it is matched against the AI index's `dest.value`.
   This is exact.
2. **Fallback.** A `raw_access` tool call is the `coverage_gap` case — the agent
   gave up on the KIs and read the underlying data — and names no KI index at
   all. These matter most for improving an index, so they are attributed two
   ways: by target, against the raw indices the index's own ES|QL sources read;
   and by conversation, against conversations already tied to the index by the
   first pass.
3. **Everything else.** A signal that is not a tool call carries no
   `query_kind` or `target_index` to attribute on, so the window and the index's
   `signal_filter` are what scope it. Such a signal reaches the run's total but
   forms no pattern, because patterns are keyed on fields it does not have —
   how a second signal type should group is a decision for whoever adds one.
   This path is inert until then; it is here so that adding a type does not
   require teaching the run about it first.

Management-agent signals are excluded: they describe Context Engine's own
tooling rather than an agent failing to find context. Signals carrying no
`data.agent.class` at all are unaffected.

**Every space is read.** Signals are per-space because conversations are, but an
AI index is global and so is the pipeline it describes. Restricting to the
caller's space would analyze a fraction of the evidence and present it as the
whole picture. The spaces a run actually drew from are recorded on each
improvement's `provenance.signal_spaces`.

Signals are then folded into ranked patterns — grouped by tag, target index and
tool, and scored by frequency weighted by how much the tag means. The grouping
is an aggregation over the whole window, so a pattern's count is the number of
signals that actually occurred, not the number a run happened to read. Only the
example query and provenance ids attached to each pattern come from documents,
of which a run reads at most `MAX_ANALYSIS_SIGNALS`; a pattern occurring only
outside that sample still gets its true count, just no example.

Bucketing on the multi-valued `tags` field is what gives the grouping its two
useful properties for free: a signal tagged both `query_error` and
`coverage_gap` counts in both patterns, because those are two different problems
with two different fixes, and an untagged signal produces no bucket at all, so a
retrieval that worked never becomes something to act on.

The patterns, not the signal count, decide whether a run happens: a window full
of healthy retrievals has signals but nothing to analyze, and spending an LLM
call to be told so is a run's most common failure mode.

### What a run may propose

The run answers with structured output, and the schema it is given is built from
the index's `allowed_actions` — narrowing the `action` enum to what is permitted,
or omitting the improvements array entirely for an observe-only index. The same
policy is enforced again on write, re-read from the index rather than taken from
the request, so a run briefed before the policy changed cannot write under the
old one.

The server derives each `improvement_id` from the action and its target. A run
that could name its own would be able to merge two unrelated proposals or fork
one problem across many, and the store's idempotency would stop meaning
anything.

A bad proposal is skipped, not fatal. A run is unattended, and failing a batch
of eight because one named a missing `ki_id` would throw away seven good ones
and leave the run nothing to report. Every rejection comes back as a `skipped`
entry with a reason: `invalid`, `action_not_allowed`, `duplicate`, `conflict`,
or `limit_exceeded`.

