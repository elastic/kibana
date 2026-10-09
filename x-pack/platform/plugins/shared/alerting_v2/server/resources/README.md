# Elasticsearch resources

This folder defines the managed Elasticsearch resources for alerting v2:

- data streams with explicit mappings and ILM policies
- ES|QL views layered over those streams
- the startup registration path that initializes them at plugin start

If you change stored document shape, retention behavior, or ES|QL views, this folder is part of the change.

## What this folder owns

| Area | Files |
| --- | --- |
| Datastream definitions | `datastreams/alert_events.ts`, `datastreams/alert_actions.ts` |
| Ingest timestamp pipeline | `datastreams/ingest_timestamp_pipeline.ts` |
| Datastream registration | `datastreams/register.ts` |
| ES\|QL view definitions | `esql_views/` |
| Startup initialization | `register_resources.ts` |

`register_resources.ts` registers datastreams and ES|QL views, then asks `ResourceManager` to start initialization during plugin start.

## Design principles

| Topic | Behavior |
| --- | --- |
| Append-only storage | Both streams are written as immutable history; consumers derive state from history rather than in-place updates. |
| Strict mappings | Both data streams use `dynamic: false`. Only declared fields are indexed. |
| Runtime schema alignment | Zod schemas mirror the intended application-level document shape. |
| Versioned evolution | Datastream resources carry a version; bump it when template changes require rollover. |
| ES-owned `@timestamp` | Each stream has a versioned ingest pipeline wired as `index.final_pipeline` that sets `@timestamp` from `_ingest.timestamp` when the document does not carry one. Writers omit `@timestamp`; only the public alert events API passes a caller-supplied value through. |
| Backward compatibility | Existing fields may not be removed, renamed, or have incompatible type changes. |

## The two core streams

### `.rule-events`

Purpose: append-only rule events produced by the rule executor.

This stream is the durable history of rule evaluation.

| Field | ES type | Notes |
| --- | --- | --- |
| `@timestamp` | `date` | When the document was indexed; set by ES via the final pipeline. |
| `scheduled_timestamp` | `date` | When the rule run was scheduled. |
| `rule.id` | `keyword` | Rule identifier. |
| `rule.version` | `long` | Rule version at execution time. |
| `group_hash` | `keyword` | Per-rule series identity. |
| `data` | `flattened` | ES\|QL row payload. |
| `status` | `keyword` | `breached`, `recovered`, or `no_data`. |
| `source` | `keyword` | Origin marker. |
| `type` | `keyword` | `signal` or `alert`. |
| `alert.id` | `keyword` | Alert id for alert-type events. |
| `alert.status` | `keyword` | `inactive`, `pending`, `active`, or `recovering`. |
| `alert.status_count` | `long` | Consecutive count within the current alert status. |
| `episode.id`, `episode.status`, `episode.status_count` | `alias` | Aliases of the `alert.*` fields, so queries on the pre-v8 names keep working. Aliases are not stored in `_source` and cannot be written. |
| `severity` | `keyword` | Optional. Best-effort severity extracted from the ES\|QL `severity` column on breached events. One of `info`, `low`, `medium`, `high`, `critical`. |

Writers:

- `lib/rule_executor/steps/store_alert_events.ts`

Readers:

- `lib/director/queries.ts`
- `lib/dispatcher/queries.ts`
- UI and APIs that surface alert history / episodes

Runtime schema: `alertEventSchema` in `datastreams/alert_events.ts`

### `.alert-actions`

Purpose: append-only action history for alerts and notification groups.

This stream is the dispatcher's durable memory and also stores user/system actions such as acknowledgement or snoozing.

| Field | ES type | Notes |
| --- | --- | --- |
| `@timestamp` | `date` | Action time; stamped by ES via the final pipeline. |
| `last_series_event_timestamp` | `date` | Timestamp of the related series event. |
| `expiry` | `date` | Optional expiry for temporary actions such as snooze. |
| `actor.type` | `keyword` | `user`, or `internal` for writes made by Kibana itself (e.g. the dispatcher). |
| `actor.profile_uid` | `keyword` | User profile uid of a `user` actor. Absent for `internal` actors and for users without a resolvable profile. |
| `action_type` | `keyword` | `fire`, `suppress`, `notified`, `ack`, `deactivate`, and related values. |
| `group_hash` | `keyword` | Series identity. |
| `alert_id` | `keyword` | Optional episode scope. Null for series-level actions such as `snooze`. Named `episode_id` before v8. |
| `alert_status` | `keyword` | Optional episode status captured with the action. Named `episode_status` before v8. |
| `rule_id` | `keyword` | Rule identifier. |
| `tags` | `keyword` | Optional tags. |
| `notification_group_id` | `keyword` | Group identity for throttling / notify tracking. |
| `source` | `keyword` | Origin marker. |
| `reason` | `text` | Human-readable explanation. |

Writers:

- `lib/dispatcher/steps/dispatch_step.ts` (with `lib/dispatcher/steps/utils/series_ledger.ts`)
- alert action routes under `server/routes/alert_actions/`

Readers:

- `lib/dispatcher/queries.ts`
- alert action clients and APIs

Runtime schema: `alertActionSchema` in `datastreams/alert_actions.ts`

## Alert action taxonomy

`action_type` is the main vocabulary carried by `.alert-actions`. In practice the current system writes two broad categories of actions.

### User or API initiated actions

These actions are created through the alert action routes and clients. They change how later dispatcher runs interpret an alert or episode.

