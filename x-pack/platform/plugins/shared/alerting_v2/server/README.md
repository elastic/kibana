# Alerting V2 — System Architecture

This document describes the Alerting V2 architecture. Implementation details and development documentation lives inside the folder on each component. 

---

## 1. Rule events

A rule event is the atomic unit of output from a single execution of a rule. Each rule event is an immutable, append-only document stored in the `.rule-events` data stream. The engine creates at most one rule event per row returned by the rule’s ES|QL evaluation for that run (plus additional events when the rule emits recovery or no-data outcomes according to configuration). Rule events are never updated in place. History is preserved by appending new documents. Colloquially the same documents are sometimes called alert events when discussing user-visible alerting.

### 1.1 Types (`type`)

Each rule event document carries a `type` field with one of two values:

| Value | Meaning |
| --- | --- |
| `signal` | Observation-only: No alert lifecycle, no `episode.*` fields, no notifications. |
| `alert` | Lifecycle-backed: Alert lifecycle, may carry `episode.*` fields after processing, support for notifications. |

Rules declare a kind (`signal` or `alert`) on the rule definition. The written documents use `type` with the same two values.

### 1.2 Statuses (`status`)

Each rule event has a `status` describing the outcome of that evaluation for its series (see §2):

| Status | Meaning |
| --- | --- |
| `breached` | The rule’s condition matched for this row / series (threshold or condition satisfied). |
| `recovered` | The condition is no longer satisfied for a series that was previously breaching (typically inferred by comparing group membership across runs). |
| `no_data` | The evaluation could not establish a normal breach/recovery outcome—e.g. no rows returned where the rule distinguishes “no data” from “recovered.” |

Computed fields from the ES|QL result are stored under `data` (flattened). `group_hash` identifies the series for grouping and recovery. `rule.id` and `rule.version` tie the event to the rule definition at execution time.

*Implementation:* [`resources/README.md`](resources/README.md).

---

## 2. Series 

A series is the logical stream of rule events for one rule that share the same grouping identity within that rule’s evaluation. It is the unit used for recovery detection, snooze scoping, and correlating alert lifecycle state.

Each rule event includes `group_hash`: a stable digest, a cryptographic hash of a short canonical string, computed when breach and recovery documents are materialized from the rule’s ES|QL results. The digest encodes the grouping fields (configured in the rule) and the values from each result row for those columns, so each distinct combination of values maps to one series identifier and remains comparable across runs (including recovery). 

*Implementation:* [`lib/rule_executor/build_alert_events.ts`](lib/rule_executor/build_alert_events.ts) — [`lib/rule_executor/README.md`](lib/rule_executor/README.md).

---

## 3. Episodes

An episode is the lifecycle construct for alert-type rule events only. It groups all rule events that share the same `episode.id` (a stable identifier for one breach-to-recovery lifecycle for that alert). signal-type rule events do not have episodes.

### 3.1 Episode statuses

Episode state is carried on rule events under `episode.status`:

| Status | Meaning |
| --- | --- |
| `inactive` | Condition not met. Both the starting and ending state of an episode lifecycle. |
| `pending` | Condition met but activation criteria (e.g. consecutive breaches or duration) not yet satisfied. |
| `active` | Condition met and activation criteria satisfied. |
| `recovering` | Condition no longer met, but recovery criteria not yet satisfied before returning to `inactive`. |

`episode.status_count` records consecutive evaluations in the current status where count-based thresholds apply.

### 3.2 Lifecycle

An episode progresses along a finite state machine over time as new rule events are written: typically `inactive` → `pending` → `active` → `recovering` → `inactive`, with possible skips (e.g. zero pending threshold yields `inactive` → `active`). A series may see many episodes over time. A new `episode.id` is assigned when a new breach begins after the previous episode has fully closed.

*Implementation:* [`lib/director/README.md`](lib/director/README.md).

---

## 4. Rules

A rule is a persisted configuration (saved object) that defines what to evaluate, how often, and how results map to rule events. V2 rules are ES|QL-powered: the core of evaluation is an ES|QL query (plus optional condition and time bounds) executed by Elasticsearch on each scheduled run.

Rules include scheduling, evaluation query configuration, recovery policy, optional no-data behavior, grouping inputs that feed `group_hash`, and state-transition thresholds for alert rules. Rules are either of type signal or type alert. That choice controls whether episode lifecycle processing apply.

*Implementation:* saved object schemas and HTTP APIs live under `saved_objects/` and `routes/`. Client-facing rule shapes under `lib/rules_client/`.

---

## 5. Rule execution

