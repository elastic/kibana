# Significant Events Evaluations

Evaluations for Significant Events, which assess the quality of LLM-based Knowledge Indicator (KI) feature extraction, KI query generation, KI feature exclusion, and KI feature deduplication across failure scenarios.
These evaluations support both qualitative (LLM-as-a-judge + deterministic CODE evaluators) and quantitative (trace-based) metrics.

For general information about writing evaluation tests, configuration, and usage, see the main [`@kbn/evals` documentation](../kbn-evals/README.md).

## Evaluation suites

| Suite                        | Spec                                                        | What it measures                                                                          |
| ---------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **KI feature extraction**    | `ki_feature_extraction/ki_feature_extraction.spec.ts`       | Can the LLM identify entities, dependencies, and infrastructure from raw log samples?     |
| **KI query generation**      | `ki_query_generation/ki_query_generation.spec.ts`           | Can the LLM produce valid, hit-producing ES\|QL rules for significant event detection?    |
| **KI feature exclusion**     | `ki_feature_exclusion/ki_feature_exclusion.spec.ts`         | Does the LLM respect excluded features and avoid regenerating them in follow-up runs?     |
| **KI feature deduplication** | `ki_feature_deduplication/ki_feature_deduplication.spec.ts` | Are KIs stable and semantically unique across independent runs and iterative dedup loops? |

## Prerequisites

### Snapshot data

Evaluations replay Elasticsearch snapshots from a GCS bucket (`significant-events-datasets`) and
read their ground truth (criteria, expected features, discovery chains) from JSON files stored next
to the snapshots:

```
significant-events-datasets/
  <run-id>/                          # SIGEVENTS_SNAPSHOT_RUN
    <dataset-id>/
      dataset.json                   # { "schema_version": 1, "id", "description" }
      <scenario-snapshot>/           # ES snapshot blobs (unchanged)
        ground-truth.json            # { "schema_version": 1, "dataset", "snapshot", <family>: [scenarios] }
```

`dataset` and `snapshot` in a `ground-truth.json` repeat the directory names so the file is
meaningful on its own (HuggingFace, notebooks); the loader refuses a file whose envelope disagrees
with where it sits. `schema_version` is the version of the whole format and is identical in every
file of a run; the loader refuses a version it does not know or a slice that disagrees with its
manifest.

The bucket is the source of record. The TypeScript datasets still present under `src/datasets/`
are a transitional fallback (see "Transitional fallback" below) and are scheduled for removal; edit
the JSON in the bucket, not the TypeScript. The schema is [`src/datasets/schema.ts`](src/datasets/schema.ts)
(zod). Fields typed as Elasticsearch query DSL, `Detection` or `SignificantEvent` are validated as
plain objects only.

At run start the `@kbn/evals` global setup downloads every `*.json` under `<run-id>/` into
`target/evals/ground-truth/…` and exposes the directory through `KBN_EVALS_GROUND_TRUTH_DIR`;
`getActiveDatasets()` reads it synchronously. Nothing in `evals/**` changed for this.

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

| Flag             | Description                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------- |
| `--suite`        | Suite ID to run (use `significant-events`)                                                              |
| `--project`      | Connector/model project to evaluate against                                                             |
| `--judge`        | Connector ID for the LLM judge (use Gemini 3 Pro for consistency)                                       |
| `--repetitions`  | Number of times to repeat each evaluation example (e.g., `3`)                                           |
| `--trace-es-url` | URL of the Elasticsearch cluster where traces are stored (e.g., `https://user:pass@trace-cluster:9200`) |
| `--dry-run`      | Preview the command without executing                                                                   |

### Environment variables

| Variable                                | Description                                                                 | Default                    |
| --------------------------------------- | --------------------------------------------------------------------------- | -------------------------- |
| `SIGEVENTS_SNAPSHOT_RUN`                | Run ID subfolder in GCS to replay snapshots from                            | `2026-03-27`               |
| `SIGEVENTS_DATASET`                     | Dataset(s) to run (comma-separated or `all`)                                | `all`                      |
| `KI_QUERY_GENERATION_KI_FEATURE_SOURCE` | KI feature source for KI query generation (`canonical`, `snapshot`, `both`) | `canonical`                |
| `KI_QUERY_GENERATION_SCENARIOS`         | Comma-separated KI query generation scenario ids to run (focused local runs); unset runs every scenario | `all`                      |
| `SELECTED_EVALUATORS`                   | Shared permissive evaluator filter used across the suite, including evaluator-name patterns. The empty-stream safety canary always runs its mandatory evaluator. | all evaluators when unset       |
| `KI_QUERY_GENERATION_EVALUATORS`        | Strict comma-separated exact evaluator names for the configurable main query-generation experiment. Unknown, empty, or trailing-comma selections fail fast. | falls back to `SELECTED_EVALUATORS` |
| `KI_QUERY_GENERATION_MAX_STEPS`         | Optional max reasoning steps override for KI query generation (integer 2-20) | suite default               |
| `GCS_CREDENTIALS`                       | GCS service account JSON for snapshot and ground-truth access               | —                          |
| `KBN_EVALS_GROUND_TRUTH_DIR`            | Local directory with the ground-truth tree (`<dataset-id>/dataset.json`, `<dataset-id>/<snapshot>/ground-truth.json`). When set, GCS is not consulted for ground truth. Set automatically by the global setup for normal runs. | unset (download from GCS)  |
| `SIGEVENTS_GROUND_TRUTH_MODE`           | `gcs` reads ground truth from the bucket; `ts` uses the transitional TypeScript fallback in `src/datasets/` and skips the download. | `gcs`                      |
| `SIGEVENTS_TRUST_UPSTREAM`              | When `true`, use dataset examples from the golden cluster instead of upserting from code | `false`                    |
| `TRACING_ES_URL`                        | Elasticsearch URL for trace queries (if traces are in a separate cluster)   | Falls back to test cluster |
| `TRACING_ES_API_KEY`                    | API key for the trace Elasticsearch cluster                                 | —                          |

