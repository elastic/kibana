# @kbn/evals-suite-onechat

Evaluation test suites for OneChat API, built on top of [`@kbn/evals`](../kbn-evals/README.md).

## Overview

This package contains evaluation tests specifically for OneChat API and its default agent.

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

## Running OneChat Evaluations

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

### Load OneChat Datasets

**Note**: You need to be a member of the Elastic organization on HuggingFace to access OneChat datasets. Sign up with your `@elastic.co` email address.

Load the required OneChat datasets into Elasticsearch using the HuggingFace dataset loader:

```bash
# Load Wix knowledge base and users datasets
HUGGING_FACE_ACCESS_TOKEN=<your-token> \
node --require ./src/setup_node_env/index.js \
  x-pack/platform/packages/shared/kbn-ai-tools-cli/scripts/hf_dataset_loader.ts \
  --datasets onechat/knowledge-base/* \
  --clear
  --kibana-url http://elastic:changeme@localhost:5620
```

**Note**: First download of the datasets may take a while, because of the embedding generation for `semantic_text` fields in some of the datasets.
Once done, documents with embeddings will be cached and re-used on subsequent data loads.

For more information about HuggingFace dataset loading, refer to the [HuggingFace Dataset Loader documentation](../../kbn-ai-tools-cli/src/hf_dataset_loader/README.md).

### Run Evaluations

Then run the evaluations:

```bash
# Run all OneChat evaluations
node scripts/playwright test --config x-pack/platform/packages/shared/onechat/kbn-evals-suite-onechat/playwright.config.ts

# Run specific test file
node scripts/playwright test --config x-pack/platform/packages/shared/onechat/kbn-evals-suite-onechat/playwright.config.ts evals/kb/kb.spec.ts

# Run with specific connector
node scripts/playwright test --config x-pack/platform/packages/shared/onechat/kbn-evals-suite-onechat/playwright.config.ts --project="my-connector"

# Run with trace collection from separate cluster and LLM-as-a-judge
TRACING_ES_URL=http://elastic:changeme@localhost:9200 EVALUATION_CONNECTOR_ID=llm-judge-connector-id node scripts/playwright test --config x-pack/platform/packages/shared/onechat/kbn-evals-suite-onechat/playwright.config.ts
```

### Run Evaluation Comparisons

You can compare evaluation results between different runs using the comparison functionality. This allows you to track performance changes across different model versions, configurations, or time periods.

```bash
# Compare current run against a reference run
EVALUATION_RUN_ID=<evaluation-run-id> REFERENCE_EVALUATION_RUN_ID=<reference-evaluation-run-id> \
node scripts/playwright test --config x-pack/platform/packages/shared/onechat/kbn-evals-suite-onechat/reporting.playwright.config.ts
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
