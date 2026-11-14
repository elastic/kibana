# @kbn/evals-suite-agent-builder

Evaluation test suites for AgentBuilder API, built on top of [`@kbn/evals`](../kbn-evals/README.md).

## Overview

This package contains evaluation tests specifically for AgentBuilder API and its default agent.

For general information about writing evaluation tests, configuration, and usage, see the main [`@kbn/evals` documentation](../kbn-evals/README.md).

## Prerequisites

### Configure Tracing and Phoenix Exporter

Configure tracing and Phoenix exporter in `kibana.dev.yml`. To enable trace-based metrics (token usage, latency, tool calls), add both Phoenix and HTTP exporters:

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

### Configure AI Connectors

Define the models to evaluate as inference endpoint definitions in the `KIBANA_TESTING_INFERENCE_ENDPOINTS` environment variable (raw or base64-encoded JSON; `node scripts/evals init` can generate it for EIS and OpenRouter):

Alternatively, declare a preconfigured `.inference` connector in `kibana.dev.yml`.

See [Connector definitions and inference endpoints](../../kbn-evals/README.md#connector-definitions-and-inference-endpoints) for the full shape.

## Running AgentBuilder Evaluations

### Start Scout Server

Start Scout server:

```bash
node scripts/scout.js start-server --arch stateful --domain classic
```

### Start EDOT Collector

To collect trace-based metrics, start the EDOT (Elastic Distribution of OpenTelemetry) Gateway Collector. Ensure Docker is running, then execute:

```bash
# Optionally use non-default ports using --http-port <http-port> or --grpc-port <grpc-port>. You must update the tracing exporters with the right port in `kibana.dev.yml`
ELASTICSEARCH_HOST=http://localhost:9220 node scripts/edot_collector.js
```

The EDOT Collector receives traces from Kibana via the HTTP exporter configured above and stores them in your local Elasticsearch cluster, where they can be queried to extract non-functional metrics.

**Note:** If your EDOT Collector stores traces in a different Elasticsearch cluster than your test environment (i.e common cluster for the team), specify the trace cluster URL when running evaluations using `TRACING_ES_URL=https://<username>:<password>@<url>`. Dedicated ES client will be instantiated to query traces from the specified cluster.

### Load AgentBuilder Datasets

The following options are available to load Knowledge bases:

A. Restore the [snapshot](https://www.elastic.co/docs/deploy-manage/tools/snapshot-and-restore/ec-gcs-snapshotting) from gcs-bucket, credentials are stored in secret's vault. **Fastest, recommended when restoring snapshot is available, e.g. ECH**

B. Use the ETL pipeline from the workchat-solution-ds-experiments (internal) repo. **Recommended when restoring snapshot is not an option, e.g. serverless**. Estimated time: ~30 minutes (Serverless Cloud) or ~1 hour (local).

### Run Evaluations

Then run the evaluations:

```bash
# Run all AgentBuilder evaluations
node scripts/playwright test --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/playwright.config.ts

# Run specific test file
node scripts/playwright test --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/playwright.config.ts evals/kb/kb.spec.ts

# Run with specific connector
node scripts/playwright test --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/playwright.config.ts --project="my-connector"

# Run with LLM-as-a-judge for consistent evaluation results
EVAL_CONNECTOR_ID=llm-judge-connector-id node scripts/playwright test --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/playwright.config.ts

# Run only selected evaluators
SELECTED_EVALUATORS="Factuality,Relevance,Groundedness" node scripts/playwright test --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/playwright.config.ts

# Override IR evaluator K value (takes priority over config)
IR_EVAL_K=5 node scripts/playwright test --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/playwright.config.ts

# Run IR evaluators with multiple K values using patterns (Precision@K matches Precision@5, Precision@10, etc.)
# This suite registers Precision, Recall, F1 and HitRate only. MRR, NDCG and MAP are omitted because
# multi-hop search concatenates results from several tool calls in call order, not by relevance rank.
SELECTED_EVALUATORS="Precision@K,Recall@K,F1@K,HitRate@K,Factuality" IR_EVAL_K=5,10,20 node scripts/playwright test --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/playwright.config.ts

# Override IR evaluator K value (supports comma-separated values for multi-K evaluation)
IR_EVAL_K=5,10,20 node scripts/playwright test --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/playwright.config.ts

# Retrieve traces from another (monitoring) cluster
TRACING_ES_URL=http://elastic:changeme@localhost:9200 EVAL_CONNECTOR_ID=llm-judge-connector-id node scripts/playwright test --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/playwright.config.ts

```

> **Tip:** When using preconfigured connectors, set `KBN_EVALS_SKIP_CONNECTOR_SETUP=true` to skip automatic connector setup/teardown, causing instability running evaluations.

### External dataset evaluations

If you want to run evaluations against a dataset that already exists in Elasticsearch (for ad-hoc testing), set `DATASET_NAME` to match the name of the stored dataset and run:

```bash
DATASET_NAME="my-dataset" \
node scripts/playwright test --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/playwright.config.ts evals/external/external_dataset.spec.ts
```

Notes:

- The dataset **must already exist in Elasticsearch**. If it doesn't, the run will fail with a clear error.
- In this mode, the suite **does not** create or upsert datasets/examples — the stored dataset is the source of truth.
- Dataset examples must match the example schema used in the eval suite (at minimum `input.question`, plus any `output.expected` / `output.groundTruth` needed by evaluators).

### PROMQL and TS query evaluations

`evals/esql/promql_ts.spec.ts` runs `generate_esql` on PromQL and time series questions and scores the generated query with code evaluators: the source command (`PROMQL` or `TS`), whether it runs over the dataset's time range, whether it returns rows, and per-example rules such as binding `start`/`end` to `?_tstart`/`?_tend` or not using a fixed range selector like `[5m]`. An LLM judge also compares it with the ground-truth query.

The `node_exporter follow-up queries` test asks the default agent two PromQL questions in one conversation, answered in the chat or as charts. As the first answer shows the agent a PROMQL query, it may write the second one itself instead of calling `generate_esql` again. The `Generated Queries Only` evaluator scores the share of queries the agent passes to `execute_esql` or to a visualization that a tool generated, ignoring exploratory `FROM` or `TS` queries without `STATS` and dropped `start`/`end` options. A turn that used no query scores 0, and the second question isn't asked if the first one failed. The second answer's query is also checked for its source command and rules and, for chat answers, whether it runs and returns rows.

It has no examples that divide two different metrics, such as used memory in percent. `PROMQL` returns no rows for an unaggregated `a / b` instead of failing, so such examples only measure whether the model aggregates both operands.

It loads its own data, so it needs no snapshot. Run it with Claude Sonnet 5, the default Agent Builder model, as both the evaluated model and the judge:

```bash
node scripts/evals run --suite esql-generation --project eis-anthropic-claude-5-sonnet --evaluation-connector-id eis-anthropic-claude-5-sonnet --grep "node_exporter"
```

With `node scripts/evals start`, the `local` profile writes datasets and scores to a Kibana on `localhost:5601`. To keep them in the Scout stack the evals run against instead, use a profile whose `evaluationsKbn`, `evaluationsEs` and `tracingEs` URLs point to `localhost:5620` and `localhost:9220`, such as `--profile scout` with `config.scout.json` in `kbn-evals/scripts/vault`.

The dataset in `src/fixtures/node_exporter_metrics.ndjson.gz` is one hour of Prometheus `node_exporter` metrics from three instances at a 30s interval, as stored by the Elasticsearch Prometheus remote write endpoint. It is loaded into the TSDB data stream `metrics-node_exporter.prometheus-evals`, with its timestamps shifted to end at the current minute, as TSDB rejects documents older than `index.look_back_time`. The follow-up questions ask about the last 2 hours, so the data stays in range for runs of up to an hour after it was loaded.

It was generated with the `builtin/node_exporter` scenario of [metricsgenreceiver](https://github.com/elastic/metricsgenreceiver) (`seed: 123`, `scale: 3`, `interval: 15s`, one hour) and the `prometheusremotewrite` exporter, then reduced to a subset of the metrics a node_exporter dashboard uses and to 30s samples. As the generator varies each gauge independently, the export rescales the available and free memory and filesystem gauges to stay below their totals, with a fixed share per instance: `host-2:9100` is low on memory and its root filesystem is nearly full.

### Evaluation comparisons

Use the evals CLI to compare two evaluation runs (persisted to the `.evaluation-scores` data stream) using paired t-tests.

Run the suite twice and capture the two execution IDs (via `TEST_RUN_ID`). Scout will generate a `TEST_RUN_ID` automatically, but it's easiest to set it explicitly. Each model gets its own execution ID (`TEST_RUN_ID::model-id`), so multiple models can run in the same suite invocation without collisions.

```bash
# This must point at the Kibana instance where eval scores are ingested/read.
export EVAL_KBN_URL=http://elastic:changeme@localhost:5601/dev

# LLM-as-a-judge connector (required by @kbn/evals)
export EVAL_CONNECTOR_ID=<llm-judge-connector-id>

# Run A
TEST_RUN_ID=agent-builder-baseline \
  node scripts/evals run --suite agent-builder --project <task-connector-id>

# Run B
TEST_RUN_ID=agent-builder-change \
  node scripts/evals run --suite agent-builder --project <task-connector-id>
```

Tip: the execution id is also printed at the end of the run in the export message containing `metadata.execution_id:"..."`.

Then compare:

```bash
export EVAL_KBN_URL=http://elastic:changeme@localhost:5601/dev
node scripts/evals compare agent-builder-baseline agent-builder-change
```

Notes:

- The two runs must use the same connector and configuration.
- `compare` reads through `EVAL_KBN_URL` (defaults to `http://elastic:changeme@localhost:5601/dev`).
