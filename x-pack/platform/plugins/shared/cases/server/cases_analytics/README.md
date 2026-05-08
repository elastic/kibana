# Cases Analytics (cases-as-data)

This subsystem indexes cases-team data into three cluster-level analytics indices for downstream Lens / Discover / ES|QL consumption. It replaces the legacy per-(space, owner) reindex pipeline that was removed in PR A.

## Architecture at a glance

```
┌─────────────────────────────────────────────────────────────────────┐
│  Cases SO services (services/cases, services/user_actions)         │
│  ─ post-success hook ─►  CasesAnalyticsWriter (fire-and-forget)     │
└──────────────────────────────────────┬──────────────────────────────┘
                                       │
                                       ▼
                ┌──────────────────────────────────────┐
                │  3 cluster-level indices via aliases │
                │  ─ .cases-data.case                  │
                │  ─ .cases-data.case_activity         │
                │  ─ .cases-data.case_lifecycle        │
                └──────────────────────────────────────┘
                                       ▲
                                       │
                ┌──────────────────────────────────────┐
                │  Reconciliation task (every 30m)     │
                │  ─ walks SOs since last_run_at       │
                │  ─ re-emits any missed analytics doc │
                └──────────────────────────────────────┘
```

## Why this shape

- **Three indices, regardless of space count.** Index volume is bounded by document
  count, not by `(space × owner)`. Tenants with thousands of spaces work fine.
- **Synchronous writes from the SO layer.** Doc lands in Elasticsearch within
  milliseconds of the user's case write, with no scheduler round-trip.
- **Reconciliation is the safety net, not the primary engine.** If the synchronous
  write fails (ES blip, Kibana crash mid-request), the next reconciliation tick
  picks up the missed write within 30 minutes.
- **No transforms, no painless scripts.** Lifecycle docs are computed in-process.
  Multi-node race conditions go away.

## Surfaces

| Surface              | Document granularity     | Mutability    | Sourced from                       |
|----------------------|--------------------------|---------------|------------------------------------|
| `case`               | one doc per case         | upsertable    | `cases` SO                         |
| `case_activity`      | one doc per user-action  | append-only   | `cases-user-actions` SO            |
| `case_lifecycle`     | one doc per case         | upsertable    | case + activity history (computed) |

## File layout

```
cases_analytics/
├── README.md                    you are here
├── index.ts                     public surface (CasesAnalyticsService, writer types)
├── service.ts                   start/stop orchestrator
├── constants.ts                 surface enum, alias helpers, defaults
├── ensure_indices.ts            idempotent index template + bootstrap
│
├── ilm/
│   ├── policy.ts                hot-only default, 50GB rollover
│   └── ensure_policy.ts         idempotent put_lifecycle
│
├── mappings/
│   ├── shared.ts                envelope (kibana.space_ids, cases.owner)
│   ├── case.ts
│   ├── case_activity.ts
│   ├── case_lifecycle.ts
│   └── extended_fields.ts       dynamic templates for typed extended fields
│
├── writer/
│   ├── index.ts                 CasesAnalyticsWriter — public hook surface
│   ├── case_doc_builder.ts      Case SO → cases-data.case doc (pure)
│   ├── activity_doc_builder.ts  UserAction SO → cases-data.case_activity doc (pure)
│   ├── lifecycle_doc_builder.ts case + activity history → lifecycle doc (pure)
│   └── retry.ts                 bounded jittered backoff
│
├── reconciliation/
│   ├── index.ts                 task registration + scheduling
│   ├── runner.ts                walks SOs since last_run_at, re-emits docs
│   └── state_so.ts              cases-analytics-state SO type definition
│
├── template_fields_sync/
│   └── index.ts                 [stub] dynamic mapping updates from template SOs
│
└── migration/
    └── backfill.ts              one-shot historical backfill (reuses runner)
```

## Configuration

```yaml
xpack.cases.analytics:
  enabled: false                  # default false until DLS lands; flipped in PR C
  reconciliation:
    interval: 30m                 # tail-job cadence
  write:
    max_retries: 3
    retry_initial_delay_ms: 250
```

## Operations

### Health check

The reconciliation state SO holds the last successful run timestamp + per-surface
counters. To inspect:

```
GET .kibana/_doc/cases-analytics-state:cases-analytics-state
```

### Re-running reconciliation immediately

```
POST .task_manager/_doc/task:cases-analytics:reconciliation/_update
{ "doc": { "task": { "runAt": "<now>" } } }
```

(or use Task Manager's `runSoon` API).

### Re-running historical backfill

The `migration/backfill.ts` entry point reuses the reconciliation runner with a
`null` watermark, walking every SO across every space. Currently invoked from a
dev script or test; a future operator route is on the roadmap.

### Failure modes

| Symptom                                      | Likely cause                       | Action                                 |
|----------------------------------------------|------------------------------------|----------------------------------------|
| `cases.analytics write failed [...]` warning | Transient ES blip                  | Reconciliation will recover within 30m |
| Sustained write failures on one surface      | Mapping conflict (extended fields) | Inspect index template; coordinate with template-fields sync |
| Reconciliation log shows `cases=0` forever   | State SO watermark stuck in future | Manually delete the state SO to reset  |

## Extended fields and the `_as_<type>` naming invariant

Templates declare typed extended fields via snake-keys of the form
`<name>_as_<type>` (e.g. `riskScore_as_long`, `incidentDate_as_date`). The
case writer indexes those values as **keywords** under
`cases.extended_fields.<snake>`, then the data view publishes a typed
**runtime field** as a direct child of `cases` — at `cases.<snake>` (e.g.
`cases.riskScore_as_long`) — so Lens / Discover surface numeric, date, and
boolean filter operators instead of string contains.

The runtime field deliberately **does not shadow** the indexed keyword path.
Kibana data views resolve a field name by merging `{ ...runtime, ...mapped }`,
which means a runtime field at the indexed name (`cases.extended_fields.foo`)
is silently overwritten by the mapped keyword and Lens loses the typed
operators. Publishing at `cases.<snake>` sidesteps that.

**Schema invariant: no field on a `cases-data` index mapping may have a leaf
segment ending in `_as_<type>` for any supported suffix.** If one ever did,
the runtime field would collide and disappear silently from Lens. The strict
collision is at the exact path `cases.<snake>`; the broader leaf-segment rule
is defense in depth against naming confusion and future widening of the
publication scheme. Enforced at CI time by `mappings/schema_drift.test.ts`,
which iterates over `ALL_TEMPLATE_TYPE_SUFFIXES` from
`data_view/runtime_fields.ts`. New case-mapping fields must avoid the
`_as_<type>` suffix shape.

`unsigned_long` is mapped to the `long` runtime type; values exceeding
`Long.MAX_VALUE` lose precision when surfaced through the data view but
remain accurate at the indexed level. A future improvement could use a typed
sub-field at the index level for unsigned_long specifically.

## Authorization

PR B does NOT wire any user-facing privileges. The writer runs as the internal
Kibana user; end users have no read path to `.cases-data.*` until PR C lands the
`cases_analytics` sub-feature privilege and the matching
`kibana-cases-security` Elasticsearch plugin's `ImplicitPrivilegesProvider`
translates that privilege into DLS on `cases.owner` + `kibana.space_ids`.
