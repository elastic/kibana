# Significant Events Evaluations

Evaluations for Significant Events, which assess the quality of LLM-based Knowledge Indicator (KI) feature extraction, KI query generation, KI feature exclusion, and KI feature duplication across failure scenarios.
These evaluations support both qualitative (LLM-as-a-judge + deterministic CODE evaluators) and quantitative (trace-based) metrics.

For general information about writing evaluation tests, configuration, and usage, see the main [`@kbn/evals` documentation](../kbn-evals/README.md).

## Evaluation suites

| Suite | Spec | What it measures |
| --- | --- | --- |
| **KI feature extraction** | `ki_feature_extraction/ki_feature_extraction.spec.ts` | Can the LLM identify entities, dependencies, and infrastructure from raw log samples? |
| **KI query generation** | `ki_query_generation/ki_query_generation.spec.ts` | Can the LLM produce valid, hit-producing ES\|QL rules for significant event detection? |
| **KI feature exclusion** | `ki_feature_exclusion/ki_feature_exclusion.spec.ts` | Does the LLM respect excluded features and avoid regenerating them in follow-up runs? |
| **KI feature duplication** | `ki_feature_duplication/ki_feature_duplication.spec.ts` | Are KIs stable and semantically unique across repeated extraction runs? |

## Prerequisites

### Snapshot data

Evaluations replay Elasticsearch snapshots from a GCS bucket (`significant-events-datasets`). The bucket is structured as:

```
significant-events-datasets/
  <run-id>/
    <dataset>/
      <scenario-snapshot>
```

Set `GCS_CREDENTIALS` before starting Scout so Elasticsearch can access the GCS repository:

```bash
export GCS_CREDENTIALS='{"type":"service_account",...}'
```

The default run ID is pinned in code (`SIGEVENTS_SNAPSHOT_RUN`). Override it at runtime:

```bash
SIGEVENTS_SNAPSHOT_RUN=2026-02-25 node scripts/evals run --suite significant-events --judge gemini-3-pro
```

### Tracing setup (optional — for token and latency metrics)

To capture trace-based metrics (input/output/cached tokens, and latency), configure tracing exporters and run the EDOT Collector.

#### Step 1: Configure tracing exporters

Add the following to `kibana.dev.yml`:

```yaml
elastic.apm.active: false
elastic.apm.contextPropagationOnly: false
telemetry.enabled: true
telemetry.tracing.enabled: true
telemetry.tracing.sample_rate: 1
telemetry.tracing.exporters:
  - http:
      url: 'http://localhost:4318/v1/traces'
```

> **Note:** `elastic.apm.active: false` and `elastic.apm.contextPropagationOnly: false` are required — Elastic APM and OpenTelemetry tracing cannot run simultaneously. The Scout `evals_tracing` config set handles this automatically, but when configuring `kibana.dev.yml` directly you must set both.

Optionally include the Phoenix exporter for a trace UI:

```yaml
telemetry.tracing.exporters:
  - phoenix:
      base_url: 'https://<my-phoenix-host>'
      public_url: 'https://<my-phoenix-host>'
      project_name: '<my-name>'
      api_key: '<my-api-key>'
  - http:
      url: 'http://localhost:4318/v1/traces'
```

#### Step 2: Start EDOT Collector

Ensure Docker is running, then start the EDOT Gateway Collector:

```bash
node scripts/edot_collector.js
```

Or point it at a separate trace cluster:

```bash
ELASTICSEARCH_HOST=https://<username>:<password>@<trace-cluster-url> node scripts/edot_collector.js
```

Without tracing infrastructure, token and latency evaluators gracefully return `score: null` — all other evaluators are unaffected.

## Running evaluations

### Start Scout server

```bash
node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet evals_tracing
```

### Run all evaluations

> **Note:** Use Gemini 3 Pro as the evaluation judge to ensure consistent scoring across models. This keeps LLM-as-a-judge criteria evaluations comparable regardless of which model is being evaluated.

```bash
node scripts/evals run \
  --suite significant-events \
  --project <connector-id> \
  --judge <gemini-3-pro-connector-id>
```

### Run a specific dataset

```bash
SIGEVENTS_DATASET=otel-demo node scripts/evals run \
  --suite significant-events \
  --project <connector-id> \
  --judge <gemini-3-pro-connector-id>
```

### Run a specific spec file

```bash
node scripts/evals run \
  --suite significant-events \
  --project <connector-id> \
  --judge <gemini-3-pro-connector-id> \
  ki_feature_extraction.spec.ts
```

### CLI options

| Flag | Description |
| --- | --- |
| `--suite` | Suite ID to run (use `significant-events`) |
| `--project` | Connector/model project to evaluate against |
| `--judge` | Connector ID for the LLM judge (use Gemini 3 Pro for consistency) |
| `--repetitions` | Number of times to repeat each evaluation example (e.g., `3`) |
| `--trace-es-url` | URL of the Elasticsearch cluster where traces are stored (e.g., `https://user:pass@trace-cluster:9200`) |
| `--dry-run` | Preview the command without executing |

