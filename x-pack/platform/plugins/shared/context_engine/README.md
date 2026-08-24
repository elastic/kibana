# Context Engine

Server-side plugin for the Context Engine.

## AI Indices API

AI indices attach a logical name to an existing user index pattern or data
stream. AI index records are stored in a hidden Kibana system index
(`.contextengine-ai-indices`), separate from the backing data.

| Method   | Path                                  | Description                     |
| -------- | ------------------------------------- | ------------------------------- |
| `PUT`    | `/api/context_engine/ai_index/{id}`   | Create or update an AI index    |
| `GET`    | `/api/context_engine/ai_index/{id}`   | Get an AI index by id           |
| `GET`    | `/api/context_engine/ai_index`        | List AI indices (max 100)       |
| `DELETE` | `/api/context_engine/ai_index/{id}`   | Delete an AI index              |

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

## Improvement loop

Signals are only an observation. The improvement loop hands them to an agent,
records what it proposes, and applies the suggestions a user approves:

```
signals ──► feedback agent ──► improvements (proposed)
                                    │
                     user approves ─┼─► applied to KIs / automations
                     user rejects  ─┘   (recorded, hidden, still fed back)
```

The analysis runs as the `Context Engine Improvement Loop` managed workflow —
one instance per AI index per space, off by default. Enabling it from the
**Signals** panel stores the caller's API key on the scheduled task, so runs
execute with that user's privileges; `Run now` starts a single run without
enabling anything. Both go through the same steps: fetch the briefing, run the
agent, record what it proposed. `Analyze & improve` sends that same briefing to
Agent Builder chat instead, for a conversation rather than a recorded run.

The agent is the AI index's `feedback_agent_id`, or the built-in
`platform.context_engine.feedback_loop` agent when the index names none. It is
resolved per run, so changing it takes effect immediately without reinstalling
the workflow.

Suggestions are stored in the per-space `.contextengine-improvements-<space>`
index and reviewed in the **Suggested improvements** panel. Applying is never
destructive: a removed Knowledge Indicator is flagged as excluded (and filtered
out of retrieval) and a removed automation is disabled, so an applied removal
can be undone. Every suggestion keeps its full history — when it was proposed,
who resolved it and when — and the agent is given all of it on the next run so
it does not re-propose what was refused.

| Method | Path                                                                | Description                                          |
| ------ | ------------------------------------------------------------------- | ---------------------------------------------------- |
| `GET`  | `/internal/context_engine/ai_index/{id}/improvements`                | Suggestions for an AI index (open ones by default)   |
| `POST` | `/internal/context_engine/improvements`                             | Record a run's suggestions (called by the workflow)  |
| `POST` | `/internal/context_engine/improvements/{id}/_approve`               | Apply a suggestion                                   |
| `POST` | `/internal/context_engine/improvements/{id}/_reject`                | Refuse a suggestion                                  |
| `GET`  | `/internal/context_engine/ai_index/{id}/feedback_context`           | The briefing handed to the agent                     |
| `POST` | `/internal/context_engine/ai_index/{id}/feedback_loop/_run`         | Start one run now                                    |
| `GET`  | `/internal/context_engine/ai_index/{id}/feedback_loop/schedule`     | Whether the recurring analysis is on                 |
| `PUT`  | `/internal/context_engine/ai_index/{id}/feedback_loop/schedule`     | Turn the recurring analysis on or off                |

Notes:

- These routes are gated by both `contextEngine:enabled` and
  `contextEngine:feedbackLoopEnabled` (404 while either is off).
- Scheduling depends on the optional `workflowsExtensions` plugin. Without it
  the run and schedule routes answer 503; reviewing suggestions already
  recorded keeps working.
- Deleting an AI index uninstalls its schedule in the space the delete came
  from. AI indices are global while schedules are per space, so a schedule
  enabled from another space has to be turned off there.
- The improvements index is read and written by Kibana's internal user, unlike
  signals, which are read as the requesting user. Elasticsearch's built-in
  `kibana_system` role grants `.contextengine-*` (with `allow_restricted_indices`)
  and nothing matching `context-engine-improvements-*`, so the store has to live
  under the dot prefix — a restricted namespace no end user, not even
  `superuser`, can read directly. The route's Context Engine privileges and the
  per-space index are the authorization boundary; applying an approved suggestion
  still runs as the caller. Adding `context-engine-improvements-*` to the role in
  the Elasticsearch repo (next to the `context-engine-signals-*` grant it already
  has) is what it would take to make this a user-readable index read as the
  caller, like signals.