| Action type | Written by | Meaning |
| --- | --- | --- |
| `ack` | User/API | Marks an alert or episode as acknowledged. |
| `unack` | User/API | Clears a previous acknowledgement. |
| `snooze` | User/API | Temporarily suppresses notification handling, usually with an expiry. |
| `unsnooze` | User/API | Clears an active snooze. |
| `deactivate` | User/API | Disables the alert or episode from active notification handling. |
| `activate` | User/API | Reverses a previous deactivation. |
| `tag` | User/API | Attaches tags/metadata to the alert action history. |

### Dispatcher outcome actions

These actions are written by `DispatchStep` to record what the dispatcher decided during a run, after each dispatch chunk. `fire`, `suppress` and `unmatched` are written for a series only once every action group holding one of its alerts has concluded, because one of these records hides every event of the series up to its `last_series_event_timestamp`.

| Action type | Written by | Meaning |
| --- | --- | --- |
| `fire` | Dispatcher | This episode was eligible for dispatch in the current run. |
| `notified` | Dispatcher | A notification group was actually scheduled/sent. Written once per (`action_group_id`, `alert_id`) right after the dispatch chunk, with `last_series_event_timestamp` set to the alert's event time. Used for throttling and to skip content an aborted tick already delivered. Records written before this carry no `alert_id`. |
| `suppress` | Dispatcher | The episode was intentionally not fired in this run, for example because suppression logic or throttling held it back. |
| `unmatched` | Dispatcher | The episode stayed dispatchable but matched no enabled notification policy. |

### Why both `fire` and `notified` exist

The dispatcher records both per-episode and per-group outcomes:

- `fire` means an individual episode reached the dispatch stage
- `notified` means a notification group was actually sent and is the durable record later throttling queries look at; because it is written per alert of the group as soon as the workflows are scheduled, it also tells a later tick which alerts a group already delivered when the earlier tick aborted before its series were recorded

That distinction is why `.alert-actions` stores both episode-scoped and notification-group-scoped fields.

## ES|QL views

ES|QL views are registered as `optional: true`, which lets Kibana start even on clusters without ES|QL view support.

| Key | View name | Summary |
| --- | --- | --- |
| `view:rule-events` | `$.rule-events` | Direct view of `.rule-events` |
| `view:alert-actions` | `$.alert-actions` | Direct view of `.alert-actions` |
| `view:alert-episodes` | `$.alert-episodes` | Episode-oriented projection over rule events |

Definitions live in `esql_views/`. The richest example is `esql_views/alert_episodes.ts`.

### `$.alert-episodes` cardinality bound

Its `INLINE STATS ... BY episode.id` grows with total episode count, so the definition starts with `WHERE @timestamp > NOW() - 90 days`. Do not remove it: an unbounded scan exceeds the ES|QL sub-plan size limit (~20.4 MB) and returns a non-retryable HTTP 400 (`sub-plan execution results too large`).

## Changing a datastream schema safely

Schema evolution must be backward compatible.

Allowed changes:

- adding a new optional field
- adding new application-side parsing for an existing optional field
- creating a new optional view over existing data

Disallowed changes:

- removing or renaming existing fields
- changing field types incompatibly
- making an existing optional field required

### Change recipe

1. Update the datastream mapping in `datastreams/alert_events.ts` or `datastreams/alert_actions.ts`.
2. Update the corresponding Zod schema in the same file.
3. Bump the corresponding datastream version constant when the template change requires rollover.
4. Update writers and readers that need to understand the new field.
5. Update the relevant README if the field changes the architecture or contributor mental model.

### Mapping changes that cannot be applied in place

Elasticsearch cannot apply some mapping changes to existing backing indices, for example turning a concrete field into an `alias`. For those, set `forceReset: { version }` on the resource definition, where `version` is the last datastream version with the old mapping. On startup, `DatastreamInitializer` installs the current template, then deletes a data stream created from that version or below and recreates it. Installing the template first means that a write from a node still running the previous version recreates the data stream with the current mapping. All of its documents are lost. A field renamed without an alias uses the same reset, so that no document keeps the old name.

`.rule-events` uses `forceReset: { version: 7 }` for the `episode.*` to `alert.*` rename in v8. `.alert-actions` uses `forceReset: { version: 7 }` for the `episode_id` / `episode_status` to `alert_id` / `alert_status` rename in v8, which also covers the `actor` keyword to object change in v7. Keep `forceReset.version` unchanged when bumping the datastream versions later.

## Example: adding a new optional alert event field

If you add a new optional field to `.rule-events`, the minimum change set is usually:

- `datastreams/alert_events.ts` for the mapping
- `datastreams/alert_events.ts` for `alertEventSchema`
- the writer in the rule executor or director
- any reader in dispatcher / UI / route code that consumes the field

That keeps stored schema, runtime validation, and application code aligned.

## ILM and retention

Current ILM policies keep both streams in the hot phase with rollover on:

- `30d` max age
- `50gb` primary shard size

See the `*_ILM_POLICY` definitions in the datastream files if you need to change retention behavior.

## Related server code

| Area | Role |
| --- | --- |
| `lib/services/resource_service/` | Resource registration and initialization orchestration |
| `lib/rule_executor/steps/store_alert_events.ts` | Writes `.rule-events` |
| `lib/dispatcher/steps/dispatch_step.ts` | Writes `.alert-actions` |
| `lib/dispatcher/queries.ts` | Reads from `.rule-events` and `.alert-actions` |
| `lib/director/queries.ts` | Reads latest alert state from `.rule-events` |
