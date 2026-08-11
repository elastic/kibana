# Alerting V2 Architecture

This is the main architecture document for the `alerting_v2` plugin. Read this file first if you want to understand the big picture before diving into one subsystem.

The goal of the plugin is simple:

1. Let users define ES|QL-based rules and notification policies.
2. Evaluate rules on a schedule and persist immutable rule events.
3. Derive alert lifecycle state for alert-type rules.
4. Dispatch notifications asynchronously based on policies and action history.
5. Expose APIs and UI for managing rules, alert actions, episodes, and notification policies.

## Read this document when

- You are new to the plugin and need a mental model.
- You want to know which subsystem owns a behavior.
- You need to decide where a change belongs before editing code.

If you already know the high-level flow and want subsystem detail, jump to:

| Concern | Document |
| --- | --- |
| Rule execution pipeline, middleware, streaming steps | [`lib/rule_executor/README.md`](lib/rule_executor/README.md) |
| Episode lifecycle and transition strategies | [`lib/director/README.md`](lib/director/README.md) |
| Notification matching, grouping, throttling, dispatch | [`lib/dispatcher/README.md`](lib/dispatcher/README.md) |
| Data streams, mappings, and ES\|QL views | [`resources/README.md`](resources/README.md) |

## The mental model

The plugin is easiest to understand as five cooperating layers:

| Layer | What it owns | Main code |
| --- | --- | --- |
| Control plane | User-facing APIs, saved objects, privileges, UI, startup wiring | `public/`, `server/routes/`, `server/saved_objects/`, `server/setup/` |
| Evaluation plane | Running rules and turning query results into rule events | `lib/rule_executor/` |
| Lifecycle plane | Turning alert rule events into episode state transitions | `lib/director/` |
| Delivery plane | Turning episodes into notification work and recording outcomes | `lib/dispatcher/` |
| Persistence plane | Data streams and ES\|QL views used by the other layers | `resources/` |

Those layers deliberately do different jobs:

- The **rule executor** answers "what happened when this rule ran?"
- The **director** answers "what episode state should this alert series be in now?"
- The **dispatcher** answers "should anything notify right now, and what should we record about that decision?"
- The **resources** layer answers "where is all of that stored, and what is the durable document shape?"

## Core domain concepts

### Rule

A rule is a saved object that defines:

- what ES|QL to run
- how often to run it
- how results are grouped into a stable series identity
- whether it behaves as a `signal` rule or an `alert` rule
- optional recovery and no-data behavior
- optional alert lifecycle thresholds for `alert` rules

Rules are persisted under `saved_objects/` and managed through `routes/` plus `lib/rules_client/`.

### Rule event

A rule event is the immutable output document for one evaluated row or derived outcome from one rule run. Rule events are written to `.rule-events` and never updated in place.

Each event has:

- `type`: `signal` or `alert`
- `status`: `breached`, `recovered`, or `no_data`
- `group_hash`: the series identifier inside that rule
- `data`: the flattened ES|QL row payload
- `episode.*` fields for persisted alert-type rules

`signal` events stop here. Persisted `alert` events continue into lifecycle and notification processing and are expected to carry `episode.*` after `DirectorStep` enriches them.

### Series

A series is the per-rule stream of events sharing the same `group_hash`. It is the stable identity used to compare runs, detect recoveries, scope suppressions, and correlate lifecycle state over time.

### Episode

An episode is the lifecycle container for an alert series. Episodes exist only for `type: alert` events.

- A single series can have many episodes over time.
- A single episode covers one breach-to-recovery lifecycle.
- The director assigns `episode.id`, `episode.status`, and `episode.status_count`.

Episode statuses are:

| Status | Meaning |
| --- | --- |
| `inactive` | The series is not currently active. |
| `pending` | The series breached but has not yet met activation criteria. |
| `active` | The series is actively alerting. |
| `recovering` | The series stopped breaching but has not yet fully returned to inactive. |

### Notification policy

A notification policy is a saved object that is evaluated by the dispatcher, not embedded in the rule. Policies define:

- an optional KQL matcher
- grouping behavior
- throttling behavior
- destinations
- optional snooze / API key state

One policy can match episodes from many rules in the same space.

### Alert action

An alert action is an append-only document in `.alert-actions` describing something that happened to an alert or notification group, for example:

- user actions such as `ack`, `snooze`, `activate`, `deactivate`
- dispatcher outcomes such as fired, suppressed, throttled, unmatched, or notified

This stream is the dispatcher's durable memory.

## End-to-end flow

The whole plugin revolves around two append-only streams:

- `.rule-events`: what rule execution produced
- `.alert-actions`: what users and the dispatcher did with those events

### 1. Configuration and management

- The UI in `public/` lets users manage rules, alerts/episodes, and notification policies.
- HTTP routes in `server/routes/` expose the same capabilities on the server.
- Saved object services and clients persist rules and notification policies.

### 2. Rule scheduling

- Each enabled rule gets its own Task Manager task.
- The task runner hands the rule id, space id, and scheduling metadata to the rule executor pipeline.

### 3. Rule execution

- The executor waits for resources to be ready.
- It loads and validates the rule.
- It builds and runs ES|QL.
- It materializes breached events and optional recovery / no-data events.
- For alert rules, it invokes the director to attach episode metadata.
- It writes the final event batch to `.rule-events`.

### 4. Episode lifecycle enrichment

- The director reads the latest known alert state for each `group_hash`.
- It selects a transition strategy for the rule.
- It calculates the next episode state and episode id for each alert event.
- It does not dispatch notifications and does not schedule work itself.

