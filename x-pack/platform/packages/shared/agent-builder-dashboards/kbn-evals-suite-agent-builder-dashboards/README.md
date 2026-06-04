# @kbn/evals-suite-agent-builder-dashboards

Evaluation test suite for Agent Builder Dashboards behavior, built on top of [`@kbn/evals`](../../kbn-evals/README.md).

## Overview

This package contains in-code evaluation datasets for Agent Builder Dashboards behavior. The initial coverage focuses on skill selection and intent routing:

- Dashboard requests should load dashboard management.
- Standalone visualization requests should load visualization creation without creating a dashboard.
- ES|QL query-writing requests should not use dashboard management.

For general information about writing evaluation tests, configuration, reporting, and comparison, see the main [`@kbn/evals` documentation](../../kbn-evals/README.md).

## Prerequisites

### Configure EIS Connectors

For local EIS-backed model runs, run the eval setup wizard:

```bash
node scripts/evals init
```

When `node scripts/evals init` finishes, copy the printed connector export into the same shell where you will run evals:

```bash
export KIBANA_TESTING_AI_CONNECTORS="..."
```

This makes EIS connector IDs available as Playwright projects, for example `eis-anthropic-claude-4-5-sonnet`.

### Optional: Configure Phoenix and Tracing

`node scripts/evals start` starts EDOT and Scout for you. If you want to export traces to Phoenix or a shared tracing cluster, configure the eval profiles with:

```bash
node scripts/evals init config
```

See [`@kbn/evals` documentation](../../kbn-evals/README.md) for `TRACING_EXPORTERS`, `TRACING_ES_URL`, and Phoenix executor details.

## Running Evaluations

### Managed Stack

Use `node scripts/evals start` when you want the CLI to start or reuse EDOT and Scout, enable EIS Cloud Connected Mode, and then run the suite:

```bash
node scripts/evals start \
  --suite agent-builder-dashboards \
  --project eis-anthropic-claude-4-5-sonnet \
  --evaluation-connector-id eis-anthropic-claude-4-5-sonnet
```

The Scout Kibana instance is usually available at <http://localhost:5620>, and Elasticsearch at <http://localhost:9220>.

### Run a Single Eval

Filter by Playwright test title with `--grep`:

```bash
node scripts/evals start \
  --suite agent-builder-dashboards \
  --grep "dashboards in chat smokescreen" \
  --project eis-anthropic-claude-4-5-sonnet \
  --evaluation-connector-id eis-anthropic-claude-4-5-sonnet
```

Available skill-selection test titles:

- `dashboards in chat smokescreen`
- `visualization request does not create dashboard`
- `esql query help does not create dashboard`

After the eval stack is already running, use `run` for faster iteration:

```bash
node scripts/evals run \
  --suite agent-builder-dashboards \
  --grep "visualization request does not create dashboard" \
  --project eis-anthropic-claude-4-5-sonnet \
  --evaluation-connector-id eis-anthropic-claude-4-5-sonnet
```

### Repetitions

By default, each dataset example runs once. To run each example multiple times, pass `--repetitions`:

```bash
node scripts/evals start \
  --suite agent-builder-dashboards \
  --grep "dashboards in chat smokescreen" \
  --project eis-anthropic-claude-4-5-sonnet \
  --evaluation-connector-id eis-anthropic-claude-4-5-sonnet \
  --repetitions 3
```

Equivalent environment variable:

```bash
EVALUATION_REPETITIONS=3 node scripts/evals run \
  --suite agent-builder-dashboards \
  --grep "dashboards in chat smokescreen" \
  --project eis-anthropic-claude-4-5-sonnet \
  --evaluation-connector-id eis-anthropic-claude-4-5-sonnet
```

### Direct Playwright

For lower-level debugging, run Playwright directly:

```bash
EVALUATION_CONNECTOR_ID=eis-anthropic-claude-4-5-sonnet \
node scripts/playwright test \
  --config x-pack/platform/packages/shared/agent-builder-dashboards/kbn-evals-suite-agent-builder-dashboards/playwright.config.ts \
  evals/skill_selection/skill_selection.spec.ts \
  --project eis-anthropic-claude-4-5-sonnet \
  --grep "esql query help does not create dashboard"
```

Use `--list` to check what Playwright can discover:

```bash
EVALUATION_CONNECTOR_ID=eis-anthropic-claude-4-5-sonnet \
node scripts/playwright test \
  --config x-pack/platform/packages/shared/agent-builder-dashboards/kbn-evals-suite-agent-builder-dashboards/playwright.config.ts \
  --project eis-anthropic-claude-4-5-sonnet \
  --list
```

## Sample Data

The skill-selection spec loads Kibana logs sample data before running:

```ts
await fetch('/api/sample_data/logs', {
  method: 'POST',
  version: '2023-10-31',
});
```

To verify the index exists in the Scout Elasticsearch cluster:

```bash
curl -u elastic:changeme "http://localhost:9220/_cat/indices/kibana_sample_data_logs?v"
curl -u elastic:changeme "http://localhost:9220/kibana_sample_data_logs/_count?pretty"
```

## Stopping the Stack

When you are done:

```bash
node scripts/evals stop
```
