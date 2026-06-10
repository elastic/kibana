# Streams API Reference

---

## Official OpenAPI Documentation Coverage

This section maps the public Kibana and Elasticsearch streams APIs against the official OpenAPI specs published at:
- **Kibana:** https://www.elastic.co/docs/api/doc/kibana.json (tag: `streams`)
- **Elasticsearch:** https://www.elastic.co/docs/api/doc/elasticsearch.json (tag: `streams`)

### Kibana Public Streams APIs — Spec Coverage

All routes under `/api/streams/` that appear in the published Kibana spec (operationIds are from the spec):

| Method | Path | operationId | Summary |
|--------|------|-------------|---------|
| `GET` | `/api/streams` | `get-streams` | Get stream list |
| `GET` | `/api/streams/{name}` | `get-streams-name` | Get a stream |
| `PUT` | `/api/streams/{name}` | `put-streams-name` | Create or update a stream |
| `DELETE` | `/api/streams/{name}` | `delete-streams-name` | Delete a stream |
| `POST` | `/api/streams/_enable` | `post-streams-enable` | Enable streams |
| `POST` | `/api/streams/_disable` | `post-streams-disable` | Disable streams |
| `POST` | `/api/streams/_resync` | `post-streams-resync` | Resync streams |
| `POST` | `/api/streams/{name}/_fork` | `post-streams-name-fork` | Fork a stream |
| `GET` | `/api/streams/{name}/_ingest` | `get-streams-name-ingest` | Get ingest stream settings |
| `PUT` | `/api/streams/{name}/_ingest` | `put-streams-name-ingest` | Update ingest stream settings |
| `GET` | `/api/streams/{name}/_query` | `get-streams-name-query` | Get query stream settings |
| `PUT` | `/api/streams/{name}/_query` | `put-streams-name-query` | Upsert query stream settings |
| `GET` | `/api/streams/{name}/queries` | `get-streams-name-queries` | Get stream queries |
| `PUT` | `/api/streams/{name}/queries/{queryId}` | `put-streams-name-queries-queryid` | Upsert a query to a stream |
| `DELETE` | `/api/streams/{name}/queries/{queryId}` | `delete-streams-name-queries-queryid` | Remove a query from a stream |
| `POST` | `/api/streams/{name}/queries/_bulk` | `post-streams-name-queries-bulk` | Bulk update queries |
| `GET` | `/api/streams/{name}/significant_events` | `get-streams-name-significant-events` | Read the significant events |
| `POST` | `/api/streams/{name}/significant_events/_preview` | `post-streams-name-significant-events-preview` | Preview significant events |
| `POST` | `/api/streams/{name}/significant_events/_generate` | `post-streams-name-significant-events-generate` | Generate significant events |
| `GET` | `/api/streams/{streamName}/attachments` | `get-streams-streamname-attachments` | Get stream attachments |
| `PUT` | `/api/streams/{streamName}/attachments/{attachmentType}/{attachmentId}` | `put-streams-streamname-attachments-attachmenttype-attachmentid` | Link an attachment to a stream |
| `DELETE` | `/api/streams/{streamName}/attachments/{attachmentType}/{attachmentId}` | `delete-streams-streamname-attachments-attachmenttype-attachmentid` | Unlink an attachment from a stream |
| `POST` | `/api/streams/{streamName}/attachments/_bulk` | `post-streams-streamname-attachments-bulk` | Bulk update attachments |
| `POST` | `/api/streams/{name}/content/export` | `post-streams-name-content-export` | Export stream content |
| `POST` | `/api/streams/{name}/content/import` | `post-streams-name-content-import` | Import content into a stream |

#### Kibana public routes not in the spec

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/api/streams/_status` | Present in source code but absent from the published spec |

#### Spec route not in the internal route catalog

| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/api/streams/{name}/significant_events/_generate` | In the Kibana spec but not previously catalogued as a public route |

---

### Elasticsearch Streams APIs — Spec Coverage

The ES spec exposes three endpoints under the `streams` tag:

