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
| Datastream registration | `datastreams/register.ts` |
| ES|QL view definitions | `esql_views/` |
| Startup initialization | `register_resources.ts` |

`register_resources.ts` registers datastreams and ES|QL views, then asks `ResourceManager` to start initialization during plugin start.

## Design principles

| Topic | Behavior |
| --- | --- |
| Append-only storage | Both streams are written as immutable history; consumers derive state from history rather than in-place updates. |
| Strict mappings | Both data streams use `dynamic: false`. Only declared fields are indexed. |
| Runtime schema alignment | Zod schemas mirror the intended application-level document shape. |
| Versioned evolution | Datastream resources carry a version; bump it when template changes require rollover. |
| Backward compatibility | Existing fields may not be removed, renamed, or have incompatible type changes. |

## The two core streams

### `.rule-events`

Purpose: append-only rule events produced by the rule executor.

This stream is the durable history of rule evaluation.

| Field | ES type | Notes |
| --- | --- | --- |
| `@timestamp` | `date` | When the document was written. |
| `scheduled_timestamp` | `date` | When the rule run was scheduled. |
| `rule.id` | `keyword` | Rule identifier. |
| `rule.version` | `long` | Rule version at execution time. |
| `group_hash` | `keyword` | Per-rule series identity. |
| `data` | `flattened` | ES|QL row payload. |
| `status` | `keyword` | `breached`, `recovered`, or `no_data`. |
| `source` | `keyword` | Origin marker. |
| `type` | `keyword` | `signal` or `alert`. |
| `episode.id` | `keyword` | Episode id for alert-type events. |
| `episode.status` | `keyword` | `inactive`, `pending`, `active`, or `recovering`. |
| `episode.status_count` | `long` | Consecutive count within the current episode status. |

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
| `@timestamp` | `date` | Action time. |
| `last_series_event_timestamp` | `date` | Timestamp of the related series event. |
| `expiry` | `date` | Optional expiry for temporary actions such as snooze. |
| `actor` | `keyword` | Who performed the action. |
| `action_type` | `keyword` | `fire`, `suppress`, `notified`, `ack`, `deactivate`, and related values. |
| `group_hash` | `keyword` | Series identity. |
| `episode_id` | `keyword` | Optional episode scope. |
| `episode_status` | `keyword` | Optional episode status captured with the action. |
| `rule_id` | `keyword` | Rule identifier. |
| `tags` | `keyword` | Optional tags. |
| `notification_group_id` | `keyword` | Group identity for throttling / notify tracking. |
| `source` | `keyword` | Origin marker. |
| `reason` | `text` | Human-readable explanation. |

Writers:

- `lib/dispatcher/steps/store_actions_step.ts`
- alert action routes under `server/routes/alert_actions/`

Readers:

- `lib/dispatcher/queries.ts`
- alert action clients and APIs

Runtime schema: `alertActionSchema` in `datastreams/alert_actions.ts`

## ES|QL views

ES|QL views are registered as `optional: true`, which lets Kibana start even on clusters without ES|QL view support.

| Key | View name | Summary |
| --- | --- | --- |
| `view:rule-events` | `$.rule-events` | Direct view of `.rule-events` |
| `view:alert-actions` | `$.alert-actions` | Direct view of `.alert-actions` |
| `view:alert-episodes` | `$.alert-episodes` | Episode-oriented projection over rule events |

Definitions live in `esql_views/`. The richest example is `esql_views/alert_episodes.ts`.

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
| `lib/dispatcher/steps/store_actions_step.ts` | Writes `.alert-actions` |
| `lib/dispatcher/queries.ts` | Reads from `.rule-events` and `.alert-actions` |
| `lib/director/queries.ts` | Reads latest alert state from `.rule-events` |