## Collected metrics

### Deterministic (CODE) evaluators

| Evaluator                              | Suite                    | Description                                                                               |
| -------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------- |
| **type_validation**                    | KI feature extraction    | All KI types are valid (`entity`, `infrastructure`, `technology`, `dependency`, `schema`) |
| **evidence_coverage**                  | KI feature extraction    | Every KI feature includes at least one evidence string                                    |
| **evidence_grounding**                 | KI feature extraction    | Evidence strings are grounded in input documents; `evidence_doc_ids` reference real docs  |
| **ki_feature_count**                   | KI feature extraction    | KI feature count falls within expected bounds                                             |
| **type_assertions**                    | KI feature extraction    | Required types are present; forbidden types are absent                                    |
| **filter_coverage**                    | KI feature extraction    | Every entity feature includes a filter condition (when `expect_entity_filters: true`)     |
| **filter_grounding**                   | KI feature extraction    | Entity filter equality pairs are grounded in input sample documents                       |
| **ki_query_generation_code_evaluator** | KI query generation      | ES\|QL syntax validity, category/severity compliance, and execution hit rate              |
| **tool_usage_validation**              | KI query generation      | Validates `get_stream_features` and `add_queries` tool calls were invoked correctly       |
| **initial_feature_count**              | KI feature exclusion     | How many features the initial identification returned, before any exclusion is in play    |
| **follow_up_returned_count**           | KI feature exclusion     | Raw features the model returned under exclusion instructions (median across follow-up runs) |
| **follow_up_retained_count**           | KI feature exclusion     | Features retained after code strips exclusion leakers (median across follow-up runs)      |

### LLM-as-a-judge evaluators

| Evaluator                   | Suite                                      | Description                                                                                                     |
| --------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| **scenario_criteria**       | KI feature extraction, KI query generation | Scenario-specific criteria (e.g. "must identify payment service")                                               |
| **confidence_calibration**  | KI feature extraction                      | Confidence values reflect evidence directness — features with indirect evidence should not claim confidence=100 |
| **Factuality**              | KI feature extraction                      | LLM-judged factual accuracy of extracted features against expected ground truth                                 |
| **Relevance**               | KI feature extraction                      | LLM-judged relevance of extracted features to the failure domain                                                |
| **llm_exclude_compliance**  | KI feature exclusion                       | Excluded features don't reappear in follow-up runs; non-excluded features are preserved                         |
| **llm_semantic_uniqueness** | KI feature deduplication                   | All unique-by-id KIs in the final accumulated set are semantically distinct                                     |
| **llm_merge_correctness**   | KI feature deduplication                   | Id-based feature merges across iterations are semantically justified (same real-world concept)                   |

### Trace-based evaluators

| Evaluator         | Description                                   |
| ----------------- | --------------------------------------------- |
| **Input Tokens**  | Total input tokens consumed per evaluation    |
| **Output Tokens** | Total output tokens generated per evaluation  |
| **Cached Tokens** | Total cached input tokens used per evaluation |
| **Latency**       | Duration of the `ChatComplete` inference span |

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

Ground truth lives in GCS. For a new dataset `my-app`:

1. `my-app/dataset.json`: `{ "schema_version": 1, "id": "my-app", "description": "My application under test" }`
2. For every scenario snapshot you captured, `my-app/<scenario-snapshot>/ground-truth.json` starting
   with `"schema_version": 1, "dataset": "my-app", "snapshot": "<scenario-snapshot>"` followed by the
   scenarios of each eval family that run against that snapshot (`kiQueryGeneration`,
   `kiFeatureExtraction`, `kiFeatureExclusion`, `kiFeatureDeduplication`, `discovery`; omit empty
   families). Do not include `snapshot_source`: the directory is the snapshot. Several scenarios with
   different `scenario_id`s may share one snapshot directory. The shape is `src/datasets/schema.ts`.