| Method | ES Path | operationId | Summary |
|--------|---------|-------------|---------|
| `GET` | `/_streams/status` | `streams-status` | Get the status of streams |
| `POST` | `/_streams/{name}/_enable` | `streams-logs-enable` | Enable a named stream |
| `POST` | `/_streams/{name}/_disable` | `streams-logs-disable` | Disable a named stream |

The Kibana streams plugin calls `/_streams/{name}/_enable` and `/_streams/{name}/_disable` during the streams enablement lifecycle. `GET /_streams/status` is not called by the Kibana plugin directly (Kibana tracks enablement state internally via `.kibana_streams`).

---

### Elasticsearch Data Stream APIs Used by the Streams Plugin — Spec Coverage

The following standard ES `/_data_stream/` APIs are called by the plugin and are also formally documented in the ES spec (tag: `data stream`):

| Method | ES Path | operationId | Summary |
|--------|---------|-------------|---------|
| `PUT` | `/_data_stream/{name}` | `indices-create-data-stream` | Create a data stream |
| `GET` | `/_data_stream/{name}` | `indices-get-data-stream` | Get data streams |
| `DELETE` | `/_data_stream/{name}` | `indices-delete-data-stream` | Delete data streams |
| `GET` | `/_data_stream/{name}/_lifecycle` | `indices-get-data-lifecycle` | Get data stream lifecycles |
| `PUT` | `/_data_stream/{name}/_lifecycle` | `indices-put-data-lifecycle` | Update data stream lifecycles |
| `DELETE` | `/_data_stream/{name}/_lifecycle` | `indices-delete-data-lifecycle` | Delete data stream lifecycles |
| `GET` | `/_data_stream/{name}/_mappings` | `indices-get-data-stream-mappings` | Get data stream mappings |
| `PUT` | `/_data_stream/{name}/_mappings` | `indices-put-data-stream-mappings` | Update data stream mappings |
| `GET` | `/_data_stream/{name}/_options` | `indices-get-data-stream-options` | Get data stream options |
| `PUT` | `/_data_stream/{name}/_options` | `indices-put-data-stream-options` | Update data stream options |
| `DELETE` | `/_data_stream/{name}/_options` | `indices-delete-data-stream-options` | Delete data stream options |
| `GET` | `/_data_stream/{name}/_settings` | `indices-get-data-stream-settings` | Get data stream settings |
| `PUT` | `/_data_stream/{name}/_settings` | `indices-put-data-stream-settings` | Update data stream settings |
| `GET` | `/_data_stream/{name}/_stats` | `indices-data-streams-stats` | Get data stream stats |
| `POST` | `/_data_stream/_modify` | `indices-modify-data-stream` | Update data streams |

---

## Kibana API → Elasticsearch Call Map

For each Kibana streams API, the ES APIs invoked on the server are listed below. Reads/writes to Kibana's own `.kibana_streams` index and saved objects are omitted — only ES cluster calls are shown.

### Public APIs

