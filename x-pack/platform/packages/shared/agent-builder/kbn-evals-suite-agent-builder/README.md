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

Configure your AI connectors in `kibana.dev.yml` or via the `KIBANA_TESTING_AI_CONNECTORS` environment variable:

```yaml
# In kibana.dev.yml
xpack.actions.preconfigured:
  my-connector:
    name: My Test Connector
    actionTypeId: .inference
    config:
      provider: openai
      taskType: completion
    secrets:
      apiKey: <your-api-key>
```

Or via environment variable:

```bash
export KIBANA_TESTING_AI_CONNECTORS='{"my-connector":{"name":"My Test Connector","actionTypeId":".inference","config":{"provider":"openai","taskType":"completion"},"secrets":{"apiKey":"your-api-key"}}}'
```

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

C. Use Huggingface Loader in Kibana: Follow the steps below to load data into Elasticsearch using the HuggingFace dataset loader:

```bash
# Load domain specific knowledge base
HUGGING_FACE_ACCESS_TOKEN=<your-token> \
node --require ./src/setup_node_env/index.js \
  x-pack/platform/packages/shared/kbn-ai-tools-cli/scripts/hf_dataset_loader.ts \
  --datasets "agent_builder/{REPLACE_WITH_A_KNOWLEDGE_BASE}/*" \
  --clear \
  --kibana-url http://elastic:changeme@localhost:5620
```

KNOWLEDGE BASE OPTIONS

1. Airline loyalty domain: `airline_loyalty_program_kb`
2. Customer support domain: `customer_support_kb`
3. Retail domain: `global_electronics_retailer_kb`
4. Healthcare survey domain: `hcahps_patient_survey_kb`
5. Elasticsearch customer support knowledge articles: `elastic_customer_support_kb`

**Note**: You need to be a member of the Elastic organization on HuggingFace to access AgentBuilder datasets. Sign up with your `@elastic.co` email address.

**Note**: First download of the datasets may take a while, because of the embedding generation for `semantic_text` fields in some of the datasets.
Once done, documents with embeddings will be cached and re-used on subsequent data loads.

For more information about HuggingFace dataset loading, refer to the [HuggingFace Dataset Loader documentation](../../kbn-ai-tools-cli/src/hf_dataset_loader/README.md).

### Run Evaluations

Then run the evaluations:

```bash
# Run all AgentBuilder evaluations
node scripts/playwright test --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/test/scout/ui/playwright.config.ts

# Run specific test file
node scripts/playwright test --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/test/scout/ui/playwright.config.ts evals/kb/kb.spec.ts

# Run with specific connector
node scripts/playwright test --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/test/scout/ui/playwright.config.ts --project="my-connector"

# Run with LLM-as-a-judge for consistent evaluation results
EVALUATION_CONNECTOR_ID=llm-judge-connector-id node scripts/playwright test --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/test/scout/ui/playwright.config.ts

# Run only selected evaluators
SELECTED_EVALUATORS="Factuality,Relevance,Groundedness" node scripts/playwright test --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/test/scout/ui/playwright.config.ts

# Override RAG evaluator K value (takes priority over config)
RAG_EVAL_K=5 node scripts/playwright test --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/test/scout/ui/playwright.config.ts

# Run RAG evaluators with multiple K values using patterns (Precision@K matches Precision@5, Precision@10, etc.)
SELECTED_EVALUATORS="Precision@K,Recall@K,F1@K,Factuality" RAG_EVAL_K=5,10,20 node scripts/playwright test --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/test/scout/ui/playwright.config.ts

# Override RAG evaluator K value (supports comma-separated values for multi-K evaluation)
RAG_EVAL_K=5,10,20 node scripts/playwright test --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/test/scout/ui/playwright.config.ts

# Retrieve traces from another (monitoring) cluster
TRACING_ES_URL=http://elastic:changeme@localhost:9200 EVALUATION_CONNECTOR_ID=llm-judge-connector-id node scripts/playwright test --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/test/scout/ui/playwright.config.ts

```

### External Phoenix dataset evaluations

If you want to run evaluations against a dataset that exists in Phoenix and not in the code (for ad-hoc testing), set `DATASET_NAME` environment variable to match the name of your Phoenix dataset and run evals with the command:

```bash
DATASET_NAME="my-phoenix-dataset" \
node scripts/playwright test --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/test/scout/ui/playwright.config.ts evals/external/external_dataset.spec.ts
```

Notes:

- The external dataset **must already exist in Phoenix**. If it doesn't, the run will fail with a clear error.
- In this mode, the suite **does not** create or upsert datasets/examples- Phoenix dataset is the source of truth.
- Dataset examples must match the example schema already using in the eval suite (at minimum `input.question`, plus any `output.expected` / `output.groundTruth` needed by evaluators).

### Evaluation comparisons

Use the evals CLI to compare two evaluation runs (persisted to the `.kibana-evaluations` data stream) using paired t-tests.

Run the suite twice and capture the two run IDs. Scout will generate a `TEST_RUN_ID` automatically, but it's easiest to set it explicitly. **Important:** run a **single** Playwright project (connector/model) per run (use `--project`), otherwise multiple models can collide under the same run id.

```bash
# This must point at the cluster where eval scores were exported.
# (The default Scout test ES is typically http://elastic:changeme@localhost:9220)
export EVALUATIONS_ES_URL=http://elastic:changeme@localhost:9220

# LLM-as-a-judge connector (required by @kbn/evals)
export EVALUATION_CONNECTOR_ID=<llm-judge-connector-id>

# Run A
TEST_RUN_ID=agent-builder-baseline \
  node scripts/evals run --suite agent-builder --project <task-connector-id>

# Run B
TEST_RUN_ID=agent-builder-change \
  node scripts/evals run --suite agent-builder --project <task-connector-id>
```

Tip: the run id is also printed at the end of the run in the export message containing `run_id:"..."`.

Then compare:

```bash
export EVALUATIONS_ES_URL=http://elastic:changeme@localhost:9220
node scripts/evals compare agent-builder-baseline agent-builder-change
```

Notes:

- The two runs must use the same executor/orchestrator (default in-Kibana vs `KBN_EVALS_EXECUTOR=phoenix`).
- `compare` reads from `EVALUATIONS_ES_URL` (defaults to `http://elastic:changeme@localhost:9220`).
