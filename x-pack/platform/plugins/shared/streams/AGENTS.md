# Streams Plugin — Agent Context

This file gives AI agents working in this plugin the context needed to contribute effectively to the **Significant Events** feature.

## SOP: keeping this file up to date

When you make any of the following changes, update the relevant section of this file in the same PR/commit:

- **Type or interface change** — adding, removing, or renaming a field on any of the types documented in the [Glossary](#glossary) (`Feature`, `StreamQuery`, `QueryLink`, `QueryFeature`, `Detection`, `Discovery`, `SigEvent`, or the root KI fields).
- **New domain concept** — introducing a new entity or data structure that plays a meaningful role in the Significant Events pipeline.
- **Concept renamed** — renaming an existing concept, type, constant, or data stream.
- **Pipeline change** — altering the order or behaviour of the steps described in [System description](#system-description) (e.g. a new processing stage, a removed stage, a changed trigger).
- **New or changed API route** — adding, removing, or altering any route listed in [API routes](#api-routes).
- **Configuration change** — adding, removing, or changing the default of a field in `SigEventsTuningConfig`.
- **New feature type constant** — adding a new `*_FEATURE_TYPE` constant.
- **New package or directory** — adding a new package to the ecosystem or a new subdirectory that changes where a category of code should live; update the [Where to put things](#where-to-put-things) table.

The goal is for this file to remain an accurate, single source of truth. A stale AGENTS.md is worse than no AGENTS.md — agents that act on wrong type shapes or missing concepts will produce incorrect code.

## System description

The Significant Events system surfaces meaningful occurrences in streaming observability data (logs, traces, metrics) so that engineers can understand what happened in their environment without manually trawling through raw data.

The pipeline works as follows:

1. **Feature extraction** — the system analyses a stream's data and extracts structural patterns (log patterns, error clusters, entity types, infrastructure topology, etc.) called **Features**. Features are stored as **Knowledge Indicators** of type `'feature'`.
2. **Query generation** — an AI/LLM task reads the identified Features and generates ES|QL **Queries** that can detect or measure each feature. Queries are also stored as **Knowledge Indicators** of type `'query'`.
3. **Rule backing** — queries with a `severity_score` of 60 or above are promoted to Kibana alert rules. Once a backing rule exists, `rule_backed: true` is set on the query's Knowledge Indicator.
4. **Detection** — the backing rules emit alerts. Each cluster of related alerts is captured as a **Detection**.
5. **Discovery** — an AI workflow groups one or more Detections into a **Discovery**: an intermediate analytical result that identifies a root cause, impact, and recommendations.
6. **Significant Event** — once a Discovery is processed, a **Significant Event** is published. This is the human-reviewable artifact surfaced in the UI with a title, summary, status, and linked evidence.

All entities are stored in dedicated Elasticsearch data streams (see [Data streams](#data-streams)).

---

## Glossary

### Knowledge Indicator (KI)

A Knowledge Indicator is the abstract container persisted in the `.significant_events-knowledge_indicators` data stream. It is a discriminated union: every document has a `type` field of either `'feature'` or `'query'`.

Schema root fields shared by both KI types:

```typescript
{
  '@timestamp': string;          // ISO datetime of creation/update
  id: string;                    // Unique identifier within the stream
  type: 'feature' | 'query';    // Discriminator
  title: string;
  description: string;
  tags?: string[];
  evidence?: string[];
  'stream.name': string;         // The stream this KI belongs to
  deleted?: boolean;             // Tombstone marker
  excluded?: boolean;            // Explicitly ignored by the user
  run_id?: string;               // ID of the extraction run that produced this KI
  expires_at?: string;           // ISO datetime — auto-expiration (TTL)
  search_embedding?: number[];   // Semantic embedding for hybrid search
}
```

KI management is handled by `KnowledgeIndicatorClient` (`server/lib/streams/ki/knowledge_indicator_client/knowledge_indicator_client.ts`). Key methods:

| Method | Purpose |
|---|---|
| `bulk(stream, operations)` | Index, delete, exclude, or restore KIs in batch |
| `getFeatures(streams, options)` | Retrieve Feature KIs with optional filters |
| `getExcludedFeatures(stream)` | Return features the user has explicitly excluded |
| `getStreamToQueryLinksMap()` | Return all Query KIs keyed by stream name |
| `getQueryLinks()` | Return all Query KIs |

---

### Feature

A Feature is a structural characteristic extracted from a stream's data. Features serve as the input for query generation — the LLM reads them to understand what patterns exist before writing ES|QL.

A Feature KI wraps a `Feature` object (schema: `kbn-streams-schema/src/feature.ts`):

```typescript
interface Feature {
  id: string;                    // URL-safe slug (normalized, lowercased)
  uuid: string;                  // Deterministic v5 UUID derived from (stream_name, type, id)
  stream_name: string;
  type: string;                  // Feature type constant (see below)
  subtype?: string;
  title?: string;
  description: string;
  properties: Record<string, unknown>;
  confidence: number;            // 0–100
  evidence?: string[];
  evidence_doc_ids?: string[];   // ES document IDs that support this feature
  tags?: string[];
  filter?: Condition;            // Optional Streamlang filter condition
  meta?: Record<string, unknown>;
  run_id?: string;
  excluded?: boolean;
  updated_at?: string;           // ISO datetime
  expires_at?: string;           // ISO datetime — TTL from updated_at + feature_ttl_days (default 30 days)
}
```

**Feature type constants:**

| Constant | Value | Description |
|---|---|---|
| `DATASET_ANALYSIS_FEATURE_TYPE` | `'dataset_analysis'` | High-level dataset profile |
| `LOG_SAMPLES_FEATURE_TYPE` | `'log_samples'` | Representative log samples |
| `LOG_PATTERNS_FEATURE_TYPE` | `'log_patterns'` | Recurring log message patterns |
| `ERROR_LOGS_FEATURE_TYPE` | `'error_logs'` | Error and exception clusters |
| `CODE_ANALYSIS_FEATURE_TYPE` | `'code_analysis'` | Source-code-derived context |

Inferred types (derived from data, not fixed constants): `'entity'`, `'infrastructure'`, `'technology'`, `'dependency'`, `'schema'`.

Features are extracted by:
- `server/lib/sig_events/features/identify_computed_features.ts` — rule/pattern-based extraction
- `server/lib/sig_events/features/identify_inferred_features.ts` — LLM-based inference

---

### Query

A Query is an ES|QL query associated with a stream. Queries are generated from Features by the AI task and persisted as `type: 'query'` Knowledge Indicators. Queries with a high enough `severity_score` are promoted to backing Kibana alert rules.

The persisted shape is `QueryLink` (schema: `kbn-streams-schema/src/queries/index.ts`):

```typescript
interface StreamQuery {
  id: string;
  title: string;
  description: string;
  type: 'match' | 'stats';      // Derived server-side from the ES|QL text
  esql: { query: string };
  severity_score?: number;       // 0–100; >= 60 → eligible for auto-rule creation
  evidence?: string[];
  features?: QueryFeature[];     // Links to the Feature IDs that motivated this query
  expires_at?: string;           // ISO datetime
}

interface QueryLink {
  query: StreamQuery;            // The query definition is NESTED, not flattened onto QueryLink
  stream_name: string;
  rule_backed: boolean;          // true once a Kibana rule has been created
  rule_id: string;               // Deterministic rule ID
  updated_at?: string;
  expires_at?: string;
}

interface QueryFeature {
  id: string;                    // Feature ID
  run_id?: string;
}
```

**Query types:**
- `'match'` — condition-based; e.g. `FROM logs-* | WHERE level == "error"`
- `'stats'` — aggregation-based; e.g. `FROM logs-* | STATS count = COUNT(*) BY service.name`

**Severity threshold:** `HIGH_SEVERITY_THRESHOLD = 60`. Queries at or above this score are eligible for automatic promotion to Kibana alert rules via `POST /internal/streams/queries/_promote`.

Queries are persisted by `server/lib/sig_events/persist_queries.ts` and generated by `server/lib/sig_events/generate_significant_events.ts`.

---

### Detection

A Detection is a raw alert/signal: the lowest-level entity in the pipeline. It is created when a backed rule fires.

Schema (`kbn-streams-schema/src/sig_events/detections/index.ts`):

```typescript
interface Detection {
  '@timestamp': string;
  kind: 'detection' | 'quiet' | 'handled';
  processed: boolean;            // true once consumed by a Discovery workflow

  detection_id: string;
  rule_uuid: string;
  rule_name: string;
  stream_name?: string;

  alert_count?: number;
  alert_index?: string;
  peak_alert_count?: number;

  detection_evidence?: {
    change_point_type?: string;
    p_value?: number;
  };

  alert_samples?: Record<string, unknown>[];
  rules_activity?: Record<string, unknown>[];

  workflow_execution_id?: string;
  resolution_lookback_minutes?: number;
}
```

Stored in: `.significant_events-detections` (90-day retention).

---

### Discovery

A Discovery is an intermediate analytical result produced by an AI workflow that groups one or more Detections. It captures the AI's analysis — root cause, impact, recommendations — before being promoted to a Significant Event.

Schema (`kbn-streams-schema/src/sig_events/discoveries/index.ts`):

```typescript
interface Discovery {
  '@timestamp': string;
  kind: 'discovery' | 'clearance' | 'handled';
  discovery_id: string;
  discovery_slug: string;        // Stable identifier that groups related events over time
  discovered_at?: string;
  processed: boolean;

  title: string;
  summary: string;
  root_cause: string;
  criticality: number;
  confidence: number;
  impact: string;

  rule_names: string[];
  stream_names: string[];

  detections: {
    kind: 'detection' | 'quiet' | 'handled';
    detection_id?: string;
    rule_name?: string;
    rule_uuid?: string;
    stream_name?: string;
    change_point_type?: string;
    p_value?: number;
    event_count?: number;
    alert_count?: number;
  }[];

  dependency_edges?: { source: string; target: string; protocol?: string; exposure?: string }[];
  infra_components?: { title?: string; workloads?: string[]; exposure?: string }[];
  cause_kis?: { name?: string; stream_name?: string }[];
  evidences?: {
    rule_name?: string;
    result?: string;
    description?: string;
    stream_name?: string;
    row_count?: number;
    collected_at?: string;
    esql_query?: string;
    confirmed?: boolean;
  }[];

  parent_discovery_id?: string;
  grouped_discovery_ids?: string[];
  grouping_rationale?: string;
  previous_discovery_id?: string;
  change_point_occurrence?: string;

  workflow_execution_id?: string;
  conversation_id?: string;
  closed_by_execution_id?: string;
}
```

Stored in: `.significant_events-discoveries` (90-day retention).

---

### Significant Event

A Significant Event is the final, user-facing artifact. It is created from a processed Discovery and is what the UI surfaces to the operator.

Schema (`kbn-streams-schema/src/sig_events/events/index.ts`):

```typescript
interface SigEvent {
  '@timestamp': string;
  created_at: string;
  event_id: string;              // UUID for this specific event instance
  discovery_id?: string;         // Parent Discovery
  discovery_slug: string;        // Groups related events across time
  previous_event_id?: string;    // Links corrections/updates into a chain

  status: 'promoted' | 'acknowledged' | 'demoted' | 'resolved';
  workflow_execution_id?: string;

  stream_names: string[];
  rule_names?: string[];

  title: string;                 // Max 500 chars
  summary: string;               // Executive summary, max 4000 chars
  root_cause: string;            // Max 4000 chars
  criticality: number;
  confidence: number;
  recommendations: string[];     // Max 50 items, 1000 chars each
  assessment_note?: string;

  dependency_edges?: { source: string; target: string; protocol?: string; exposure?: string }[];
  infra_components?: { title?: string; workloads?: string[]; exposure?: string }[];
  cause_kis?: { name?: string; stream_name?: string }[];
  evidences?: {
    rule_name?: string;
    result?: string;
    description?: string;
    stream_name?: string;
    row_count?: number;
    collected_at?: string;
    esql_query?: string;
    confirmed?: boolean;
  }[];
}
```

**Status lifecycle:**

| Status | Meaning |
|---|---|
| `'promoted'` | Elevated — requires attention |
| `'acknowledged'` | Reviewed by an operator |
| `'demoted'` | Reduced in importance |
| `'resolved'` | Problem has been addressed |

Stored in: `.significant_events-events`.

---

## Data streams

| Data stream | Contents | Retention |
|---|---|---|
| `.significant_events-knowledge_indicators` | Features and Queries (KIs) | TTL per document (`expires_at`) |
| `.significant_events-detections` | Raw alert/signal detections | 90 days |
| `.significant_events-discoveries` | AI-grouped discovery analyses | 90 days |
| `.significant_events-events` | User-facing Significant Events | — |

Data stream setup and index mappings live under `server/lib/streams/ki/data_stream.ts` and `server/lib/sig_events/*/data_stream.ts`.

---

## API routes

### Public (versioned) routes — `2023-10-31`

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/streams/{name}/queries` | List all queries linked to a stream |
| `POST` | `/api/streams/{name}/queries` | Create a query |
| `PUT` | `/api/streams/{name}/queries/{queryId}` | Update a query |
| `DELETE` | `/api/streams/{name}/queries/{queryId}` | Delete a query |
| `GET` | `/api/streams/{name}/significant_events` | Read events with time-range bucketing (`from`, `to`, `bucketSize`, `query`, `searchMode`) |

### Internal routes

**Events**

| Method | Path | Description |
|---|---|---|
| `GET` | `/internal/sig_events/events` | Paginated search (`from`, `to`, `page`, `perPage`, `status`, `stream`, `search`) |
| `GET` | `/internal/sig_events/events/{id}/history` | Full history chain for one event |
| `POST` | `/internal/sig_events/events` | Bulk create events |

**Discoveries**

| Method | Path | Description |
|---|---|---|
| `GET` | `/internal/sig_events/discoveries` | Paginated search |
| `GET` | `/internal/sig_events/discoveries/{id}/history` | History chain |
| `POST` | `/internal/sig_events/discoveries` | Bulk create discoveries |

**Detections**

| Method | Path | Description |
|---|---|---|
| `GET` | `/internal/sig_events/detections` | Paginated search |
| `GET` | `/internal/sig_events/detections/{id}/history` | History chain |
| `POST` | `/internal/sig_events/detections` | Bulk create detections |

**Features (Knowledge Indicators)**

| Method | Path | Description |
|---|---|---|
| `POST` | `/internal/streams/{name}/features` | Upsert a feature |
| `PATCH` | `/internal/streams/{name}/features/{id}` | Update a feature |
| `DELETE` | `/internal/streams/{name}/features/{id}` | Delete a feature |
| `PUT` | `/internal/streams/{name}/features/{id}/_exclude` | Exclude a feature |
| `PUT` | `/internal/streams/{name}/features/{id}/_restore` | Restore an excluded feature |

**Queries (internal)**

| Method | Path | Description |
|---|---|---|
| `GET` | `/internal/streams/{name}/queries` | List queries |
| `POST` | `/internal/streams/{name}/queries/{queryId}/_status` | Check query status |
| `GET` | `/internal/streams/{name}/queries/{queryId}/occurrences` | Get query occurrences |
| `POST` | `/internal/streams/queries/_promote` | Promote unbacked queries to rule-backed (`{ queryIds?, minSeverityScore? }`) |

**Significant Events task**

| Method | Path | Description |
|---|---|---|
| `POST` | `/internal/streams/{name}/significant_events/_task` | Trigger KI query generation (`{ action: 'start' \| 'acknowledge' }`) |
| `GET` | `/internal/streams/{name}/significant_events/_status` | Check generation task status |

---

## Key source files

| File | Purpose |
|---|---|
| `kbn-streams-schema/src/queries/index.ts` | `StreamQuery`, `QueryLink`, `KnowledgeIndicator` types |
| `kbn-streams-schema/src/feature.ts` | `Feature` type and feature type constants |
| `kbn-streams-schema/src/sig_events/events/index.ts` | `SigEvent` schema |
| `kbn-streams-schema/src/sig_events/discoveries/index.ts` | `Discovery` schema |
| `kbn-streams-schema/src/sig_events/detections/index.ts` | `Detection` schema |
| `kbn-streams-schema/src/sig_events/common_schemas.ts` | Shared schemas (evidences, dependency edges, infra components) |
| `server/lib/streams/ki/knowledge_indicator_client/` | KI CRUD and search |
| `server/lib/sig_events/significant_events_clients.ts` | Service factories for Detection/Discovery/Event clients |
| `server/lib/sig_events/generate_significant_events.ts` | AI-driven query generation |
| `server/lib/sig_events/persist_queries.ts` | Query persistence logic |
| `server/lib/sig_events/features/identify_computed_features.ts` | Rule-based feature extraction |
| `server/lib/sig_events/features/identify_inferred_features.ts` | LLM-based feature inference |
| `common/sig_events_tuning_config.ts` | `SigEventsTuningConfig` — tuneable parameters |

---

## Configuration

`SigEventsTuningConfig` (`common/sig_events_tuning_config.ts`) controls the behaviour of the feature extraction and query generation pipeline:

| Field | Default | Description |
|---|---|---|
| `sample_size` | `20` | Number of log samples used per extraction run |
| `max_iterations` | `5` | Maximum LLM refinement iterations |
| `feature_ttl_days` | `30` | Days before an un-refreshed feature expires |
| `entity_filtered_ratio` | `0.4` | Fraction of features that may be entity-filtered |
| `diverse_ratio` | `0.4` | Fraction of features selected for diversity |
| `max_excluded_features_in_prompt` | `10` | Max excluded features shown to the LLM |
| `max_entity_filters` | `10` | Max entity filters applied per run |
| `semantic_min_score` | `0.15` | Minimum cosine similarity for semantic feature search |
| `rrf_rank_constant` | `20` | Reciprocal Rank Fusion constant for hybrid search |

---

## Where to put things

The Significant Events feature spans five packages. Use the table below to decide where new code belongs before writing any files.

### Cross-package decision table

| What you are adding | Package | Directory |
|---|---|---|
| New domain type, schema, or Zod validator | `kbn-streams-schema` | `src/sig_events/<entity>/` for SigEvent/Discovery/Detection; `src/queries/` for Query/KI types; `src/feature.ts` for Feature |
| New API request/response shape | `kbn-streams-schema` | `src/api/significant_events/` |
| New LLM prompt, agent tool, or inference workflow | `kbn-streams-ai` | `src/significant_events/` for generation logic; `src/features/` for feature identification; `src/knowledge_indicators/` for KI search |
| New computed feature provider (pattern-based extraction) | `kbn-streams-ai` | `src/features/computed/` |
| New internal HTTP route (not yet public) | `streams` plugin | `server/routes/internal/sig_events/<entity>/route.ts` |
| New public/versioned HTTP route | `streams` plugin | `server/routes/sig_events/<path>/route.ts` |
| New server-side client or service for a sig events entity | `streams` plugin | `server/lib/sig_events/<entity>/` |
| Knowledge Indicator read/write logic | `streams` plugin | `server/lib/streams/ki/knowledge_indicator_client/` |
| Kibana alert rule creation or management for queries | `streams` plugin | `server/lib/sig_events/rules/` |
| Task scheduler definitions | `streams` plugin | `server/lib/sig_events/tasks/` or `server/lib/tasks/task_definitions/` |
| Any UI component, hook, or service for sig events | `streams_app` plugin | Follow existing structure — look at where similar components/hooks/services already live |
| Any evaluation spec, dataset, evaluator, or capture script | `kbn-evals-suite-significant-events` | Follow existing structure — see the package README for a full guide |

### Key rules

- **Never add domain types directly to `streams` or `streams_app`.** Types shared across the backend and UI belong in `kbn-streams-schema`. Types only used in AI/LLM logic belong in `kbn-streams-ai`.
- **Never add LLM/inference logic to `streams`.** The `streams` plugin calls into `kbn-streams-ai`; it does not own prompts or agent tools.
- **Never add UI components to `streams`.** The `streams` plugin has no `public/components`. All UI lives in `streams_app`.
- **Internal routes go under `server/routes/internal/`.** A route is internal until it has been deliberately stabilised and versioned. Do not put new routes directly under `server/routes/sig_events/` or `server/routes/streams/` without first agreeing a public API contract.

---

## Naming conventions

### Never abbreviate "significant"

Abbreviations of *significant* in code must be avoided. Always write the full word:

| ✅ Correct | ❌ Avoid |
|---|---|
| `significantEvent` | `sigEvent` |
| `significant_event_*` | `sig_event_*` |
| `SignificantEvent` | `SigEvent` |
| `SIGNIFICANT_EVENT_*` | `SIG_EVENT_*` |

This applies to: TypeScript identifiers, file names, folder names, route paths (where not yet shipped), saved-object type names (where safe to migrate), and comments in code.
