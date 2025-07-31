# @kbn/evals-suite-onechat

Evaluation test suites for OneChat API, built on top of [`@kbn/evals`](../kbn-evals/README.md).

## Overview

This package contains evaluation tests specifically for OneChat API and its default agent.

For general information about writing evaluation tests, configuration, and usage, see the main [`@kbn/evals` documentation](../kbn-evals/README.md).

## Prerequisites

Configure Phoenix exporter in `kibana.dev.yml`:

```yaml
telemetry.tracing.exporters:
  phoenix:
    base_url: 'https://<my-phoenix-host>'
    public_url: 'https://<my-phoenix-host>'
    project_name: '<my-name>'
    api_key: '<my-api-key>'
```

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

Start Scout server:

```bash
node scripts/scout.js start-server --stateful
```

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
