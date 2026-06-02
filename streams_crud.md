# Stream CRUD Lifecycle

This document traces the full create, read, update, and delete lifecycle of a Stream — what happens in Kibana and what happens in Elasticsearch.

---

## Data Model

Three stream types, discriminated by `type`:

| Type | Description |
|------|-------------|
| `WiredStream` | Managed ingest stream with routing, processing, and enrichment. Has child streams via routing rules. |
| `ClassicStream` | An existing Elasticsearch data stream wrapped with minimal Kibana config. |
| `QueryStream` | A read-only stream backed by an ES\|QL query (stored as an ES\|QL view). |

**Storage indexes:**
- `.kibana_streams` — Kibana's index for stream definitions (via `StorageIndexAdapter`)
- `.streams` — Elasticsearch system index for stream metadata
- Backing data stream indices — actual log/event data

---

## CRUD Endpoints

| Operation | Method | Path | Handler |
|-----------|--------|------|---------|
| Create / Update | `PUT` | `/api/streams/{name}` | `editStreamRoute` |
| List | `GET` | `/api/streams` | `listStreamsRoute` |
| Read | `GET` | `/api/streams/{name}` | `readStreamRoute` |
| Update ingest config | `PUT` | `/api/streams/{name}/_ingest` | `upsertIngestRoute` |
| Delete | `DELETE` | `/api/streams/{name}` | `deleteStreamRoute` |
| Fork | `POST` | `/api/streams/{name}/_fork` | `forkStreamsRoute` |
| Enable streams | `POST` | `/api/streams/_enable` | `enableStreamsRoute` |
| Disable streams | `POST` | `/api/streams/_disable` | `disableStreamsRoute` |

Routes are defined in:
- `x-pack/platform/plugins/shared/streams/server/routes/streams/crud/route.ts`
- `x-pack/platform/plugins/shared/streams/server/routes/streams/ingest/route.ts`

---

## Create / Update

**Route:** `PUT /api/streams/{name}`

### Kibana side

1. Route handler validates feature enablement (wired vs. query streams).
2. Checks for replicated (CCR) streams — ES-level changes are blocked for those.
3. Calls `StreamsClient.upsertStream()` (`server/lib/streams/client.ts`).
4. Converts the request into an internal `Definition` via `convertUpsertRequestIntoDefinition()`.
5. `State.attemptChanges()` orchestrates the full change lifecycle:
   - **Phase 1:** Load current state — reads all existing stream definitions from `.kibana_streams`.
   - **Phase 2:** Apply changes — mutates in-memory stream instances.
   - **Phase 3:** Validate — checks hierarchy constraints, naming rules, etc.
   - **Phase 4:** Plan — builds an `ExecutionPlan` of Elasticsearch API calls needed.
   - **Phase 5:** Commit — writes to Kibana (`.kibana_streams`) and executes the ES plan.
6. `syncAssets()` syncs linked dashboards, queries, and rules (Kibana saved objects only).

**Kibana storage written:** stream definition record in `.kibana_streams` (name, type, description, `updated_at`, ingest config, query config, field descriptions).

### Elasticsearch side

The `ExecutionPlan` determines which ES operations are needed and executes them (`execution_plan/execution_plan.ts`):

| Action | ES API |
|--------|--------|
| `upsert_component_template` | `PUT /_component_template/{name}-*` |
| `upsert_index_template` | `PUT /_index_template/{name}` |
| `upsert_ingest_pipeline` | `PUT /_ingest/pipeline/{name}` |
| `upsert_datastream` | `POST /_data_streams` (creates the data stream) |
| `upsert_dot_streams_document` | Writes definition to `.streams` system index |
| `update_lifecycle` | `PUT /_data_stream/{name}/_lifecycle` (DSL or ILM) |
| `update_failure_store` | `POST /_data_stream/{name}/_failure_store` |
| `upsert_esql_view` | Creates ES\|QL view (for `QueryStream` only) |

---

## Read

### Single stream: `GET /api/streams/{name}`

**Route handler:** `readStreamRoute` → `read_stream.ts`

**Kibana side:**
1. Fetches stream definition from `.kibana_streams`.
2. Runs `migrateOnRead()` if the stored schema is out of date.
3. Fetches linked query assets via `queryClient.getStreamToQueryLinksMap()`.
4. Fetches linked dashboards and alert rules via `attachmentClient.getAttachments()`.
5. For ingest streams: resolves ancestor chain via `getAncestors()` and computes `inherited_fields`.

**Elasticsearch side (ingest streams):**
1. `GET /_data_streams/{name}` — data stream metadata and backing index info.
2. `GET /_data_stream/{name}/_settings` — effective index settings (replicas, shards, refresh interval).
3. `GET /_data_stream/{name}/_lifecycle` — determines lifecycle type: DSL, ILM, or disabled.
4. Failure store config fetch.
5. `POST /_security/has_privileges` — per-stream read/write privilege check (if security enabled).

**Response shape** (`Streams.all.GetResponse`): stream definition + dashboards + rules + queries + privileges + `inherited_fields` + `effective_lifecycle` + `effective_settings` + `effective_failure_store`.

### Stream list: `GET /api/streams`

**Kibana side:**
1. `getManagedStreams()` — queries `.kibana_streams` for all stored definitions.
2. `getUnmanagedDataStreams()` — lists all ES data streams that have no Kibana definition.
3. Merges and deduplicates by name.
4. `checkAccessBulk()` — filters out streams the user cannot read.