### 5. Asynchronous notification dispatch

- The dispatcher runs on its own schedule, separate from per-rule execution.
- It reads candidate episodes from `.rule-events`.
- It reads suppression / throttle / notification history from `.alert-actions`.
- It loads rules and enabled notification policies for the relevant space.
- It evaluates policy matchers, builds groups, applies throttling, dispatches eligible groups, and stores outcomes back into `.alert-actions`.

### 6. Subsequent runs reuse durable history

- Future rule executions compare against `.rule-events` for recovery and lifecycle state.
- Future dispatcher runs compare against `.alert-actions` for suppression and throttling semantics.

## Architecture diagram

```text
                        ┌──────────────────────────────┐
                        │     Management UI / APIs     │
                        │ public/ + routes/ + clients  │
                        └──────────────┬───────────────┘
                                       │
                                       ▼
                        ┌──────────────────────────────┐
                        │   Saved objects + services   │
                        │   rules / notification       │
                        │   policies / privileges      │
                        └──────────────┬───────────────┘
                                       │
                  ┌────────────────────┴────────────────────┐
                  ▼                                         ▼
      ┌──────────────────────────┐              ┌──────────────────────────┐
      │  Rule executor task      │              │    Dispatcher task       │
      │  one task per enabled    │              │    fixed interval        │
      │  rule                    │              │                          │
      └─────────────┬────────────┘              └─────────────┬────────────┘
                    │                                         │
                    ▼                                         ▼
      ┌──────────────────────────┐              ┌──────────────────────────┐
      │ Rule executor pipeline   │              │ Dispatcher pipeline      │
      │ ES|QL -> rule events     │              │ episodes -> groups ->    │
      │ -> director -> store     │              │ dispatch -> action log   │
      └─────────────┬────────────┘              └─────────────┬────────────┘
                    │                                         │
                    ▼                                         ▼
              `.rule-events`                         `.alert-actions`
                    ▲                                         ▲
                    └─────────────── reads and writes ────────┘
```

## Important ownership boundaries

These boundaries keep the architecture understandable. If a change crosses one of them, that is a signal to slow down and verify the design.

### What the rule executor owns

- Turning a rule run into rule events
- Recovery and no-data semantics
- Streaming large ES|QL result sets through the execution pipeline
- Persisting final events to `.rule-events`

### What the director owns

- Converting alert events into episode state
- Choosing transition strategies based on rule configuration
- Generating or reusing episode ids

### What the dispatcher owns

- Matching episodes to notification policies
- Grouping and throttling
- Delivery to destinations
- Recording durable dispatch decisions in `.alert-actions`

### What the dispatcher does not own

- It does not re-run the rule query
- It does not infer recoveries
- It does not calculate episode state transitions

### What the resources layer owns

- Datastream definitions and mappings
- ES|QL views
- Versioned schema evolution for stored documents

## Plugin startup and wiring

The plugin uses Inversify-based dependency injection and startup hooks:

| Path | Role |
| --- | --- |
| `server/index.ts` | Registers setup/start hooks, services, tasks, and subsystem bindings. |
| `setup/bind_on_setup.ts` | Registers privileges, saved objects, UI settings, telemetry setup, and task definitions. |
| `setup/bind_on_start.ts` | Initializes Elasticsearch resources and schedules background tasks. |
| `setup/bind_routes.ts` | Registers HTTP routes. |
| `setup/bind_services.ts` | Binds shared services, clients, dispatcher enablement, and director strategies. |
| `setup/bind_rule_executor.ts` | Registers rule executor middleware and steps in execution order. |
| `setup/bind_dispatcher_executor.ts` | Registers dispatcher steps in execution order. |
| `setup/bind_tasks.ts` | Registers Task Manager definitions for rule execution, dispatcher, and support tasks. |

## Repository map

| Path | Role |
| --- | --- |
| `public/` | UI applications, hooks, API wrappers, and app mounting. |
| `lib/rule_executor/` | Per-rule execution pipeline. |
| `lib/director/` | Alert episode state engine. |
| `lib/dispatcher/` | Notification pipeline. |
| `lib/services/` | Shared ES, storage, logging, retry, user, and saved object services. |
| `resources/` | Datastreams and ES\|QL views. |
| `routes/` | HTTP API surface. |
| `saved_objects/` | Rule and notification policy persistence models. |

## Where to make changes

If your change is about...

- **query construction, batching, recovery, or executor middleware**: start in [`lib/rule_executor/README.md`](lib/rule_executor/README.md)
- **episode state transitions or new lifecycle semantics**: start in [`lib/director/README.md`](lib/director/README.md)
- **matchers, grouping, throttling, suppression, or destinations**: start in [`lib/dispatcher/README.md`](lib/dispatcher/README.md)
- **stored fields, mappings, or ES|QL views**: start in [`resources/README.md`](resources/README.md)
- **routes, request validation, or client-facing contracts**: inspect `routes/`, `saved_objects/`, and the relevant subsystem together
- **UI behavior**: inspect `public/` and confirm whether server route or saved object changes are needed too

## Contribution rules of thumb

- Prefer changing the smallest owning subsystem instead of threading behavior through multiple layers.
- If you add fields to stored documents, update the resources definitions and any readers/writers that depend on them.
- If you add pipeline state, add it to the relevant `types.ts`, update the step bindings, and add tests at the step and pipeline level.
- If you are tempted to make the dispatcher understand rule execution internals, that logic probably belongs earlier in the rule executor.
- If you are tempted to make the director send notifications, that logic probably belongs later in the dispatcher.