| Kibana API | ES APIs called |
|------------|---------------|
| `GET /api/streams` | `GET /_data_streams` (detect unmanaged streams), `POST /_security/has_privileges` |
| `GET /api/streams/{name}` | `GET /_data_streams/{name}`, `GET /_data_stream/{name}/_settings`, `GET /_data_stream/{name}/_lifecycle`, `GET /_data_stream/{name}/_options`, `POST /_security/has_privileges` |
| `PUT /api/streams/{name}` (full create) | `PUT /_component_template/{name}-*`, `PUT /_index_template/{name}`, `PUT /_ingest/pipeline/{name}`, `PUT /_data_stream/{name}`, `PUT /_data_stream/{name}/_lifecycle`, `PUT /_data_stream/{name}/_options` |
| `PUT /api/streams/{name}` (update) | Diff-aware subset of the above — only changed assets are re-written |
| `DELETE /api/streams/{name}` | `DELETE /_data_streams/{name}`, `DELETE /_ingest/pipeline/{name}`, `DELETE /_index_template/{name}`, `DELETE /_component_template/{name}-*`; root streams also call `POST /_streams/{name}/_disable` |
| `POST /api/streams/_enable` | `POST /_streams/logs/_enable` |
| `POST /api/streams/_disable` | `POST /_streams/logs/_disable` |
| `POST /api/streams/_resync` | Same ES asset operations as bulk upsert — full template/pipeline/lifecycle sync for every managed stream |
| `POST /api/streams/{name}/_fork` | Same as full create (child stream) + `PUT /_index_template/{parent}`, `PUT /_ingest/pipeline/{parent}` (to add routing rule) |
| `GET /api/streams/{name}/_ingest` | `GET /_data_streams/{name}`, `GET /_data_stream/{name}/_settings`, `GET /_data_stream/{name}/_lifecycle`, `GET /_data_stream/{name}/_options` |
| `PUT /api/streams/{name}/_ingest` | Diff-aware: `PUT /_ingest/pipeline/{name}`, `PUT /_data_stream/{name}/_mappings`, `POST /_data_stream/{name}/_rollover`, `PUT /_data_stream/{name}/_lifecycle`, `PUT /_data_stream/{name}/_options`, `PUT /_data_stream/{name}/_settings`, `PUT /_index_template/{name}` |
| `GET /api/streams/{name}/_query` | None (Kibana storage only) |
| `PUT /api/streams/{name}/_query` | `PUT /_views/{name}` (ES\|QL view upsert via transport) |
| `GET /api/streams/{name}/queries` | None (Kibana storage only) |
| `PUT /api/streams/{name}/queries/{queryId}` | None (Kibana storage only) |
| `DELETE /api/streams/{name}/queries/{queryId}` | None (Kibana storage only) |
| `POST /api/streams/{name}/queries/_bulk` | None (Kibana storage only) |
| `GET /api/streams/{name}/significant_events` | `esql.query` (time-bucketed event aggregation) |
| `POST /api/streams/{name}/significant_events/_preview` | `esql.query` |
| `POST /api/streams/{name}/significant_events/_generate` | `esql.query` (sample data) + LLM connector call |
| `GET /api/streams/{streamName}/attachments` | None (Kibana saved objects only) |
| `PUT /api/streams/{streamName}/attachments/{type}/{id}` | None (Kibana saved objects only) |
| `DELETE /api/streams/{streamName}/attachments/{type}/{id}` | None (Kibana saved objects only) |
| `POST /api/streams/{streamName}/attachments/_bulk` | None (Kibana saved objects only) |
| `POST /api/streams/{name}/content/export` | None (reads Kibana storage and saved objects) |
| `POST /api/streams/{name}/content/import` | Same as upsert for any stream assets being recreated |

### Internal APIs

| Kibana API | ES APIs called |
|------------|---------------|
| `GET /internal/streams` | `GET /_data_streams` (existence check), `GET /_data_stream/{name}/_lifecycle` |
| `GET /internal/streams/{name}/_details` | `esql.query` (doc count for time range) |
| `GET /internal/streams/{name}/schema/unmapped_fields` | `fieldCaps` |
| `POST /internal/streams/{name}/schema/fields_simulation` | `esql.query` (sample documents) |
| `POST /internal/streams/{name}/schema/fields_conflicts` | `fieldCaps` |
| `POST /internal/streams/{name}/processing/_simulate` | `POST /_ingest/_simulate` |
| `GET /internal/streams/{name}/failure_store/samples` | `search` against failure store backing index |
| `GET /internal/streams/{name}/lifecycle/_stats` | `ilm.explainLifecycle` |
| `GET /internal/streams/{name}/lifecycle/_explain` | `ilm.explainLifecycle` |
| `GET /internal/streams/lifecycle/_policies` | `ilm.getLifecycle` |
| `POST /internal/streams/lifecycle/_policy` | `ilm.putLifecycle` |
| `GET /internal/streams/lifecycle/_snapshot_repositories` | `snapshot.getRepository` |
| `GET /internal/streams/{name}/failure_store/stats` | `indices.getDataStream`, `indices.stats` |
| `GET /internal/streams/failure_store/default_retention` | `cluster.getSettings` |
| `POST /internal/streams/{name}/time_series` | `esql.query` |
| `GET /internal/streams/doc_counts/degraded` | `indices.getDataStream`, `search` (per-index `_ignored` field aggregation) |
| `GET /internal/streams/doc_counts/total` | `indices.getDataStream`, `indices.stats` |
| `GET /internal/streams/doc_counts/failed` | `indices.getDataStream`, `esql.query` |
| `POST /internal/streams/{name}/processing/grok/_suggestions` | `esql.query` (sample docs), then LLM connector (SSE) |
| `POST /internal/streams/{name}/processing/dissect/_suggestions` | `esql.query` (sample docs), then LLM connector (SSE) |
| `POST /internal/streams/{name}/processing/date/_suggestions` | `esql.query` (sample docs), then LLM connector (SSE) |

