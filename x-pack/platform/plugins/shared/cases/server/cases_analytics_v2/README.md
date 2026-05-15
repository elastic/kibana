# Cases Analytics v2 — case surface

Cluster-level analytics index for the cases plugin, populated by real-time
saved-object hooks with periodic reconciliation as the durability backstop.
Replaces the per-(space × owner) reindex pipeline at `server/cases_analytics/`.

## Status

v2 is gated by `xpack.cases.analyticsV2.enabled` (default `false`). v1
(`server/cases_analytics/`) remains the primary path while v2 is being
validated.

This module ships only the **case surface** (`.cases`). The activity
surface (`.cases-activity`) lands in a follow-up PR; the file-layout,
data-view, and reconciliation infrastructure here is structured to
accept it without rework.

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

## Index

`.cases` — `index.mode: lookup`, hidden by default, one doc per case.

Lookup mode lets future analytics surfaces (e.g. the activity surface in PR
2) `LOOKUP JOIN` the cases dimension table from ES|QL — "for each activity
row, what's the current case title / severity / owner?" without
denormalization at write time. Lookup mode is Technical Preview as of
Elasticsearch 8.18 / 9.0; the breaking-change risk is acceptable for cases
data because the dataset fits comfortably (single shard handles ~50GB; a
tenant with millions of cases at ~2KB/doc is a few GB at most).

## Configuration

```yaml
xpack.cases.analyticsV2:
  enabled: false # default — set to true to opt in
  reconciliationIntervalMinutes:
    30 # default — Task Manager cadence for the
    # reconciliation backstop. Min 5; lower
    # values catch up faster after a hook
    # failure but cost more SO walks against
    # the cases index. Picked up at plugin
    # start; runtime changes require a Kibana
    # restart (the next /reset re-applies the
    # current value to the rescheduled task).
  enable_admin_routes:
    false # default — set to true to register the
    # mutating administrator routes (/reset and
    # /reconcile/run_soon). The read-only /state
    # route is unaffected (always registered
    # while analyticsV2.enabled is true). See
    # "Admin routes" below for the rationale.
```

When `analyticsV2.enabled: false`, the v2 service is a no-op. Nothing
registers, nothing schedules, nothing writes. v1 is unaffected regardless of
v2's state. When `analyticsV2.enable_admin_routes: false` (the default) but
`analyticsV2.enabled: true`, v2 runs normally and `/state` is reachable; only
the two mutating routes return HTTP 404.

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

