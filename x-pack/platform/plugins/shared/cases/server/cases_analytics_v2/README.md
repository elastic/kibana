# Cases Analytics v2

Cluster-level analytics indices for the cases plugin, populated by real-time
saved-object hooks with periodic reconciliation as the durability backstop.
Replaces the per-(space × owner) reindex pipeline at `server/cases_analytics/`.

## Status

v2 is gated by `xpack.cases.analyticsV2.enabled` (default `false`). v1
(`server/cases_analytics/`) remains the primary path until v2 has been
validated in production, after which v1 is removed in a follow-up PR.

This PR (PR 1 of the v2 series) ships only the **`case` surface**. Activity
and attachments arrive in subsequent PRs.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Cases SO services (services/cases)                                 │
│  ─ post-success hook ─► CasesAnalyticsV2Writer (fire-and-forget)    │
└──────────────────────────────────────┬──────────────────────────────┘
                                       │
                                       ▼
                  ┌────────────────────────────────────┐
                  │  .cases  (lookup mode, hidden)     │
                  │  one doc per case                  │
                  └────────────────────────────────────┘
                                       ▲
                                       │
                ┌──────────────────────────────────────┐
                │  Reconciliation task (every 30m)     │
                │  ─ walks SOs since last_run_at       │
                │  ─ re-emits any missed analytics doc │
                └──────────────────────────────────────┘
```

**Two write paths** — fire-and-forget hooks on every case create / patch /
delete (primary, low-latency), and a periodic reconciliation task (backstop,
catches anything the primary path missed). Both call `writer.upsertCase` /
`writer.deleteCase`, which are idempotent against the same `_id`.

## Why three indices in the final design (this PR ships one)

| Surface       | Index                | Mode                          | Source SO(s)                                          |
| ------------- | -------------------- | ----------------------------- | ----------------------------------------------------- |
| `case`        | `.cases`             | `index.mode: lookup`, hidden  | `cases`                                               |
| `activity`    | `.cases-activity`    | plain, hidden                 | `cases-user-actions`                                  |
| `attachments` | `.cases-attachments` | plain, hidden                 | `cases-comments` (legacy) + `cases-attachments` (v2)  |

`.cases` is **lookup-mode** so the activity / attachments surfaces can
`LOOKUP JOIN` it from ES|QL — "for each activity row, what's the current case
title / severity / owner?" without denormalization at write time. Lookup mode
is Technical Preview as of Elasticsearch 8.18 / 9.0; we accept the
breaking-change risk for cases data because the dataset fits comfortably
(single shard handles ~50GB; a tenant with millions of cases at ~2KB/doc is a
few GB at most).

Activity and attachments are plain regular indices — they grow per-event and
shouldn't be locked to a single shard.

## Configuration

```yaml
xpack.cases.analyticsV2:
  enabled: false                  # default — set to true to opt in