Rule execution is the process of running one rule once on its schedule. The Task Manager invokes a dedicated task per enabled rule. The execution path loads the rule, ensures the required datastreams exist, validates that the rule may run, builds and runs ES|QL, turns result rows into rule events (including recovery and no-data handling where configured), passes alert-type rule events batches through the Director to attach episode information, and bulk-indexes documents into `.rule-events` datastream.

Execution is modeled as a pipeline of ordered steps with cross-cutting middleware (e.g. cancellation, error handling). The pipeline is deterministic with respect to ordering: each step consumes and produces pipeline state. Halting conditions (disabled rule, missing rule) stop the run without writing or with partial writes according to design.

*Implementation:* [`lib/rule_executor/README.md`](lib/rule_executor/README.md).

---

## 6. Director

The Director is the episode transition engine. Given alert-type rule events and prior state read from `.rule-events`, it resolves the next `episode.id`, `episode.status`, and `episode.status_count` per series according to configurable strategies (including count and time-based thresholds). It runs inside the rule execution pipeline as a dedicated step after breach/recovery events are formed. 

The Director does not schedule work and does not send notifications. It only assigns episode metadata for storage. Pluggable transition strategies allow different threshold semantics without changing the core orchestrator.

*Implementation:* [`lib/director/README.md`](lib/director/README.md).

---

## 7. Dispatcher

The Dispatcher is a separate scheduled component (its own Task Manager task) that bridges episode-bearing data in `.rule-events` and downstream actions. On each tick it loads candidate episodes (subject to lookback and prior fire / suppress / notified semantics on `.alert-actions`), applies notification policies attached to rules: KQL matchers, grouping, throttling, suppression (ack, deactivate, snooze, etc.), then dispatches matched notification groups to configured destinations (e.g. workflows). It records outcomes back to `.alert-actions` so future ticks do not reprocess the same work incorrectly.

The Dispatcher is asynchronous relative to any single rule run: it observes the shared indices after writes complete.

*Implementation:* [`lib/dispatcher/README.md`](lib/dispatcher/README.md).

---

## 8. How the pieces are connected

The following invariant holds: rule execution and Director run on the hot path of scheduled evaluation and write `.rule-events` (and indirectly drive what the Dispatcher will later see). The Dispatcher runs on a schedule, reads `.rule-events` and `.alert-actions`, and writes `.alert-actions`. User and system actions (acknowledgements, snoozes, etc.) also append to `.alert-actions` and influence suppression and dispatch eligibility.

```
                    ┌─────────────────────┐
                    │    Task Manager     │
                    └──────────┬──────────┘
           ┌───────────────────┴───────────────────┐
           ▼                                       ▼
┌──────────────────────┐                 ┌──────────────────────┐
│  Per-rule executor   │                 │  Dispatcher task     │
│  (rule schedule)     │                 │  (fixed interval)    │
└──────────┬───────────┘                 └──────────┬───────────┘
           │                                        │
           ▼                                        ▼
┌──────────────────────┐                 ┌──────────────────────┐
│ ES|QL + rule events  │   append-only   │ Policies + dispatch  │
│ + Director (episodes)│ ──────────────► │ + alert actions      │
└──────────┬───────────┘   `.rule-events` └──────────┬───────────┘
           │                      ▲                   │
           │                      └───────────────────┘
           │                         read / write
           └────────────────── `.alert-actions`
```

Data dependency: Dispatchers and matchers operate on materialized episode rows and action history. They do not re-execute ES|QL for the rule. Recovery and no-data semantics are entirely resolved during rule execution before the Dispatcher runs.

*Persistence and index definitions:* [`resources/README.md`](resources/README.md).

---

## Related documentation

| Concern | Document |
| --- | --- |
| Rule execution pipeline, middleware, steps | [`lib/rule_executor/README.md`](lib/rule_executor/README.md) |
| Director, transition strategies | [`lib/director/README.md`](lib/director/README.md) |
| Dispatcher pipeline, steps, operational parameters | [`lib/dispatcher/README.md`](lib/dispatcher/README.md) |
| Data streams, mappings, ES\|QL views | [`resources/README.md`](resources/README.md) |

## Repository layout

| Path | Role |
| --- | --- |
| `setup/` | Dependency injection: services, executors, tasks, routes |
| `lib/rule_executor/` | Rule execution pipeline |
| `lib/director/` | Episode transition engine |
| `lib/dispatcher/` | Notification pipeline |
| `resources/` | Elasticsearch data streams and views |
| `routes/` | HTTP API |
| `saved_objects/` | Rule and notification policy persistence models |

Plugin packaging and dependencies: `kibana.jsonc` at the plugin root.