A future Kibana-side provider (built on the `ImplicitPrivilegesProvider` SPI
tracked in [elastic/elasticsearch#147176](https://github.com/elastic/elasticsearch/pull/147176))
will scope which case documents a user can read inside `.cases` via DLS on
`cases.owner` + `kibana.space_ids`. Until that lands, role-granted access to
`.cases` is unrestricted across cases — apply with care.

## Data views (per-space)

A managed data view named `Case Analytics` is bootstrapped **per space**,
lazily, on the first Cases request in that space. The id is
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
process restart, an administrator `/reset`, or a template create / update /
delete in that space (the templates service fires a refresh callback).

**Cross-space analytics.** No global data view is shipped. An administrator
who needs a cross-space dashboard can duplicate the per-space view (saving
it without the `managed` flag), edit it to use `namespaces: ['*']`, and
curate the runtime fields they want to keep. Out of scope for the managed
feature.

## Runtime field lift

Each template-declared extended field is stored at
`cases.extended_fields.<name>_as_<type>` inside a `flattened` mapping, with
a typed runtime field published at `cases.<name>_as_<type>` — Lens and
Discover get numeric / date / boolean filter operators instead of
string-contains. The runtime field reads the value via
`doc['cases.extended_fields.<name>_as_<type>']` at query time (flattened
sub-keys are doc-values-backed under the parent's value stream).

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

Returns the enabled flag, index info, and the reconciliation task's last
run. Superuser only.

Example response:

```json
{
  "enabled": true,
  "index": ".cases",
  "index_exists": true,
  "reconciliation": {
    "task_type": "cases.analyticsV2.reconciliation",
    "last_run": {
      "last_run_at": "2026-05-15T15:30:00.000Z",
      "runs": 0,
      "next_run_at": "2026-05-15T16:00:00.000Z",
      "status": "idle"
    }
  }
}
```

If `enabled: true` but `index_exists: false`, the bootstrap
(`ensureCaseIndex`) hit an error at plugin start and logged at ERROR; check
Kibana logs and consider `POST /reset`.

### Admin routes (mutating)

The two routes below mutate subsystem state cluster-wide and operate
**globally** across every space even when invoked from a single space's URL.
They're gated behind a second flag:

```yaml
xpack.cases.analyticsV2.enable_admin_routes: true # default false
```

When the flag is off, neither route is registered — requests return HTTP
404. The read-only `GET /state` route above is registered regardless (a
future Case Settings page polls it for health info).

### Re-run reconciliation immediately

```
POST /internal/cases/_analyticsV2/reconcile/run_soon
```

Triggers Task Manager's `runSoon` for the reconciliation task. Useful if you
suspect the primary write path dropped a case. **Requires
`xpack.cases.analyticsV2.enable_admin_routes: true`.** Superuser only.

### Reset the index

```
POST /internal/cases/_analyticsV2/reset
→ 200 OK
{
  "reset": ".cases",
  "data_views_deleted": 12
}
```

Synchronous, destructive cleanup:

1. Drops `.cases`.
2. Recreates it from scratch using the same bootstrap path as plugin start.
3. Deletes every per-space managed `Case Analytics` data view.
4. Clears the in-memory data view bootstrap cache.
5. Clears the reconciliation task's persisted cursor so the next periodic
   tick walks every case from scratch.

The next periodic reconciliation tick (or an explicit
`/reconcile/run_soon`) repopulates the index. Use for mapping migrations,
recovery from sustained writer failures, or administrator-initiated full
backfills. Superuser only. **Requires
`xpack.cases.analyticsV2.enable_admin_routes: true`.**

### Failure modes

| Symptom                                                        | Likely cause                                                          | Action                                                                                                       |
| -------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `cases-analyticsV2: write failed [...]` at WARN                | Transient ES blip                                                     | Reconciliation will repair within 30 min                                                                     |
| Sustained write failures on every case event                   | Mapping conflict (e.g. drifted schema)                                | Inspect mapping; consider POST /reset                                                                        |
| Reconciliation tick logs `processed=0` forever                 | Task state cursor stuck in the future                                 | POST /reset (clears state + repopulates)                                                                     |
| Runtime fields missing from `Cases` data view                  | Template SOs have no extended fields                                  | Check template SOs; reconciliation tick re-syncs runtime fields                                              |
| Case missing from `.cases` long after creation, no edits since | Out-of-band drift on a never-patched case (e.g. a direct ES delete)   | POST /reset. Periodic reconciliation only catches never-patched cases whose `created_at` is later than the cursor; older never-patched cases need the cursor cleared, which `/reset` does. |

## File layout

```
cases_analytics_v2/
├── README.md          this file
├── index.ts           public surface (CasesAnalyticsV2Service, writer contract)
├── service.ts         lifecycle orchestrator (setup → start → stop)
├── constants.ts       index name + administrator route URLs
│
├── ensure_indices/
│   └── case.ts        idempotent bootstrap for .cases (lookup-mode)
│
├── mappings/
│   ├── case.ts                  CASE_INDEX_MAPPING (dynamic: strict)
│   ├── dynamic_templates.ts     keyword template for observables denormalization
│   └── schema_drift.test.ts     round-trip + snake-key guards (cases)
│
├── writer/
│   ├── index.ts                 CasesAnalyticsV2Writer + V2_NOOP_WRITER
│   ├── case_doc_builder.ts      pure transform: case SO → analytics doc
│   ├── case_doc_builder.test.ts
│   ├── retry.ts                 bounded jittered exponential backoff
│   └── retry.test.ts
│
├── reconciliation/
│   ├── index.ts             periodic task type registration + scheduling
│   └── runner.ts            walks cases by `updated_at > last_run_at OR
│                            (updated_at IS MISSING AND created_at >
│                            last_run_at)` using PIT. The null branch picks up
│                            never-patched cases the writer missed at create
│                            time; the `created_at` guard keeps the per-tick
│                            walk bounded. Both the PIT open and every paged
│                            `find` opt into `namespaces: ['*']` — the
│                            unscoped internal SO client otherwise silently
│                            scopes to `default`.
│
├── data_view/
│   ├── service.ts                   ensures Cases data view; syncs runtime fields
│   ├── data_view_specs.ts           base spec (namespaces: [<spaceId>], managed: true)
│   ├── runtime_fields.ts            snake-key → painless source + runtime entry
│   └── runtime_fields.test.ts
│
└── routes/
    └── index.ts       /state, /reconcile/run_soon, /reset (superuser only)
```
