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
  reconciliationIntervalMinutes: 30  # default — Task Manager cadence for the
                                     # reconciliation backstop. Min 5; lower
                                     # values catch up faster after a hook
                                     # failure but cost more SO walks against
                                     # the cases index. Picked up at plugin
                                     # start; runtime changes require a Kibana
                                     # restart (the next /reset re-applies the
                                     # current value to the rescheduled task).
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

## Data views (per-space)

A managed data view named `Cases` is bootstrapped **per space**, lazily, on
the first Cases request in that space. The id is
`cases-analytics-managed-<spaceId>`, scoped to `namespaces: [<spaceId>]`.

**Why per-space, not global.** The runtime field map is derived from template
SOs — which are themselves space-scoped. A global data view would merge every
space's runtime fields into one view, with three problems on tenants with
many spaces:

- field-picker bloat for analysts (they see thousands of fields, most
  irrelevant to their space),
- cross-space naming collisions (two spaces declaring the same
  `riskScore_as_long` for different concepts; last-write-wins resolution is
  non-deterministic),
- info leakage of field names across space boundaries.

Per-space scoping fixes all three. The underlying `.cases` index stays
cluster-level — only the view is scoped.

**Bootstrap timing.** First Cases request in a space triggers the ensure.
After that, subsequent requests skip via an in-memory cache. A new template
in a space won't appear in that space's runtime fields until either a Kibana
process restart or an operator `/reset`.

**Cross-space analytics.** No global data view is shipped. An operator who
needs a cross-space dashboard can duplicate the per-space view (saving it
without the `managed` flag), edit it to use `namespaces: ['*']`, and curate
the runtime fields they want to keep. Out of scope for the managed feature.

**DLS interaction.** Once the implicit-privileges Kibana provider for cases
lands ([elastic/elasticsearch#148331](https://github.com/elastic/elasticsearch/pull/148331)),
DLS will scope which case documents a user can read inside `.cases` (on
`cases.owner` + `kibana.space_ids`). The per-space data view is orthogonal —
it scopes the *runtime field set*, not the document set. The two compose
cleanly: a user in space A sees only space-A runtime fields **and** only
space-A cases.

## Runtime field lift

Each template-declared extended field is stored at
`cases.extended_fields.<name>_as_<type>` inside a `flattened` mapping, with
a typed runtime field published at `cases.<name>_as_<type>` — Lens and
Discover get numeric / date / boolean filter operators instead of
string-contains. The runtime field reads the raw string from
`params._source.cases.extended_fields.<...>` at query time.

`flattened` is used (not `dynamic_template`-per-key) so the index mapping
stays at one field for `extended_fields` regardless of how many distinct
snake-keys exist across templates cluster-wide. With per-key dynamic
mappings, a tenant with many templates trips ES's default
`index.mapping.total_fields.limit` (1000). The trade-off is per-doc
`_source` decode cost at query time vs `doc_values` — small for the
volumes this surface is sized for, and the runtime path was already on
the hot path for typed lookup.

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
- **`extended_fields`**: SO uses `flattened`; v2 matches. Runtime fields
  at `cases.<snake>` parse the raw string from `_source` at query time
  (see "Runtime field lift" above for the field-limit rationale).
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

Returns the enabled flag, the `.cases` index alias, a boolean indicating
whether the index actually exists (bootstrap can silently fail at start —
this is the surfacing), and the reconciliation task's last run + next run
time. Superuser only.

Example response:

```json
{
  "enabled": true,
  "index": ".cases",
  "index_exists": true,
  "reconciliation": {
    "task_type": "cases.analyticsV2.reconciliation",
    "last_run": {
      "last_run_at": "2026-05-13T15:30:00.000Z",
      "runs": 0,
      "next_run_at": "2026-05-13T16:00:00.000Z",
      "status": "idle"
    }
  }
}
```

If `enabled: true` but `index_exists: false`, plugin start's `ensureCaseIndex`
hit an error and logged at ERROR; check Kibana logs and consider hitting
`POST /reset`.

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
│   ├── dynamic_templates.ts   keyword template for observables denormalization
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
│   ├── index.ts       task type registration + scheduling (interval from
│   │                  xpack.cases.analyticsV2.reconciliationIntervalMinutes,
│   │                  default 30m)
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
