# Significant Events Evaluations

Evaluations for Significant Events, covering the individual LLM-based pipeline stages (Knowledge Indicator feature extraction, KI query generation, KI feature exclusion/deduplication, discovery, judge) plus an opt-in end-to-end run from replayed logs to raised significant events.
These evaluations support both qualitative (LLM-as-a-judge + deterministic CODE evaluators) and quantitative (trace-based) metrics.

For general information about writing evaluation tests, configuration, and usage, see the main [`@kbn/evals` documentation](../kbn-evals/README.md).

## Evaluation suites

| Suite                        | Spec                                                        | What it measures                                                                          |
| ---------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **KI feature extraction**    | `ki_feature_extraction/ki_feature_extraction.spec.ts`       | Can the LLM identify entities, dependencies, and infrastructure from raw log samples?     |
| **KI query generation**      | `ki_query_generation/ki_query_generation.spec.ts`           | Can the LLM produce valid, hit-producing ES\|QL rules for significant event detection?    |
| **KI feature exclusion**     | `ki_feature_exclusion/ki_feature_exclusion.spec.ts`         | Does the LLM respect excluded features and avoid regenerating them in follow-up runs?     |
| **KI feature deduplication** | `ki_feature_deduplication/ki_feature_deduplication.spec.ts` | Are KIs stable and semantically unique across independent runs and iterative dedup loops? |
| **Discovery agent**          | `discovery/discovery.spec.ts`                               | Does the discovery agent group detections into correct, evidence-backed discoveries (incl. continuation over time)? |
| **Discovery judge**          | `discovery/judge.spec.ts`                                   | Does the judge promote real incidents to open events and dismiss benign noise?            |
| **End-to-end pipeline**      | `e2e/e2e.spec.ts`                                           | Opt-in (`SIGEVENTS_E2E=true`): full funnel from replayed logs to raised significant events, scored per stage. |
| **Live end-to-end pipeline** | `e2e_live/e2e_live.spec.ts`                                 | Opt-in (`SIGEVENTS_E2E_LIVE=true`): the same funnel with NO shortcuts — LLM onboarding, real alerting rules over a streamed incident tail, and the real orchestrator. |

## End-to-end pipeline eval

> **Warning — destructive: run these e2e specs against a dedicated eval cluster only.**
> Between scenarios they wipe ALL documents from the live pipeline data streams (`.rule-events`,
> `.significant_events-detections/-discoveries/-events`, and the knowledge-indicators stream),
> delete the managed `logs` stream, and the live spec additionally deletes **every alerting v2
> rule in the space** (`_delete_by_query` with `match_all`) and overrides the significant-events
> inference feature settings for the duration of the run. Anything a shared cluster has in those
> stores is lost.

`evals/e2e/e2e.spec.ts` chains every pipeline stage against the live product instead of testing stages in isolation:

```
replay logs (timestamps shifted to now)
  -> seed KIs (snapshot features + canonical rule-backed queries with synthetic rule ids)
  -> synthesize `.rule-events` signals (bucketed ES|QL per canonical query)
  -> execute the `system-significant-events-detection` managed workflow (real change-point scan)
  -> discovery agent via /converse over the detections the workflow actually produced
  -> execute the `system-significant-events-triage` managed workflow (judge writes events)
  -> score `.significant_events-events`
```

Design notes:

- No Alerting rules are installed and no real-time waiting happens: the change-point scan only reads rule-backed KI query links and `.rule-events` signals, both of which the spec seeds. Canonical queries all sit in the critical severity band so the scan honours the lookback/bucket-interval the spec sizes to the replayed window.
- Discoveries written by the agent's `discovery_write` tool persist to the live discoveries stream, which is exactly what triage picks up — the discovery-to-judge handoff is the real product path.
- Pipeline data streams (`.rule-events`, `.significant_events-detections/-discoveries/-events`, KI stream) are wiped per scenario, and scenarios run serially.
- Datasets: bank-of-anthos only for now (`ledger-db-disconnect` checks recall — the cascade must end as an open event; `healthy-baseline` checks precision — no open events allowed).

Checkpoint scoring (`src/evaluators/e2e/`):

- `detection_match` (CODE): per-rule F1 of produced detections vs `expected_detection_rule_uuids`, with an allowlist for benign volume rules.
- Discovery-stage evaluators reused from `src/evaluators/discovery/` (grouping correctness, evidence collection, tool usage, ES|QL grounding, calibration).
- `event_outcome` (CODE): F1 over expected events — recall on expected entries (matched by underlying discovery rule_uuids + acceptable status), precision on unjustified `open` events.
- `funnel_completion` (CODE): fraction of stages (signals, detections, discoveries, events) that produced their expected output — a single trend metric for dashboards.
- `scenario_criteria` (LLM): scenario criteria judged over the full funnel output.

Run it with:

```bash
SIGEVENTS_E2E=true SIGEVENTS_DATASET=bank-of-anthos node scripts/evals run \
  --suite significant-events \
  --project <connector-id> \
  --judge <gemini-3-pro-connector-id> \
  e2e.spec.ts
```

## Live end-to-end pipeline eval

`evals/e2e_live/e2e_live.spec.ts` removes every shortcut the seeded spec takes. Nothing is
seeded and nothing is synthesized — the product does all the work:

```
replay ONLY the pre-incident baseline (shifted to end at ~now)
  -> run the real onboarding workflow: LLM feature extraction + query generation, then _promote
     (real alerting rules installed for every eligible generated query)
  -> stream the incident tail at 1x wall clock; the installed rules fire naturally and write
     real signals into `.rule-events`
  -> trigger the orchestrator (detect -> discover -> triage) and poll it to completion
  -> collect detections, discoveries, events, and the discovery/judge agent conversations
     (fetched from the Agent Builder API for trajectory scoring)
```

How it differs from the seeded spec:

| | `e2e.spec.ts` (seeded) | `e2e_live.spec.ts` (live) |
| --- | --- | --- |
| Queries | Canonical, seeded as KI docs | LLM-generated by real onboarding |
| Signals | Synthesized from bucketed ES\|QL | Real rule executions over a streamed tail |
| Detection | Real workflow, manually executed | Real workflow via the orchestrator |
| Discovery | Agent via `/converse` | Real discovery workflow (conversation fetched afterwards) |
| Judge | Standalone triage workflow | Real triage via the orchestrator |
| Deterministic scoring | uuid-based F1 per checkpoint | Count/status funnel + open-event outcome (no uuid catalog exists) |
| Model | Agents on suite connectors | ALL four LLM stages pinned to the evaluated `--model` connector |
| Wall clock | Minutes per scenario | ~30-45 minutes per scenario (onboarding + 1x tail streaming + orchestrator) |
| Determinism | High (regression signal) | Low by design — measures the real product experience |

Notes and known properties:

- Real alerting rules only evaluate `(now - lookback, now]` (2m for critical-band rules, 10m otherwise) — there is no backfill. That is why the incident tail must be streamed in real time; generated queries below the critical severity band (60-79) run on a 5m cadence and may not accumulate enough change-point buckets within a short tail. This is a real product property, not an eval bug.
- Per-scenario `live` config lives in the dataset (`incident_onset_offset_minutes`, `max_tail_minutes`, live criteria) — see [src/datasets/bank_of_anthos/e2e.ts](src/datasets/bank_of_anthos/e2e.ts). Captured snapshots are SHORT (~3 min healthy + ~5 min failure, so 10-20 min total): the onset offset must leave real baseline data before the cut (the replay fails fast when <5% of docs land in the baseline), and `max_tail_minutes` must be >= the offset or the end of the snapshot — where the incident lives — is dropped from the stream (the streamer warns loudly).
- Onboarding variance is the point: on a bad run the generated queries never cover the incident signatures and the funnel shows the drop at the signals/detections stage.
- The generic trace-based token/latency evaluators are NOT attached in live mode: the LLM calls happen inside server-side workflow executions whose spans carry Kibana's trace ids, not the eval's, so trace queries always come back empty. Cost/latency is scored deterministically instead by the `live_*` usage evaluators — onboarding tokens from the workflow status payload, discovery/judge tokens and LLM-call counts from conversation `model_usage`, tool calls from the fetched conversation steps, and wall-clock stage durations.
- Manual/local runs only; not part of any CI schedule.

Run it with:

```bash
SIGEVENTS_E2E_LIVE=true SIGEVENTS_DATASET=bank-of-anthos node scripts/evals run \
  --suite significant-events \
  --project <connector-id> \
  --judge <gemini-3-pro-connector-id> \
  e2e_live.spec.ts
```

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
| `SIGEVENTS_SNAPSHOT_RUN`                | Run ID subfolder in GCS to replay snapshots from                            | `2026-02-25`               |
| `SIGEVENTS_DATASET`                     | Dataset(s) to run (comma-separated or `all`)                                | `all`                      |
| `KI_QUERY_GENERATION_KI_FEATURE_SOURCE` | KI feature source for KI query generation (`canonical`, `snapshot`, `both`) | `both`                     |
| `GCS_CREDENTIALS`                       | GCS service account JSON for snapshot access                                | —                          |
| `SIGEVENTS_TRUST_UPSTREAM`              | When `true`, use dataset examples from the golden cluster instead of upserting from code | `false`                    |
| `SIGEVENTS_E2E`                         | When `true`, run the end-to-end pipeline spec (`e2e/e2e.spec.ts`); skipped otherwise | `false`                    |
| `SIGEVENTS_E2E_LIVE`                    | When `true`, run the LIVE end-to-end pipeline spec (`e2e_live/e2e_live.spec.ts`, ~30-45 min per scenario); skipped otherwise | `false`                    |
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
| **detection_match**                    | End-to-end pipeline      | Per-rule F1 of change-point detections vs the expected/allowed rule sets                  |
| **event_outcome**                      | End-to-end pipeline      | F1 over expected significant events (status + underlying discovery) and unjustified opens |
| **funnel_completion**                  | End-to-end pipeline      | Fraction of pipeline stages (signals, detections, discoveries, events) that passed        |
| **live_funnel_completion**             | Live end-to-end pipeline | Count/status funnel: onboarding, signals, detections, discoveries, events (no uuid catalog) |
| **live_event_outcome**                 | Live end-to-end pipeline | Binary final outcome: incident must end with an open event, baseline must end with none   |

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
