# Cases Analytics — Server Subsystem

This directory contains the server-side implementation of Cases Analytics: the background infrastructure that continuously reindexes case data into dedicated Elasticsearch indices for dashboards and advanced querying.

---

## Table of Contents

1. [Index Architecture](#1-index-architecture)
2. [Shard Budget and Space Cap](#2-shard-budget-and-space-cap)
3. [Task Pipeline](#3-task-pipeline)
4. [Configuration Reference](#4-configuration-reference)
5. [Idle Backoff](#5-idle-backoff)
6. [Triage Guide](#6-triage-guide)
7. [Directory Map](#7-directory-map)

---

## 1. Index Architecture

Per enabled `(spaceId, owner)` pair, three Elasticsearch indices are created:

```
Kibana saved objects              Elasticsearch analytics indices
─────────────────────             ────────────────────────────────────────────────────────
                                  ALIAS (public write target)         BACKING INDEX (hidden)

cases                 ──reindex─▶  .cases-analytics.{owner}-{space}
cases-comments        (content)    └─ .internal.cases-analytics.{owner}-{space}-000001
cases-user-actions
                                       doc_type: 'case' | 'comment' | 'attachment'
                                       extended_fields.* — custom fields, dynamic typed

                      ──reindex─▶  .cases-analytics-activity.{owner}-{space}
                      (activity)   └─ .internal.cases-analytics-activity.{owner}-{space}-000001

                                       action_type: create_case | create_comment | pushed | …

                                              ↓  continuous pivot transform (5-min checkpoint)

                                   .cases-analytics-lifecycle.{owner}-{space}
                                       one doc per case:
                                       time_to_close_ms, total_comments, total_assignees …
```

### Naming conventions

| Index | Alias pattern | Backing pattern |
|-------|---------------|-----------------|
| Content | `.cases-analytics.{owner}-{spaceId}` | `.internal.cases-analytics.{owner}-{spaceId}-*` |
| Activity | `.cases-analytics-activity.{owner}-{spaceId}` | `.internal.cases-analytics-activity.{owner}-{spaceId}-*` |
| Lifecycle | `.cases-analytics-lifecycle.{owner}-{spaceId}` | n/a (transform destination, no alias) |

`{owner}` is always lowercase: `securitysolution`, `observability`, `cases`.

### Source objects

```
Content index ← cases SO   (.kibana_cases)
              ← comments SO (.kibana_cases)
Activity index ← cases-user-actions SO (.kibana_cases)
```

Each reindex runs as an async ES `_reindex` task (`wait_for_completion: false`). The task ID is tracked in the Task Manager state blob and polled on the next run.

---

## 2. Shard Budget and Space Cap

### Why this matters

Every `(spaceId, owner)` pair creates **3 primary shards**. With `auto_expand_replicas: '0-1'` the replica count doubles to 6 on any cluster with ≥ 2 data nodes. There are 3 owners, so a fully-enabled space costs:

| Cluster size | Shards per space |
|---|---|
| Single-node | 9 (3 pairs × 3 indices × 1 primary, 0 replicas) |
| Multi-node (≥ 2 data nodes) | 18 (× 2 due to auto-expand replica) |

The Elasticsearch default of `cluster.max_shards_per_node = 1000` therefore limits analytics to roughly:

| Nodes | Max spaces (default ES settings) |
|---|---|
| 1 | ~111 |
| 3 | ~167 |
| 10 | ~556 |

### The cap

`xpack.cases.analytics.index.maxAnalyticsEnabledSpaces` (default: `100`) is enforced at two layers:

**Layer 1 — API (user-visible):** The configure PATCH handler counts existing enabled `(space, owner)` pairs before writing. If `pairs.length >= max` it returns HTTP 400 with a message that includes the formula. This is the primary guard.

**Layer 2 — Scheduler (silent belt-and-suspenders):** The hourly scheduler task slices the enabled-pairs list to `max` before creating indices. Excess pairs are logged as `WARN` but not processed. This protects against concurrent PATCH races or direct SO edits that bypass Layer 1.

### Formula for operators

```
Required max_shards_per_node ≥ ceil(maxSpaces × 3 × 2 / data_node_count)
                                           ↑   ↑   ↑
                              pairs/space  │   │   auto-expand replica factor
                              indices/pair ─   │
                                               owners per space (up to 3)
```

To support 500 fully-enabled spaces on a 10-node cluster:

```yaml
# kibana.yml
xpack.cases.analytics.index.maxAnalyticsEnabledSpaces: 500

# elasticsearch.yml  (each node)
cluster.max_shards_per_node: 3000   # ceil(500 × 3 × 2 / 10) × safety margin
```

---

## 3. Task Pipeline

```
Kibana plugin start
        │
        ▼
SchedulerTask  ── every 1 hour ─────────────────────────────────────────────
        │
        ├─ ensureScheduled OwnerSyncTask(securitySolution)  ─── every 5 min
        ├─ ensureScheduled OwnerSyncTask(observability)     ─── every 5 min
        ├─ ensureScheduled OwnerSyncTask(cases)             ─── every 5 min
        │
        ├─ [one-time migration] remove legacy per-space ANALYTICS_SYNCHRONIZATION_TASK_TYPE records
        │
        └─ for each (spaceId, owner) with analytics_enabled: true
               if any of the 3 indices are missing → createCasesAnalyticsIndexesForOwnerAndSpace()
               [uses single wildcard GET .internal.cases-analytics* to avoid O(N) exists calls]


OwnerSyncTask  ── every 5 min (one task per owner type, all spaces in one run) ───────────────
        │
  Phase 1  DISCOVER   getSpacesWithAnalyticsEnabled() → OwnerSpacePair[]
  Phase 2  PARTITION  skip spaces where nextSyncAt > now (idle backoff)
  Phase 3  STATUS     tasks.get() for in-flight ES reindex task IDs stored in state
  Phase 4  MSEARCH    2 sub-queries per space — any source docs updated since lastSyncAt?
  Phase 5  FAN-OUT    start _reindex(wait_for_completion=false) for spaces with new data
                      OR increment consecutiveEmptyRuns toward idle threshold
  Phase 6  PERSIST    bulkUpdate configure SOs (analytics_last_sync_at, analytics_sync_status)
                      — fire-and-forget, does not block Phase 1–5 of the next run


LifecycleTransform  ── continuous ES pivot transform (5-min checkpoint) ──────────────────────
        │
        └─ reads from activity index → writes to lifecycle index
           (one doc per case: time_to_close_ms, total_comments, open_duration_ms, …)
           First start: from=epoch so historical activity docs are included.
```

### Task state persistence

`OwnerSyncTask` stores its full state in the Task Manager state blob (JSON). The shape per owner is:

```typescript
{
  spaceStates: {
    [spaceId: string]: {
      nextSyncAt?: string;          // ISO — skip until this time (idle backoff)
      consecutiveEmptyRuns: number; // incremented when msearch finds no new docs
      syncTasks: {
        [syncType: string]: {       // 'cai_content_sync' | 'cai_activity_sync'
          esReindexTaskId?: string; // async reindex task tracked across runs
          lastSyncSuccess?: string; // ISO — start of the last successful reindex window
          lastSyncAttempt?: string; // ISO — start of the last attempted window
        };
      };
    };
  };
}
```

---

## 4. Configuration Reference

All settings live under `xpack.cases.analytics.index.*` in `kibana.yml`.

| Setting | Default | Min | Max | Notes |
|---|---|---|---|---|
| `enabled` | `false` | — | — | Master switch. Disabling skips all tasks. |
| `reindexConcurrency` | `3` (traditional) / `1` (serverless) | `1` | `10` / `1` | Max concurrent ES `_reindex` ops across all spaces in one owner-sync run |
| `maxAnalyticsEnabledSpaces` | `100` | `1` | — | Hard cap on `(spaceId, owner)` pairs. See [Shard Budget](#2-shard-budget-and-space-cap). |

### Typical operator configurations

**Small deployment (≤ 100 spaces, single node):** defaults are fine.

**Medium deployment (≤ 500 spaces, 5-node cluster):**
```yaml
xpack.cases.analytics.index.maxAnalyticsEnabledSpaces: 500
xpack.cases.analytics.index.reindexConcurrency: 5
# Also: cluster.max_shards_per_node: 2000 in elasticsearch.yml
```

**Large deployment (≤ 2000 spaces, 20-node cluster):**
```yaml
xpack.cases.analytics.index.maxAnalyticsEnabledSpaces: 2000
xpack.cases.analytics.index.reindexConcurrency: 8
# Also: cluster.max_shards_per_node: 2000 in elasticsearch.yml
```

---

## 5. Idle Backoff

To avoid wasting ES resources polling spaces with no activity:

```
active ──── 5 consecutive empty runs ────▶ idle  (nextSyncAt = now + 30 min)
             (msearch: zero new docs, no ongoing reindex)

idle   ──── nextSyncAt expires ──────────▶ active  (reset consecutiveEmptyRuns = 0)
       ──── new docs detected ────────────▶ active  (always overrides idle)
```

A space transitions back to active immediately if new source documents are detected in the msearch phase. The idle threshold (5 runs) and backoff window (30 min) are constants in `owner_sync_task_runner.ts`.

---

## 6. Triage Guide

### "I enabled analytics but no indices appeared"

1. Confirm the scheduler task is running:
   ```
   GET .kibana_task_manager/_search?q=type:task AND task.taskType:"cases:analytics-scheduler"
   ```
2. Check Kibana server logs for `[cai-scheduler]` tags. Look for index creation errors.
3. Check if the `maxAnalyticsEnabledSpaces` cap was hit — the PATCH would have returned HTTP 400. Check browser network tab or API response.
4. Verify `analytics_enabled: true` is set on the configure SO for the correct space/owner:
   ```
   GET .kibana_cases/_search?q=type:cases-configure AND attributes.analytics_enabled:true
   ```
5. Manually trigger by restarting Kibana (scheduler runs at start) or waiting for the next hourly run.

### "Sync has stopped — data in analytics index is stale"

1. Check the owner sync task state blob:
   ```
   GET .kibana_task_manager/_search?q=type:task AND id:cases-analytics-owner-sync-{owner}
   ```
   Look at `state.spaceStates[spaceId]`:
   - `nextSyncAt` in the future → space is idle. Disable analytics and re-enable to reset.
   - `esReindexTaskId` is set → check the reindex task status:
     ```
     GET _tasks/{esReindexTaskId}
     ```
2. Check for `analyticsConfig.index.enabled: false` in the running config.
3. Check Kibana logs for `[OwnerSyncTaskRunner]` errors.
4. Check ES task queue for stuck reindexes: `GET _tasks?actions=*reindex&detailed`.

### "Spurious ERROR: 'Failed to upsert lifecycle transform'"

This was a known race condition on multi-node Kibana deployments — fixed in this PR. Two nodes would race to call `putTransform`, and the loser would log ERROR.

After this fix, concurrent creation is demoted to `debug`. If you still see this ERROR:
- The error is from `upsert()` catching something other than a race condition.
- Check the actual `error.message` in the log — if it's not `version_conflict_engine_exception`, it is a genuine ES connectivity or permission issue.
- Verify the Kibana service account has the `manage_transform` cluster privilege.

### "cluster_block_exception: too many shards"

This means `cluster.max_shards_per_node` was exceeded. Steps to resolve:

1. Identify how many analytics pairs are enabled:
   ```
   GET .kibana_cases/_count?q=type:cases-configure AND attributes.analytics_enabled:true
   ```
2. Disable analytics for excess spaces via the Cases > Configure UI.
3. Increase `cluster.max_shards_per_node` in `elasticsearch.yml` using the formula from [Section 2](#2-shard-budget-and-space-cap).
4. Increase `xpack.cases.analytics.index.maxAnalyticsEnabledSpaces` in `kibana.yml` to match the new cluster headroom.

After the fix in this PR, the PATCH handler returns HTTP 400 before the cap is reached, preventing this from happening in normal operation.

### "Analytics data view shows no data / Discover is empty"

1. Confirm the content index exists and has documents: `GET .cases-analytics.{owner}-{spaceId}/_count`
2. Confirm the data view was created for the space:
   `GET .kibana_{spaceId}/_search?q=type:index-pattern AND title:.cases-analytics*`
3. Check `analytics_last_sync_at` on the configure SO — if it's unset, no sync has completed yet.
4. Check the owner sync task logs for reindex failures (`esReindexTaskId` in state resolving to a failed task).
5. If the data view exists but has no data, check the reindex script is correct:
   `GET _scripts/{painlessScriptId}` (script ID is in the index mapping `_meta.painless_script_id`).

### "Lifecycle index is empty but activity index has data"

The lifecycle transform may not have started or may be in a failed state:

```
GET _transform/{transformId}/_stats
# transformId = cases-analytics-lifecycle-{owner}-{spaceId}
```

States:
- `started` / `indexing` → working normally, wait for checkpoint.
- `stopped` → restart: `POST _transform/{transformId}/_start`.
- `failed` → inspect `state.reason`, then delete and re-enable analytics to recreate.

---

## 7. Directory Map

```
cases_analytics/
├── README.md                          ← you are here
├── index.ts                           ← public API: createCasesAnalyticsIndexes,
│                                        registerCasesAnalyticsIndexesTasks,
│                                        createCasesAnalyticsIndexesForOwnerAndSpace
├── constants.ts                       ← shared constants (shard count, refresh interval,
│                                        sync type registry, destination index helpers)
├── analytics_index.ts                 ← AnalyticsIndex base class (upsertIndex, retry)
├── utils.ts                           ← getSpacesWithAnalyticsEnabled (paginated cross-ns query)
│                                        OwnerSpacePair type
├── config.ts                          ← re-export: ConfigType['analytics']
├── retry_service/                     ← CasesAnalyticsRetryService (full-jitter backoff)
│
├── content_index/                     ← cases + comments + attachments (doc_type discriminator)
│   ├── constants.ts                   ← index names, source query, sync type
│   ├── mappings.ts                    ← merged mapping + 8 dynamic_templates for extended_fields
│   ├── painless_scripts.ts            ← dispatches on ctx._source.type
│   └── index.ts                       ← createContentAnalyticsIndex factory
│
├── activity_index/                    ← cases-user-actions (activity events)
│   ├── constants.ts
│   ├── mappings.ts
│   └── index.ts
│
├── lifecycle_index/                   ← continuous pivot transform destination
│   ├── constants.ts                   ← transform ID, dest index name
│   ├── mappings.ts
│   ├── transform.ts                   ← getLifecycleTransformConfig (pivot definition)
│   └── index.ts                       ← LifecycleTransform class
│                                        upsert(): idempotent create/start
│                                        Race guards: resource_already_exists_exception,
│                                                     version_conflict_engine_exception
│
├── data_views.ts                      ← createAnalyticsDataViews (one data view per space)
├── dashboard.ts                       ← provisionAnalyticsDashboard (import from NDJSON)
│
└── tasks/
    ├── scheduler_task/                ← hourly task: create missing indices, ensure sync tasks
    │   ├── index.ts                   ← registerCAISchedulerTask
    │   └── scheduler_task_runner.ts   ← SchedulerTaskRunner.run()
    │                                    belt-and-suspenders: slices pairs to maxAnalyticsEnabledSpaces
    │
    ├── owner_sync_task/               ← 5-min task per owner: discover→msearch→reindex→persist
    │   ├── index.ts                   ← registerOwnerSyncTask, scheduleOwnerSyncTasks
    │   └── owner_sync_task_runner.ts  ← OwnerSyncTaskRunner (Phases 1–6 above)
    │
    ├── synchronization_task/          ← DEPRECATED no-op shim (kept for upgrade safety)
    │   └── index.ts
    │
    └── backfill_task/                 ← one-shot task: full reindex on new index creation
        ├── index.ts
        └── backfill_task_runner.ts
```