**Elasticsearch side:**
- `GET /_data_streams` — full list of data streams (to detect unmanaged ones).
- `POST /_security/has_privileges` — bulk privilege check.

---

## Update

### Full update: `PUT /api/streams/{name}`

Same path as Create (upsert). The response includes `result: 'created' | 'updated'`.

### Ingest config update: `PUT /api/streams/{name}/_ingest`

**Route handler:** `upsertIngestRoute` → `ingest_upsert.ts`

1. Fetches the current stream definition and its assets.
2. Merges new ingest config into the existing definition.
3. Calls `StreamsClient.upsertStream()` — same `State.attemptChanges()` flow as Create.

The `ExecutionPlan` is diff-aware: it only emits ES actions for what actually changed.

| Changed config | ES action |
|----------------|-----------|
| Processing steps | `upsert_ingest_pipeline` / `append_processor_to_ingest_pipeline` |
| Field mappings | `update_data_stream_mappings` (may also `rollover`) |
| Lifecycle (ILM/DSL) | `update_lifecycle` |
| Failure store | `update_failure_store` |
| Shard/replica/refresh settings | `update_ingest_settings` |
| Default pipeline | `update_default_ingest_pipeline` |

---

## Delete

**Route:** `DELETE /api/streams/{name}`

### Kibana side

1. Fetches the stream definition to confirm it exists.
2. Validates deletion is permitted:
   - `logs.otel` and `logs.ecs` root streams are protected and cannot be deleted.
   - Replicated (CCR) streams cannot be deleted.
   - Classic streams not yet in Kibana storage get `ensureStream()` called first.
3. `State.attemptChanges([{ type: 'delete', name }])` — applies delete change, plans ES actions.
4. Deletes the stream definition from `.kibana_streams`.
5. Unlinks dashboard and rule attachments (Kibana saved objects in `.kibana`).
6. Deletes linked query assets.

### Elasticsearch side

| Action | ES API |
|--------|--------|
| `delete_datastream` | `DELETE /_data_streams/{name}` (also deletes all backing indices) |
| `delete_ingest_pipeline` | `DELETE /_ingest/pipeline/{name}` |
| `delete_index_template` | `DELETE /_index_template/{name}` |
| `delete_component_template` | `DELETE /_component_template/{name}-*` (only if no other templates reference them) |
| `delete_dot_streams_document` | Removes definition from `.streams` system index |
| Root stream disable | `POST /_streams/{name}/_disable` (for root streams like `logs`) |

---

## State Management Architecture

All mutating operations (create, update, delete) go through the same two-layer architecture:

```
Route Handler
    └─ StreamsClient.upsertStream() / deleteStream()
           └─ State.attemptChanges()          [server/lib/streams/state_management/state.ts]
                  ├─ Load current state        (.kibana_streams)
                  ├─ Apply changes             (in-memory)
                  ├─ Validate desired state
                  ├─ Build ExecutionPlan       [execution_plan/execution_plan.ts]
                  └─ Commit
                         ├─ Write Kibana       (.kibana_streams via StorageIndexAdapter)
                         └─ Execute ES plan    (23 possible action types)
```

This architecture ensures that ES and Kibana state are always derived from the same desired-state calculation and committed together.

---

## Replicated Streams (CCR)

Streams replicated via Cross-Cluster Replication are treated as read-only at the ES level:

- **Blocked operations:** processing, lifecycle, field overrides, failure store config, deletion.
- **Allowed operations:** description edits, dashboard/rule attachments, query links (Kibana-only).
- Detection: `dataStream.replicated === true` in the ES data stream metadata.

---

## Authorization

- `streams:read` — required for `GET` operations.
- `streams:manage` — required for `PUT` / `DELETE` / `POST` operations.
- Additional ES-level checks via `security.hasPrivileges()`:
  - Per-index `read` / `write` on the data stream name.
  - Cluster: `manage_index_templates`, `manage_ingest_pipelines`, `manage_ilm`, etc.
- Required permissions per action type are declared in `execution_plan/required_permissions.ts`.

---

## Key Source Files

| File | Purpose |
|------|---------|
| `server/lib/streams/client.ts` | `StreamsClient` — main orchestrator for all CRUD |
| `server/lib/streams/stream_crud.ts` | Helper functions: lifecycle, settings, access checks |
| `server/lib/streams/state_management/state.ts` | `State` class — desired-state engine |
| `server/lib/streams/state_management/execution_plan/execution_plan.ts` | `ExecutionPlan` — builds and runs ES action list |
| `server/lib/streams/state_management/execution_plan/types.ts` | 23 ES action type definitions |
| `server/lib/streams/data_streams/manage_data_streams.ts` | Low-level ES data stream operations |
| `server/lib/streams/storage/streams_storage_client.ts` | `.kibana_streams` index adapter |
| `server/lib/streams/helpers/ingest_upsert.ts` | Ingest config merge helpers |
| `server/routes/streams/crud/route.ts` | CRUD HTTP route definitions |
| `server/routes/streams/ingest/route.ts` | Ingest update route |
| `server/routes/streams/crud/read_stream.ts` | Read enrichment logic |
| `x-pack/platform/packages/shared/kbn-streams-schema/` | TypeScript schema / Zod models |
