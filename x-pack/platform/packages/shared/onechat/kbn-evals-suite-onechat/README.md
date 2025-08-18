# @kbn/evals-suite-onechat

Evaluation test suites for OneChat API, built on top of [`@kbn/evals`](../kbn-evals/README.md).

## Overview

This package contains evaluation tests specifically for OneChat API and its default agent.

For general information about writing evaluation tests, configuration, and usage, see the main [`@kbn/evals` documentation](../kbn-evals/README.md).

## Prerequisites

### Configure Phoenix Exporter

Configure Phoenix exporter in `kibana.dev.yml`:

```yaml
telemetry.tracing.exporters:
  phoenix:
    base_url: 'https://<my-phoenix-host>'
    public_url: 'https://<my-phoenix-host>'
    project_name: '<my-name>'
    api_key: '<my-api-key>'
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

### Load OneChat Datasets

Load the required OneChat datasets into Elasticsearch using the HuggingFace dataset loader:

```bash
# Load Wix knowledge base and users datasets
HUGGING_FACE_ACCESS_TOKEN=<your-token> \
node --require ./src/setup_node_env/index.js \
  x-pack/platform/packages/shared/kbn-ai-tools-cli/scripts/hf_dataset_loader.ts \
  --datasets onechat/knowledge-base/wix_knowledge_base,onechat/knowledge-base/users \
  --clear
  --kibana-url http://elastic:changeme@localhost:5620
```

**Note**: You need to be a member of the Elastic organization on HuggingFace to access OneChat datasets. Sign up with your `@elastic.co` email address.

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

# Run with LLM-as-a-judge for consistent evaluation results
EVALUATION_CONNECTOR_ID=llm-judge-connector-id node scripts/playwright test --config x-pack/platform/packages/shared/onechat/kbn-evals-suite-onechat/playwright.config.ts
```