---

## Kibana Streams APIs

Routes are registered in `x-pack/platform/plugins/shared/streams/server/routes/`.

### Public API (`/api/streams/...`)

#### CRUD

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/streams` | List all streams (managed + unmanaged) |
| `GET` | `/api/streams/{name}` | Get a stream definition with metadata, assets, privileges, and effective lifecycle |
| `PUT` | `/api/streams/{name}` | Create or update a stream (wired, classic, or query) |
| `DELETE` | `/api/streams/{name}` | Delete a stream and its underlying ES assets |

Source: `server/routes/streams/crud/route.ts`

#### Management

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/streams/{name}/_fork` | Fork a wired stream into a child stream with a routing condition |
| `POST` | `/api/streams/_resync` | Resync all stream definitions against ES (repairs drift) |
| `GET` | `/api/streams/_status` | Get stream enablement status and `can_manage` flag |

Source: `server/routes/streams/management/route.ts`

#### Ingest Configuration

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/streams/{name}/_ingest` | Get ingest settings (processing steps, routing, field mappings) |
| `PUT` | `/api/streams/{name}/_ingest` | Update ingest settings |

Source: `server/routes/streams/ingest/route.ts`

#### Query Streams

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/streams/{name}/_query` | Get query stream settings (ES\|QL query + field descriptions) |
| `PUT` | `/api/streams/{name}/_query` | Create or update query stream settings |

Source: `server/routes/streams/query/route.ts`

#### Enablement

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/streams/_enable` | Enable wired streams functionality |
| `POST` | `/api/streams/_disable` | Disable wired streams and remove all managed definitions |

Source: `server/routes/streams/enablement/route.ts`

#### Attachments

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/streams/{streamName}/attachments` | List attachments linked to a stream (dashboards, rules) |
| `PUT` | `/api/streams/{streamName}/attachments/{type}/{id}` | Link an attachment to a stream |
| `DELETE` | `/api/streams/{streamName}/attachments/{type}/{id}` | Unlink an attachment |
| `POST` | `/api/streams/{streamName}/attachments/_bulk` | Bulk link/unlink attachments |

Source: `server/routes/attachments/route.ts`

#### Queries (Stream Assets)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/streams/{name}/queries` | List queries linked to a stream |
| `PUT` | `/api/streams/{name}/queries/{queryId}` | Create or update a linked query |
| `DELETE` | `/api/streams/{name}/queries/{queryId}` | Delete a linked query |
| `POST` | `/api/streams/{name}/queries/_bulk` | Bulk upsert/delete linked queries |

Source: `server/routes/sig_events/queries/route.ts`

#### Significant Events

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/streams/{name}/significant_events` | Get significant events for a stream (alert index or streamed) |
| `POST` | `/api/streams/{name}/significant_events/_preview` | Preview significant event results for a query |

Source: `server/routes/sig_events/streams/significant_events/route.ts`

#### Content Packs

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/streams/{name}/content/export` | Export stream config as a ZIP content pack |
| `POST` | `/api/streams/{name}/content/import` | Import a ZIP content pack into a stream |

Source: `server/routes/content/route.ts`

---

### Internal API (`/internal/streams/...`)

