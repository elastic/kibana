# Elasticsearch resources

This folder defines managed Elasticsearch resources for Alerting V2: data streams with explicit mappings and ILM policies plus ES|QL views.

Entry point: [`register_resources.ts`](register_resources.ts) calls [`registerDatastreams`](datastreams/register.ts) and [`registerEsqlViews`](esql_views/register.ts), then starts `ResourceManager` initialization (see `lib/services/resource_service/`).

The field tables below match the Elasticsearch mappings in code. They are the source of truth for what gets indexed in this plugin.

---

## Design principles

| Topic | Behavior |
| --- | --- |
| Strict mappings | Both data streams use `dynamic: false`. Only listed fields are indexed; unknown fields are not mapped. |
| Versioning | Each resource has a `version` (`ALERT_*_DATA_STREAM_VERSION`). Bumping versions triggers resource-manager logic when templates or mappings change (see `DatastreamInitializer`). |
| ILM | Hot phase with rollover on 30d max age or 50gb primary shard size (see `*_ILM_POLICY` in each file). |
| Naming | Rule events live on `.rule-events`. Alert actions live on `.alert-actions`. |

---

## Data streams

| Data stream | Constants | Source file |
| --- | --- | --- |
| `.rule-events` | `ALERT_EVENTS_*` | [`datastreams/alert_events.ts`](datastreams/alert_events.ts) |
| `.alert-actions` | `ALERT_ACTIONS_*` | [`datastreams/alert_actions.ts`](datastreams/alert_actions.ts) |

Backing index patterns and ILM policy names are exported next to each data stream name (e.g. `ALERT_EVENTS_BACKING_INDEX`, `ALERT_EVENTS_ILM_POLICY_NAME`).

### `.rule-events` — rule event documents

Purpose: Append-only rule events produced by the rule executor.

| Field | ES type | Notes |
| --- | --- | --- |
| `@timestamp` | `date` | When the document was written. |
| `scheduled_timestamp` | `date` | When the rule run was scheduled. |
| `rule.id` | `keyword` | Rule identifier. |
| `rule.version` | `long` | Rule version at execution time. |
| `group_hash` | `keyword` | Series identity (rule + grouping + source). |
| `data` | `flattened` | ES\|QL row payload — computed fields from the query. |
| `status` | `keyword` | `breached` \| `recovered` \| `no_data`. |
| `source` | `keyword` | Origin (e.g. internal vs external provider). |
| `type` | `keyword` | `signal` \| `alert`. |
| `episode.id` | `keyword` | Episode UUID (alert-type events only). |
| `episode.status` | `keyword` | `inactive` \| `pending` \| `active` \| `recovering`. |
| `episode.status_count` | `long` | Consecutive evaluations in current status (for threshold strategies). |

Runtime validation: [`alertEventSchema`](datastreams/alert_events.ts) (Zod) mirrors the intended document shape for application code; keep it aligned when mappings change.

---

### `.alert-actions` — alert action documents

Purpose: Append-only alert actions: user/system operations and dispatcher outcomes (fire, suppress, notified, unmatched, etc.) used for suppression, throttling, and other semantics.

| Field | ES type | Notes |
| --- | --- | --- |
| `@timestamp` | `date` | Action time. |
| `last_series_event_timestamp` | `date` | Ties to the rule event / series the action refers to (e.g. fire filter). |
| `expiry` | `date` | Optional time-bound actions (e.g. snooze). |
| `actor` | `keyword` | Who performed the action (`system`, `human`, …). |
| `action_type` | `keyword` | e.g. `fire`, `suppress`, `notified`, `deactivate`, … |
| `group_hash` | `keyword` | Series key. |
| `episode_id` | `keyword` | Optional episode scope. |
| `episode_status` | `keyword` | Optional episode status when relevant (e.g. notified per episode). |
| `rule_id` | `keyword` | Rule identifier. |
| `tags` | `keyword` | Optional tags. |
| `notification_group_id` | `keyword` | Group id for throttle / notified tracking. |
| `source` | `keyword` | Origin (e.g. `internal`). |
| `reason` | `text` | Human-readable reason (suppression, throttle, no policy match, …). |

Runtime validation: [`alertActionSchema`](datastreams/alert_actions.ts) (Zod). Writers may populate a subset depending on `action_type`; see `lib/dispatcher/steps/store_actions_step.ts` and other producers.

---

## ES|QL views

ES|QL views registered with `optional: true` so clusters without ES|QL view support can still start. Definitions live under [`esql_views/`](esql_views/).

| Key | View name | Query (summary) |
| --- | --- | --- |
| `view:rule-events` | `$.rule-events` | `FROM .rule-events` |
| `view:alert-actions` | `$.alert-actions` | `FROM .alert-actions` |
| `view:alert-episodes` | `$.alert-episodes` | Exposes episode-oriented rows |

See [`esql_views/alert_episodes.ts`](esql_views/alert_episodes.ts) for the full ES|QL text.

---

## Changing schemas

Schema evolution must be backward compatible. Breaking changes are not allowed for existing fields (no removals, no renames, no type changes, and no changes that make an existing optional field required). New schema fields must be additive and optional so existing writers, readers, and stored documents continue to work without migration coupling.

1. Edit mappings in `datastreams/alert_events.ts` or `datastreams/alert_actions.ts`.
2. Bump the corresponding `*_DATA_STREAM_VERSION` when the change requires a new index template / rollover.
3. Update Zod schemas (`alertEventSchema`, `alertActionSchema`).

---

## Related server code

| Area | Role |
| --- | --- |
| `lib/services/resource_service/` | `ResourceManager`, `DatastreamInitializer`, `ESQLViewInitializer` |
| `lib/rule_executor/steps/store_alert_events.ts` | Ingest to `.rule-events` |
| `lib/dispatcher/steps/store_actions_step.ts` | Ingest to `.alert-actions` |
| `lib/dispatcher/queries.ts` | ES|QL reads from `.rule-events` / `.alert-actions` |