```

When `enabled: false`, the v2 service is a no-op. Nothing registers, nothing
schedules, nothing writes. v1 is unaffected regardless of v2's state.

## Authorization

Out of the box, only **superusers** can read v2 indices — they're created
hidden and no Kibana feature privilege grants access. To allow specific users:

1. Define an Elasticsearch role with `read` on the index pattern.
2. Map the role to the user via Kibana role management or the ES `_security` API.

Sample role:

```json
PUT _security/role/cases_analytics_reader
{
  "indices": [
    {
      "names": [".cases"],
      "privileges": ["read"],
      "allow_restricted_indices": true
    }
  ]
}
```

A future PR will introduce document-level security (DLS) on `cases.owner` +
`kibana.space_ids` so end users only see cases they're entitled to. Until that
ships, role-granted access is **unrestricted across cases** — apply with care.

## Data view

A managed data view named `Cases` is bootstrapped at plugin start with
`namespaces: ['*']` (visible in every space). Runtime fields lift each
template-declared extended field from its keyword index path
(`cases.extended_fields.<name>_as_<type>`) to a typed runtime field at
`cases.<name>_as_<type>` — so Lens and Discover get numeric / date / boolean
filter operators instead of string-contains. The runtime field reads from
`doc[...]` (doc_values) at query time.

The data view is reconciled on plugin start; template additions / removals
propagate within one reconciliation tick (default 30 min).

## Schema

The `.cases` index mapping mirrors the cases SO mapping at
`server/saved_object_types/cases/cases.ts` with these deliberate divergences:

- **`status` and `severity`**: SO stores numeric enums; v2 converts to human
  strings (`"low"`, `"open"`, etc.) in the doc-builder so Lens shows readable
  labels.
- **`observables`**: SO stores nested `[{ typeKey, value, description }]`; v2
  denormalizes to per-type keyword arrays — `cases.observables.url: ["..."]`,
  `cases.observables.ipv4: [...]`. Type↔value relationship preserved via the
  field path; `description` dropped (free text, not an analytics dimension).
- **`extended_fields`**: SO uses `flattened`; v2 uses `object` with a
  dynamic_template mapping every child to keyword (required so the runtime
  field lift can address each child individually).
- **`time_to_acknowledge` / `time_to_investigate` / `time_to_resolve` /
  `in_progress_at`**: present in the SO's persisted attributes but not the SO
  mapping (the SO uses `dynamic: false`); v2 maps them explicitly because
  they power SLA dashboards.
- **`settings`**: stored opaque (`enabled: false`). Per-case config isn't an
  analytics dimension.

The mapping is `dynamic: 'strict'` — any field the doc-builder emits that
isn't declared fails the write with `mapper_parsing_exception`. A
schema-drift guard test round-trips a fully-populated synthetic case and
asserts every emitted path resolves in the mapping (see
`mappings/schema_drift.test.ts`).

## Operations

### Health check

```
GET /internal/cases/_analyticsV2/state
```

Returns the enabled flag, index alias, and the reconciliation task's last
run + next run time. Superuser only.

### Re-run reconciliation immediately

```
POST /internal/cases/_analyticsV2/reconcile/run_soon
```

Triggers Task Manager's `runSoon` for the reconciliation task. Useful if you
suspect the primary write path dropped a case. Superuser only.

### Reset the index

```
POST /internal/cases/_analyticsV2/reset
```

Drops `.cases`, recreates it from scratch using the same bootstrap path as
plugin start, and schedules a follow-up reconciliation to repopulate from the
SO source of truth. Use for mapping migrations, recovery from sustained
writer failures, or operator-initiated full backfills. Superuser only.

### Failure modes

| Symptom                                          | Likely cause                          | Action                                                |
| ------------------------------------------------ | ------------------------------------- | ----------------------------------------------------- |
| `cases.analyticsV2 write failed [...]` at ERROR  | Transient ES blip                     | Reconciliation will repair within 30 min              |
| Sustained write failures on every case event     | Mapping conflict (e.g. drifted schema)| Inspect mapping; consider POST /reset                 |
| Reconciliation tick logs `processed=0` forever   | Task state cursor stuck in the future | POST /reset (clears state + repopulates)              |
| Runtime fields missing from `Cases` data view    | Template SOs have no extended fields  | Check template SOs; reconciliation tick re-syncs runtime fields |

## File layout

```
cases_analytics_v2/
├── README.md          you are here
├── index.ts           public surface (CasesAnalyticsV2Service, writer contract)
├── service.ts         lifecycle orchestrator (setup → start → stop)
├── constants.ts       index name + operator route URLs
│
├── ensure_indices/
│   └── case.ts        idempotent bootstrap for .cases (lookup-mode)
│
├── mappings/
│   ├── case.ts                CASE_INDEX_MAPPING (dynamic: strict)
│   ├── dynamic_templates.ts   keyword templates for extended_fields + observables
│   └── schema_drift.test.ts   round-trip + snake-key collision guards
│
├── writer/
│   ├── index.ts                       CasesAnalyticsV2Writer + V2_NOOP_WRITER
│   ├── case_doc_builder.ts            pure transform: case SO → analytics doc
│   ├── case_doc_builder.test.ts
│   ├── retry.ts                       bounded jittered exponential backoff
│   └── retry.test.ts
│
├── reconciliation/
│   ├── index.ts       task type registration + scheduling (30m interval)
│   └── runner.ts      walks SOs by `updated_at > last_run_at` using PIT
│
├── data_view/
│   ├── service.ts                   ensures Cases data view; syncs runtime fields
│   ├── data_view_specs.ts           base spec (namespaces: ['*'], managed: true)
│   ├── runtime_fields.ts            snake-key → painless source + runtime entry
│   └── runtime_fields.test.ts
│
└── routes/
    └── index.ts       /state, /reconcile/run_soon, /reset (superuser only)
```