#### Stream CRUD

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/internal/streams` | List streams with data stream existence and effective lifecycle |
| `GET` | `/internal/streams/{name}/_details` | Get stream details including document count for a time range |
| `GET` | `/internal/streams/_resolve_index` | Resolve a data stream name to its parent stream definition |
| `POST` | `/internal/streams/_bulk_get_summaries` | Bulk fetch stream summaries by name (max 10,000) |

Source: `server/routes/internal/streams/crud/route.ts`

#### Schema

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/internal/streams/{name}/schema/unmapped_fields` | List fields present in documents but not yet mapped |
| `POST` | `/internal/streams/{name}/schema/fields_simulation` | Simulate field definitions against sample documents |
| `POST` | `/internal/streams/{name}/schema/fields_conflicts` | Check for type conflicts across the stream hierarchy |

Source: `server/routes/internal/streams/schema/route.ts`

#### Processing / Ingest

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/internal/streams/{name}/processing/_simulate` | Simulate ingest processing on sample documents |
| `POST` | `/internal/streams/{name}/processing/grok/_suggestions` (SSE) | GenAI grok pattern suggestions |
| `POST` | `/internal/streams/{name}/processing/dissect/_suggestions` (SSE) | GenAI dissect pattern suggestions |
| `POST` | `/internal/streams/{name}/processing/date/_suggestions` (SSE) | GenAI date extraction suggestions |
| `GET` | `/internal/streams/{name}/failure_store/samples` | Fetch sample documents from the failure store |
| `GET` | `/internal/streams/ingest/processor_suggestions` | List available ingest processor types |

Source: `server/routes/internal/streams/processing/route.ts`, `server/routes/internal/streams/ingest/route.ts`

#### Lifecycle (ILM / DSL)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/internal/streams/{name}/lifecycle/_stats` | ILM phase statistics for a stream |
| `GET` | `/internal/streams/{name}/lifecycle/_explain` | Explain ILM lifecycle status per backing index |
| `GET` | `/internal/streams/lifecycle/_policies` | List all ILM policies with usage info |
| `POST` | `/internal/streams/lifecycle/_policy` | Create or update an ILM policy |
| `GET` | `/internal/streams/lifecycle/_snapshot_repositories` | List available snapshot repositories |

Source: `server/routes/internal/streams/lifecycle/route.ts`

#### Failure Store

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/internal/streams/{name}/failure_store/stats` | Failure store document count and storage size |
| `GET` | `/internal/streams/failure_store/default_retention` | Cluster default failure store retention period |

Source: `server/routes/internal/streams/failure_store/route.ts`

#### Time Series

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/internal/streams/{name}/time_series` | Get time series data for a stream via ES\|QL |

Source: `server/routes/internal/streams/time_series/route.ts`

#### Document Counts

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/internal/streams/doc_counts/degraded` | Degraded document counts per stream |
| `GET` | `/internal/streams/doc_counts/total` | Total document counts per stream |
| `GET` | `/internal/streams/doc_counts/failed` | Failed document counts per stream for a time range |

Source: `server/routes/streams/doc_counts/route.ts`

#### Onboarding

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/internal/streams/{name}/onboarding/_status` | Get onboarding workflow status |
| `POST` | `/internal/streams/{name}/onboarding/_execute` | Execute an onboarding workflow action |

Source: `server/routes/internal/streams/onboarding/route.ts`

#### Tasks

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/internal/streams/tasks/{taskId}` | Get background task status |
| `POST` | `/internal/streams/tasks/{taskId}/_cancel` | Cancel a background task |

Source: `server/routes/internal/streams/tasks/route.ts`

#### Connectors

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/internal/streams/connectors/{connectorId}` | Get a GenAI connector by ID |

Source: `server/routes/internal/connectors/route.ts`