3. Upload into the run folder the snapshots were captured into:
   `gcloud storage cp -r my-app gs://significant-events-datasets/<run-id>/`
4. No Kibana change is required; dataset ids are discovered from the bucket.

### 3. Run evals

```bash
SIGEVENTS_DATASET=my-app node scripts/evals run --suite significant-events --judge <gemini-3-pro-connector-id>
```

## Editing ground truth

### Local edit loop

Every normal run downloads the current run's JSON to
`target/evals/ground-truth/significant-events-datasets/<run-id>/`. Point the override at it to
iterate without touching GCS:

```bash
# 1. Freeze the directory the last run downloaded
export KBN_EVALS_GROUND_TRUTH_DIR=$PWD/target/evals/ground-truth/significant-events-datasets/2026-03-27

# 2. Edit e.g. $KBN_EVALS_GROUND_TRUTH_DIR/otel-demo/payment-unreachable/ground-truth.json

# 3. Run against the local copy (no GCS read for ground truth)
SIGEVENTS_DATASET=otel-demo node scripts/evals run --suite <suite-id> --judge <connector-id>

# 4. Publish the changed file
gcloud storage cp $KBN_EVALS_GROUND_TRUTH_DIR/otel-demo/payment-unreachable/ground-truth.json \
  gs://significant-events-datasets/2026-03-27/otel-demo/payment-unreachable/

# 5. Back to downloading; the next run overwrites the directory
unset KBN_EVALS_GROUND_TRUTH_DIR
```

To pull another run id without running the suite:

```bash
gcloud storage rsync -r gs://significant-events-datasets/<run-id> ./tmp/gt --exclude '^(?!.*\.json$).*'
```

### Ground truth and code changes

CI reads ground truth from GCS, not from your branch. When a PR changes what the evals expect (new
fields on `expected_significant_events`, a renamed criterion, …): upload the new ground truth, then
merge promptly, and say so in the PR description. `main`'s evals may be red for that dataset in
between. For shape changes that cannot tolerate that window, copy snapshots and truth into a fresh
`<run-id>/` folder and bump `SIGEVENTS_SNAPSHOT_RUN` in the same PR.

### New snapshot run

Capturing into a new `<run-id>/` does not carry ground truth along. Copy it before bumping
`SIGEVENTS_SNAPSHOT_RUN`:

```bash
gcloud storage rsync -r gs://significant-events-datasets/<old-run>/ gs://significant-events-datasets/<new-run>/ --exclude '^(?!.*\.json$).*'
```

### Transitional fallback

The TypeScript datasets (`src/datasets/otel_demo.ts`, `quarkus_super_heroes.ts`, `bank_of_anthos/`)
stay in the repo until evals on `main` have run from the bucket, then get removed in a follow-up PR.
Until then:

- `SIGEVENTS_GROUND_TRUTH_MODE=ts` runs the suite from the TypeScript copy with no GCS access, for
  example when `--list`, an IDE runner, or an offline machine cannot run the global setup.
- The TypeScript copy is frozen. Criterion edits go to the bucket; do not edit both.
- `src/datasets/parity.test.ts` compares the two copies. It is skipped unless
  `KBN_EVALS_GROUND_TRUTH_DIR` points at a downloaded tree, which any `evals run` leaves under
  `target/evals/ground-truth/significant-events-datasets/<run-id>`:

  ```bash
  KBN_EVALS_GROUND_TRUTH_DIR=$PWD/target/evals/ground-truth/significant-events-datasets/2026-03-27 \
    node scripts/jest x-pack/platform/packages/shared/kbn-evals-suite-significant-events/src/datasets/parity.test.ts
  ```

### Notes

- `kiFeatureDeduplication[].input.iterations` used to come from
  `DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG.max_iterations`; it is now a literal in the JSON.
- `playwright test --list` and IDE runners skip the global setup and fail with a message naming
  `KBN_EVALS_GROUND_TRUTH_DIR`; use `node scripts/evals run` or set the variable.
- The probe/replay scripts (`scripts/probe_sigevents_eval_snapshot.js`,
  `scripts/replay_sigevents_eval_snapshot.js`) download ground truth themselves the same way.

## Adding a new eval spec

1. Create a spec file under `evals/` (e.g. `my_eval/my_eval.spec.ts`)
2. Add evaluators in `src/evaluators/` (e.g. `my_eval_evaluators.ts`) — code evaluators for deterministic checks and LLM-as-a-judge evaluators for qualitative criteria. See the existing files for reference (e.g. [`ki_feature_extraction/evaluators.ts`](src/evaluators/ki_feature_extraction/evaluators.ts))
3. If the dataset defines evaluation criteria per scenario, you can reuse the [`scenario_criteria evaluator`](src/evaluators/scenario_criteria/evaluators.ts) - it automatically scores LLM output against the dataset's criteria using an LLM judge, so you don't need to write custom LLM evaluators for each spec
4. Wire up the spec with the dataset scenarios and evaluators