### Environment variables

| Variable | Description | Default |
| --- | --- | --- |
| `SIGEVENTS_SNAPSHOT_RUN` | Run ID subfolder in GCS to replay snapshots from | `2026-02-25` |
| `SIGEVENTS_DATASET` | Dataset(s) to run (comma-separated or `all`) | `all` |
| `KI_QUERY_GENERATION_KI_FEATURE_SOURCE` | KI feature source for KI query generation (`canonical`, `snapshot`, `both`) | `both` |
| `GCS_CREDENTIALS` | GCS service account JSON for snapshot access | — |
| `TRACING_ES_URL` | Elasticsearch URL for trace queries (if traces are in a separate cluster) | Falls back to test cluster |
| `TRACING_ES_API_KEY` | API key for the trace Elasticsearch cluster | — |

## Collected metrics

### Deterministic (CODE) evaluators

| Evaluator | Suite | Description |
| --- | --- | --- |
| **type_validation** | KI feature extraction | All KI types are valid (`entity`, `infrastructure`, `technology`, `dependency`, `schema`) |
| **evidence_grounding** | KI feature extraction | Evidence strings are grounded in input documents; `evidence_doc_ids` reference real docs |
| **ki_feature_count** | KI feature extraction | KI feature count falls within expected bounds |
| **confidence_bounds** | KI feature extraction | No KI exceeds the maximum confidence threshold |
| **type_assertions** | KI feature extraction | Required types are present; forbidden types are absent |
| **ki_query_generation_code_evaluator** | KI query generation | ES\|QL syntax validity and execution hit rate |
| **ki_feature_duplication** | KI feature duplication | Structural deduplication |

### LLM-as-a-judge evaluators

| Evaluator | Suite | Description |
| --- | --- | --- |
| **scenario_criteria** | KI feature extraction, KI query generation | Scenario-specific criteria (e.g. "must identify payment service") |
| **llm_exclude_compliance** | KI feature exclusion | Excluded features are not regenerated in follow-up identification runs |
| **llm_semantic_uniqueness** | KI feature duplication | Semantic deduplication across KIs |
| **llm_id_consistency** | KI feature duplication | Same KI ID refers to the same concept across runs |

### Trace-based evaluators

| Evaluator | Description |
| --- | --- |
| **Input Tokens** | Total input tokens consumed per evaluation |
| **Output Tokens** | Total output tokens generated per evaluation |
| **Cached Tokens** | Total cached input tokens used per evaluation |
| **Latency** | Duration of the `ChatComplete` inference span |

## Adding a new dataset

### 1. Create a capture script

Each dataset should have its own capture script under `scripts/` so that snapshot creation is fully reproducible. See [`capture_otel_demo_snapshots.ts`](scripts/capture_otel_demo_snapshots.ts) as the reference implementation.

A capture script typically:

1. Connects to Elasticsearch and Kibana (via `getConnectionConfig`)
2. Registers a GCS snapshot repository (via `registerGcsRepository`)
3. Generates or ingests log data into `logs*` (dataset-specific — e.g. deploy an app, run synthtrace, replay from an external source)
4. Enables Streams and triggers KI feature extraction (via the shared `significant_events_workflow` helpers)
5. Snapshots `logs*` and extracted KIs to GCS (via `createSnapshot`)
6. Cleans up between scenarios

The shared helpers in `scripts/lib/` handle GCS registration, snapshot creation, KI feature extraction orchestration, and ES/Kibana connection — the capture script only needs to provide the data generation logic specific to its dataset.

Register the script entry point in `scripts/` (e.g. `scripts/capture_sigevents_my_app_snapshots.js`) so it can be run with:

```bash
node scripts/capture_sigevents_my_app_snapshots.js --connector-id <id> --run-id <run-id>
```

### 2. Define the dataset and evaluation criteria

1. Create a dataset file in `src/datasets/` (e.g. `my_app.ts`, following the [`otel_demo.ts`](src/datasets/otel_demo.ts) pattern)
2. Define scenarios with evaluation criteria
3. Register the dataset in `src/datasets/index.ts`

### 3. Run evals

```bash
SIGEVENTS_DATASET=my-app node scripts/evals run --suite significant-events --judge <gemini-3-pro-connector-id>
```

## Adding a new eval spec

1. Create a spec file under `evals/` (e.g. `my_eval/my_eval.spec.ts`)
2. Add evaluators in `src/evaluators/` (e.g. `my_eval_evaluators.ts`) — code evaluators for deterministic checks and LLM-as-a-judge evaluators for qualitative criteria. See the existing files for reference (e.g. [`ki_feature_extraction/evaluators.ts`](src/evaluators/ki_feature_extraction/evaluators.ts))
3. If the dataset defines evaluation criteria per scenario, you can reuse the [`scenario_criteria evaluator`](src/evaluators/scenario_criteria/evaluators.ts) - it automatically scores LLM output against the dataset's criteria using an LLM judge, so you don't need to write custom LLM evaluators for each spec
4. Wire up the spec with the dataset scenarios and evaluators