#### Significant Events — Features

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/internal/streams/{name}/features` | List features for a stream |
| `POST` | `/internal/streams/{name}/features` | Create or update a feature |
| `DELETE` | `/internal/streams/{name}/features/{uuid}` | Delete a feature |
| `POST` | `/internal/streams/{name}/features/_identify` | Trigger background feature identification task |

Source: `server/routes/internal/sig_events/features/`

#### Significant Events — Insights

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/internal/streams/{name}/insights` | Get insights for a stream |
| `POST` | `/internal/streams/{name}/insights` | Create or update an insight |
| `POST` | `/internal/streams/_insights/_task` | Manage insights discovery background task |

Source: `server/routes/internal/sig_events/insights/route.ts`

#### Significant Events — Events / Detections / Discoveries

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/internal/streams/{name}/events/_search` | Search for significant events |
| `GET` | `/internal/streams/{name}/detections` | Get detections for a stream |
| `GET` | `/internal/streams/{name}/discoveries` | Get discoveries for a stream |

Source: `server/routes/internal/sig_events/`

#### Significant Events — Settings & Prompts

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/internal/streams/significant_events/_settings` | Get significant events settings |
| `PUT` | `/internal/streams/significant_events/_settings` | Update significant events settings |
| `PUT` | `/internal/streams/_prompts` | Override GenAI prompts for streams features |
| `DELETE` | `/internal/streams/_prompts` | Reset prompts to defaults |
| `POST` | `/internal/streams/{name}/description/_generate` (SSE) | GenAI stream description generation |
| `GET` | `/internal/streams/_significant_events/eligible` | List streams eligible for significant events extraction |

Source: `server/routes/internal/sig_events/`

#### Memory

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/internal/streams/memory/entries` | Create a memory page |
| `GET` | `/internal/streams/memory/entries/{id}` | Get a memory page by ID |
| `GET` | `/internal/streams/memory/entries/by-name` | Get a memory page by name |
| `PUT` | `/internal/streams/memory/entries/{id}` | Update a memory page |
| `DELETE` | `/internal/streams/memory/entries/{id}` | Delete a memory page |
| `POST` | `/internal/streams/memory/entries/{id}/rename` | Rename a memory page |
| `POST` | `/internal/streams/memory/search` | Search memory pages |
| `GET` | `/internal/streams/memory/categories` | Get memory category tree |
| `GET` | `/internal/streams/memory/entries/{id}/history` | Get version history for a memory page |
| `GET` | `/internal/streams/memory/entries/{id}/history/{version}` | Get a specific version |
| `GET` | `/internal/streams/memory/recent-changes` | List recent changes across all memory pages |
| `POST` | `/internal/streams/memory/_scrape_conversations` | Trigger conversation scraping for memory |
| `POST` | `/internal/streams/memory/_consolidate` | Trigger memory consolidation |
| `POST` | `/internal/streams/{streamName}/memory/_generate` | Generate memory from discovery indicators |

Source: `server/routes/internal/memory/route.ts`

#### Classic Streams

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/internal/streams/_classic_status` | Get classic streams status and `can_manage` flag |

Source: `server/routes/streams/management/route.ts`

#### Content Packs (Internal)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/internal/streams/{name}/content/preview` | Preview contents of a ZIP content pack |

Source: `server/routes/content/route.ts`

---

## Elasticsearch Streams APIs

These are the ES-native streams endpoints (`/_streams/`) that Kibana calls via `esClient.transport.request`.

| Method | ES Path | Description |
|--------|---------|-------------|
| `GET` | `/_streams` | List all ES-managed streams |
| `POST` | `/_streams/{name}/_enable` | Enable a root stream in Elasticsearch |
| `POST` | `/_streams/{name}/_disable` | Disable a root stream in Elasticsearch |

These are called from `server/lib/streams/` during enable/disable of the wired streams feature and deletion of root streams.

### ES|QL Views

Query streams are backed by ES\|QL views, also accessed via transport:

| Method | ES Path | Description |
|--------|---------|-------------|
| `GET` | `/_views` | List all ES\|QL views |
| `PUT` | `/_views/{name}` | Create or update an ES\|QL view |
| `DELETE` | `/_views/{name}` | Delete an ES\|QL view |

Source: `server/lib/streams/esql_views/manage_esql_views.ts`

