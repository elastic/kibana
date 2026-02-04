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
node scripts/scout.js start-server --stateful
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
node scripts/playwright test --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/playwright.config.ts

# Run specific test file
node scripts/playwright test --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/playwright.config.ts evals/kb/kb.spec.ts

# Run with specific connector
node scripts/playwright test --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/playwright.config.ts --project="my-connector"

# Run with LLM-as-a-judge for consistent evaluation results
EVALUATION_CONNECTOR_ID=llm-judge-connector-id node scripts/playwright test --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/playwright.config.ts

# Run only selected evaluators
SELECTED_EVALUATORS="Factuality,Relevance,Groundedness" node scripts/playwright test --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/playwright.config.ts

# Override RAG evaluator K value (takes priority over config)
RAG_EVAL_K=5 node scripts/playwright test --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/playwright.config.ts

# Retrieve traces from another (monitoring) cluster
TRACING_ES_URL=http://elastic:changeme@localhost:9200 EVALUATION_CONNECTOR_ID=llm-judge-connector-id node scripts/playwright test --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/playwright.config.ts

```

### External Phoenix dataset evaluations

If you want to run evaluations against a dataset that exists in Phoenix and not in the code (for ad-hoc testing), set `DATASET_NAME` environment variable to match the name of your Phoenix dataset and run evals with the command:

```bash
DATASET_NAME="my-phoenix-dataset" \
node scripts/playwright test --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/playwright.config.ts evals/external/external_dataset.spec.ts
```

Notes:

- The external dataset **must already exist in Phoenix**. If it doesn't, the run will fail with a clear error.
- In this mode, the suite **does not** create or upsert datasets/examples- Phoenix dataset is the source of truth.
- Dataset examples must match the example schema already using in the eval suite (at minimum `input.question`, plus any `output.expected` / `output.groundTruth` needed by evaluators).

### Run Evaluation Comparisons

You can compare evaluation results between different runs using the comparison functionality. This allows you to track performance changes across different model versions, configurations, or time periods.

```bash
# Compare current run against a reference run
EVALUATION_RUN_ID=<evaluation-run-id> REFERENCE_EVALUATION_RUN_ID=<reference-evaluation-run-id> \
node scripts/playwright test --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/reporting.playwright.config.ts
```

#### Environment Variables

- `EVALUATION_RUN_ID`: The run ID of the current evaluation you want to analyze
- `REFERENCE_EVALUATION_RUN_ID`: The run ID of the baseline/reference evaluation to compare against

#### Example Comparison Output

When you run a comparison, you'll get detailed analysis showing:

```text
📋 Run Metadata:
Current Run: 161de0d567799670 (2025-08-28T14:17:07.396Z) - Model: us.anthropic.claude-3-7-sonnet-20250219-v1:0
Reference Run: 026c5060fbfc7dcb (2025-08-28T14:21:35.886Z) - Model: us.anthropic.claude-3-7-sonnet-20250219-v1:0

📈 ambiguous-queries Performance Comparison:

╔═══════════════════╤═════════╤═══════════╤════════════╤══════════╤═════════════╗
║ Evaluator         │ Current │ Reference │ Difference │ % Change │ Status      ║
╟───────────────────┼─────────┼───────────┼────────────┼──────────┼─────────────╢
║ Factuality        │   0.318 │     0.139 │     +0.179 │  +129.3% │ 📈 IMPROVED ║
╟───────────────────┼─────────┼───────────┼────────────┼──────────┼─────────────╢
║ Relevance         │   0.622 │     0.660 │     -0.037 │    -5.6% │ 📉 DECLINED ║
╟───────────────────┼─────────┼───────────┼────────────┼──────────┼─────────────╢
║ Sequence Accuracy │   1.000 │     1.000 │      0.000 │     0.0% │ ➡️ SAME     ║
╚═══════════════════╧═════════╧═══════════╧════════════╧══════════╧═════════════╝

🎯 Overall Performance Analysis:
⚖️  Current run shows mixed results.
  • Equal improvements and regressions
```

#### Finding Run IDs

Run IDs are automatically generated and displayed in the evaluation logs. Look for entries like:

```text
Successfully indexed evaluation results to a datastream: .kibana-evaluations
Query filter: environment.hostname:"your-hostname" AND model.id:"model-id" AND run_id:"161de0d567799670"
```

You can also query the `.kibana-evaluations` datastream in Elasticsearch/Kibana to find historical run IDs for comparison.