---

## Non-Streams ES APIs Called by the Streams Plugin

These are standard Elasticsearch APIs (not `/_streams/` or `/_views/`) that the streams plugin uses to manage underlying infrastructure.

### Data Streams

| ES Client Method | Description |
|------------------|-------------|
| `indices.createDataStream({ name })` | Create a new data stream |
| `indices.deleteDataStream({ name })` | Delete a data stream and all backing indices |
| `indices.getDataStream({ name })` | Fetch data stream metadata and backing index info |
| `indices.rollover({ alias, lazy })` | Trigger a lazy rollover on a data stream |
| `indices.putDataStreamSettings({ name, body })` | Update data stream index settings (replicas, shards, etc.) |
| `indices.putDataStreamOptions({ name, body })` | Set data stream options (failure store config) |
| `indices.putSettings({ index, body })` | Update index-level settings |
| `indices.exists({ index })` | Check whether a data stream exists |

### Index Templates

| ES Client Method | Description |
|------------------|-------------|
| `indices.getIndexTemplate()` | List all index templates |
| `indices.getIndexTemplate({ name })` | Get a specific index template |
| `indices.putIndexTemplate(template)` | Create or update an index template |
| `indices.deleteIndexTemplate({ name })` | Delete an index template |
| `indices.simulateIndexTemplate({ name })` | Simulate template application (used to detect unmanaged streams) |

### Component Templates

| ES Client Method | Description |
|------------------|-------------|
| `cluster.getComponentTemplate({ name })` | Get a component template |
| `cluster.putComponentTemplate(component)` | Create or update a component template |
| `cluster.deleteComponentTemplate({ name })` | Delete a component template |

### Ingest Pipelines

| ES Client Method | Description |
|------------------|-------------|
| `ingest.getPipeline({ id })` | Fetch an ingest pipeline |
| `ingest.putPipeline(pipeline)` | Create or update an ingest pipeline |
| `ingest.deletePipeline({ id })` | Delete an ingest pipeline |
| `transport.request POST /_ingest/_simulate` | Simulate pipeline processing against sample documents |

### Index Lifecycle Management (ILM)

| ES Client Method | Description |
|------------------|-------------|
| `ilm.getLifecycle()` | List all ILM policies |
| `ilm.getLifecycle({ name })` | Get a specific ILM policy |
| `ilm.putLifecycle({ name, policy })` | Create or update an ILM policy |
| `ilm.explainLifecycle({ index })` | Explain ILM lifecycle state per backing index |

### Data Stream Lifecycle (DSL)

| ES Client Method | Description |
|------------------|-------------|
| `indices.putDataLifecycle({ name, policy })` | Set DSL lifecycle on a data stream |
| `indices.deleteDataLifecycle({ name })` | Remove DSL lifecycle from a data stream |
| `indices.explainDataLifecycle({ index })` | Explain DSL lifecycle state per backing index |

### Search & Field Inspection

| ES Client Method | Description |
|------------------|-------------|
| `search(params)` | Execute searches (field sampling, degraded/failed doc counts) |
| `fieldCaps({ index, fields })` | Get field capabilities (used to detect unmapped fields) |
| `indices.getMapping({ index })` | Fetch index mappings |
| `indices.get({ index })` | Get index metadata |
| `indices.stats({ index })` | Get index statistics (document count, storage size) |

### ES|QL

| ES Client Method | Description |
|------------------|-------------|
| `esql.query({ query })` | Execute ES\|QL queries (time series, sampling, significant events) |

### Security

| ES Client Method | Description |
|------------------|-------------|
| `security.hasPrivileges({ cluster, index })` | Check cluster and per-index privileges for the current user |
| `security.authenticate()` | Verify the current user session |

### Cluster

| ES Client Method | Description |
|------------------|-------------|
| `cluster.getSettings()` | Read cluster settings (e.g. default failure store retention) |

### Snapshots

| ES Client Method | Description |
|------------------|-------------|
| `snapshot.getRepository({ name })` | List snapshot repositories (used in lifecycle policy UI) |
