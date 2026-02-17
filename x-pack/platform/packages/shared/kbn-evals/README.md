# @kbn/evals

`@kbn/evals` contains utilities for writing offline evaluation suites against LLM-based workflows in Kibana.

This package is built on top of `@kbn/scout` and the `@kbn/inference-*` packages. It bundles three main entry-points:

1. `createPlaywrightEvalsConfig` – helper that returns a ready-made Playwright config for evaluation suites. It automatically:

   - discovers available connectors from `kibana.yml` / `KIBANA_TESTING_AI_CONNECTORS` env var
   - duplicates the standard _local_ Playwright project once per connector so the same test file is executed for each model.

2. `evaluate` – a [`@playwright/test`](https://playwright.dev/docs/test-intro) extension that boots:

   - an Inference Client that is pre-bound to a Kibana connector
   - an executor client to run experiments (defaults to **in-Kibana**; can be switched to the Phoenix-backed executor)

3. `scripts/generate_schema` – optional utility to (re)generate typed GraphQL artifacts for the Phoenix schema using `@graphql/codegen`.
   This is not required to run evals and the generated artifacts are currently not used (we only have a single query), but it is useful if we add more queries.

## Writing an evaluation test

```ts
// my_eval.test.ts
import { evaluate } from '@kbn/evals';

evaluate('the model should answer truthfully', async ({ inferenceClient, executorClient }) => {
  const dataset = {
    name: 'my-dataset',
    description: 'my-description',
    examples: [
      {
        input: {
          content: 'Hi',
        },
        output: {
          content: 'Hey',
        },
      },
    ],
  };

  await executorClient.runExperiment(
    {
      dataset,
      task: async ({ input }) => {
        const result = await inferenceClient.output({
          id: 'foo',
          input: input.content as string,
        });

        return { content: result.content };
      },
    },
    [
      {
        name: 'equals',
        kind: 'CODE',
        evaluate: async ({ output, expected }) => {
          return {
            score: output?.content === expected?.content ? 1 : 0,
            metadata: { output: output?.content, expected: expected?.content },
          };
        },
      },
    ]
  );
});
```

### Typing datasets (recommended)

For strong typing of \(input\), \(expected\), and \(metadata\), define a suite-local `Example` type and use it consistently in your dataset, task, and evaluator selection:

```ts
import type { Example } from '@kbn/evals';

type MyExample = Example<
  { question: string },
  { expectedAnswer: string },
  { tags?: string[] } | null
>;
```

Then use helpers like `selectEvaluators<MyExample, MyTaskOutput>(...)` so your evaluator callback receives typed `expected`/`metadata`.

### Available fixtures

| Fixture                     | Description                                                                                                                                                                                              |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `inferenceClient`           | Bound to the connector declared by the active Playwright project.                                                                                                                                        |
| `executorClient`            | **Executor client** (implements `EvalsExecutorClient`) used to run experiments. Defaults to the **in-Kibana executor**; can be switched to the Phoenix-backed executor via `KBN_EVALS_EXECUTOR=phoenix`. |
| `phoenixClient`             | Alias for `executorClient` (kept for backwards compatibility).                                                                                                                                           |
| `evaluationAnalysisService` | Service for analyzing and comparing evaluation results across different models and datasets                                                                                                              |
| `reportModelScore`          | Function that displays evaluation results (can be overridden for custom reporting)                                                                                                                       |
| `traceEsClient`             | Dedicated ES client for querying traces. Defaults to `esClient` Scout fixture. See [Trace-Based Evaluators](#trace-based-evaluators-optional)                                                            |
| `evaluationsEsClient`       | Dedicated ES client for storing evaluation results. Defaults to `esClient` Scout fixture. See [Using a Separate Cluster for Evaluation Results](#using-a-separate-cluster-for-evaluation-results)        |

## Running the suite

### Evals CLI (recommended)

Use the evals CLI to discover and run suites with consistent, shareable commands:

```bash
# List eval suites from cached metadata (fast)
node scripts/evals list

# Refresh suite discovery (slower, scans configs)
node scripts/evals list --refresh

# Run a suite (EVALUATION_CONNECTOR_ID is required)
node scripts/evals run --suite obs-ai-assistant --evaluation-connector-id bedrock-claude

# Check local prerequisites and common setup hints
node scripts/evals doctor
```

The CLI uses suite metadata from:

```
x-pack/platform/packages/shared/kbn-evals/evals.suites.json
```

You can also render a CI label mapping (from suite metadata, useful for PR labels and automation):

```bash
node scripts/evals ci-map --json
```

To see all supported environment variables:

```bash
node scripts/evals env
```

### CI labels

Eval suites can be triggered in PR CI by adding GitHub labels:

- `evals:<suite-id>` (or the explicit `ciLabels` value from `evals.suites.json`)
- `evals:all` to run **all** eval suites

### CI ops: sharing a Vault update command

If you need to update the kbn-evals CI Vault config (and want an easy copy/paste command to share with @kibana-ops),
edit your local config and generate a Vault write command:

```bash
# 1) Copy the example (first time only)
cp x-pack/platform/packages/shared/kbn-evals/scripts/vault/config.example.json \
  x-pack/platform/packages/shared/kbn-evals/scripts/vault/config.json

# 2) Edit config.json with the desired values (includes secrets)

# 3) Print a vault write command (contains base64-encoded config)
node x-pack/platform/packages/shared/kbn-evals/scripts/vault/get_command.js
```

Share the output via a secure pastebin (for example `https://p.elstc.co`) and have ops run it.

The Vault config supports an optional `tracingExporters` array that configures OTel trace exporters for the eval Playwright worker process in CI. This is exported as the `TRACING_EXPORTERS` environment variable. See `config.example.json` for the full schema and [Configuring Trace Exporters via Environment Variable](#configuring-trace-exporters-via-environment-variable) for usage details.

### Local dev: LiteLLM (SSO)

If you have access to the internal LiteLLM gateway, you can generate a short-lived virtual key via SSO and export the connector payload needed by `@kbn/evals`:

```bash
bash x-pack/platform/packages/shared/kbn-evals/scripts/litellm/dev_env.sh
```

This script:

- logs you in with `litellm-proxy login` (SSO)
- if required by the deployment, expects `LITELLM_PROXY_API_KEY` (an `sk-...` key) to be set for `/key/*` management routes
- generates (or reuses) a LiteLLM virtual key (`sk-...`)
- exports `KIBANA_TESTING_AI_CONNECTORS` by discovering all models available to your team

After running it, pick an `EVALUATION_CONNECTOR_ID` from the generated connector ids and run a suite:

```bash
EVALUATION_CONNECTOR_ID=<connector-id> node scripts/evals run --suite agent-builder
```

#### Local flow (trace capture)

If you want local traces available for trace-based evaluators, run EDOT locally and start Scout using the built-in tracing config:

```bash
node scripts/edot_collector.js
node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet evals_tracing
node scripts/evals run --suite <suite-id> --evaluation-connector-id <connector-id>
```

If you are _not_ using Scout to start Kibana (e.g. you are targeting your own dev Kibana), configure the HTTP exporter in `kibana.dev.yml`:

```yaml
telemetry.tracing.exporters:
  - http:
      url: 'http://localhost:4318/v1/traces'
```

If you want EDOT to store traces in a specific Elasticsearch cluster, override via env:

```bash
ELASTICSEARCH_HOST=http://localhost:9220 node scripts/edot_collector.js
```

If you want to view traces in the Phoenix UI, configure a Phoenix exporter in `kibana.dev.yml`:

```yaml
telemetry.tracing.exporters:
  - phoenix:
      base_url: 'https://<my-phoenix-host>'
      public_url: 'https://<my-phoenix-host>'
      project_name: '<my-name>'
      api_key: '<my-api-key>'
```

This is **optional** for the default (in-Kibana) executor. If you only care about trace-based evaluators stored in Elasticsearch, you can just run the EDOT collector to capture traces locally (see `src/platform/packages/shared/kbn-edot-collector/README.md`).

Create a Playwright config that delegates to the helper:

```ts
// playwright.config.ts
import { createPlaywrightEvalsConfig } from '@kbn/evals';

export default createPlaywrightEvalsConfig({ testDir: __dirname });
```

Start scout:

```bash
node scripts/scout.js start-server --arch stateful --domain classic
```

If you want OTLP trace export enabled for evals, use the custom Scout config:

```bash
node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet evals_tracing
```

Now run the tests exactly like a normal Scout/Playwright suite in another terminal:

```bash
node scripts/playwright test --config x-pack/platform/packages/shared/<my-dir-name>/playwright.config.ts
```

### Trace-Based Evaluators (Optional)

Trace-based evaluators automatically collect non-functional metrics from OpenTelemetry traces stored in Elasticsearch:

- **Token usage** (input, output, cached tokens)
- **Latency** (request duration)
- **Tool calls** (number of tool invocations)
- You can build your own using `createTraceBasedEvaluator` factory.

By default, these evaluators query traces from the same Elasticsearch cluster as your test environment (the Scout `esClient` cluster).

#### Prerequisites

To enable trace-based evaluators, configure the HTTP exporter in `kibana.dev.yml` to export traces via OpenTelemetry.
You can also include the Phoenix exporter if you want traces visible in Phoenix (optional):

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

#### Start EDOT Collector

Start the EDOT (Elastic Distribution of OpenTelemetry) Gateway Collector to receive and store traces. Ensure Docker is running, then execute:

```bash
# Optionally use non-default ports using --http-port <http-port> or --grpc-port <grpc-port>
# You must update the tracing exporters with the right port in kibana.dev.yml
ELASTICSEARCH_HOST=http://localhost:9220 node scripts/edot_collector.js
```

The EDOT Collector receives traces from Kibana via the HTTP exporter and stores them in your local Elasticsearch cluster. Alternatively, you can use a managed OTLP endpoint instead of running EDOT Collector locally (this hasn't been tested yet though).

#### Using a Separate Monitoring Cluster

If your EDOT Collector stores traces in a different Elasticsearch cluster than your test environment (e.g., a common monitoring cluster for your team), specify the trace cluster URL with the `TRACING_ES_URL` environment variable:

```bash
TRACING_ES_URL=http://elastic:changeme@localhost:9200 node scripts/playwright test --config x-pack/platform/packages/shared/<my-dir-name>/playwright.config.ts
```

This creates a dedicated `traceEsClient` that connects to your monitoring cluster while `esClient` continues to use your test environment cluster.

#### Configuring Trace Exporters via Environment Variable

Instead of configuring trace exporters in `kibana.dev.yml`, you can set the `TRACING_EXPORTERS` environment variable to a JSON array of exporter configs. This is useful in CI or when you want to override the local config without editing YAML files.

The JSON array uses the same structure as `telemetry.tracing.exporters` in `kibana.dev.yml` and supports all exporter types: `http`, `grpc`, `phoenix`, and `langfuse`.

```bash
# HTTP exporter (e.g. to a remote OTLP ingest endpoint)
TRACING_EXPORTERS='[{"http":{"url":"https://ingest.elastic.cloud:443/v1/traces","headers":{"Authorization":"ApiKey ..."}}}]'

# Phoenix exporter
TRACING_EXPORTERS='[{"phoenix":{"base_url":"https://my-phoenix","api_key":"..."}}]'

# Multiple exporters
TRACING_EXPORTERS='[{"http":{"url":"https://ingest.elastic.cloud:443/v1/traces"}},{"phoenix":{"base_url":"https://my-phoenix"}}]'
```

When `TRACING_EXPORTERS` is set, it takes priority over any `telemetry.tracing.exporters` configured in `kibana.dev.yml`. When unset, `kibana.dev.yml` is used as before.

In CI, this is automatically extracted from the `tracingExporters` field in the vault config (see [CI ops: sharing a Vault update command](#ci-ops-sharing-a-vault-update-command)).

### RAG Evaluators

RAG (Retrieval-Augmented Generation) evaluators measure the quality of document retrieval in your system. They calculate Precision@K, Recall@K, and F1@K metrics by comparing retrieved documents against a ground truth.

#### Ground Truth Format

Ground truth is defined per index, mapping document IDs to relevance scores:

```typescript
{
  groundTruth: {
    'my-index': {
      'doc_id_1': 1,  // relevant
      'doc_id_2': 2,  // highly relevant
    },
    'another-index': {
      'doc_id_3': 1,
    },
  },
}
```

#### Using RAG Evaluators

```typescript
import { createRagEvaluators, type RetrievedDoc } from '@kbn/evals';

const ragEvaluators = createRagEvaluators({
  k: 10,
  relevanceThreshold: 1,
  extractRetrievedDocs: (output): RetrievedDoc[] => {
    // Extract { index, id } objects from your task output
    return output.results.map((r) => ({ index: r.index, id: r.id }));
  },
  extractGroundTruth: (referenceOutput) => referenceOutput?.groundTruth ?? {},
});
```

#### Index-Focused Evaluation

By default, all retrieved documents are evaluated against the ground truth. To evaluate only documents from indices that appear in the ground truth, set the `INDEX_FOCUSED_RAG_EVAL` environment variable:

```bash
INDEX_FOCUSED_RAG_EVAL=true node scripts/playwright test --config ...
```

Alternatively, configure it per-evaluator:

```typescript
const ragEvaluators = createRagEvaluators({
  k: 10,
  filterByGroundTruthIndices: true,  // Only evaluate docs from ground truth indices
  extractRetrievedDocs: ...,
  extractGroundTruth: ...,
});
```

#### Overriding K at Runtime

The `k` parameter determines how many top results are evaluated for Precision@K, Recall@K, and F1@K metrics. To override the `k` value defined in the evaluator config at runtime, use the `RAG_EVAL_K` environment variable:

```bash
RAG_EVAL_K=5 node scripts/playwright test --config ...
```

The environment variable takes priority over the value passed to `createRagEvaluators()`.

#### Using a Separate Cluster for Evaluation Results

If you want to store evaluation results (exported to `kibana-evaluations` datastream) in a different Elasticsearch cluster than your test environment, specify the cluster URL with the `EVALUATIONS_ES_URL` environment variable:

```bash
EVALUATIONS_ES_URL=http://elastic:changeme@localhost:9200 node scripts/playwright test --config x-pack/platform/packages/shared/<my-dir-name>/playwright.config.ts
```

This creates a dedicated `evaluationsEsClient` that connects to your evaluations cluster while `esClient` continues to use your test environment cluster.

## Customizing Report Display

By default, evaluation results are displayed in the terminal as a formatted table. You can override this behavior to create custom reports (e.g., JSON files, dashboards, or custom formats).

```ts
// my_eval.test.ts
import {
  evaluate as base,
  type EvaluationScoreRepository,
  type EvaluationScoreDocument,
} from '@kbn/evals';

export const evaluate = base.extend({
  reportModelScore: async ({}, use) => {
    // Custom reporter implementation
    await use(async (scoreRepository, runId, log) => {
      // Query Elasticsearch for evaluation results
      const docs = await scoreRepository.getScoresByRunId(runId);

      if (docs.length === 0) {
        log.error(`No results found for run: ${runId}`);
        return;
      }

      // Build your custom report
      log.info('=== CUSTOM REPORT ===');
      log.info(`Model: ${docs[0].model.id}`);
      log.info(`Run ID: ${runId}`);
      log.info(`Total evaluations: ${docs.length}`);

      // Group by dataset, calculate aggregates, write to file, etc.
      const datasetResults = groupByDataset(docs);
      writeToFile(`report-${runId}.json`, datasetResults);
    });
  },
});

evaluate('my test', async ({ executorClient }) => {
  // Your test logic here
});
```

**Note:** Elasticsearch export always happens first and is not affected by custom reporters. This ensures all results are persisted regardless of custom reporting logic.

## Elasticsearch Export

The evaluation results are automatically exported to Elasticsearch in datastream called `kibana-evaluations`. This provides persistent storage and enables analysis of evaluation metrics over time across different models and datasets.

### Golden cluster API key privileges (required)

When exporting to a “golden”/centralized Elasticsearch cluster via `EVALUATIONS_ES_URL` + `EVALUATIONS_ES_API_KEY`, the exporter will **ensure the `kibana-evaluations` data stream exists**. This requires the ability to create the data stream (internally an `indices:admin/data_stream/create` action), which is granted by index privileges like `create_index` (or broader `manage`/`all`) on the `kibana-evaluations*` pattern.

Use Kibana Dev Tools on the golden cluster to create an API key with the minimal required privileges:

```http
POST /_security/api_key
{
  "name": "kbn-evals-golden-cluster-writer",
  "expiration": "365d",
  "role_descriptors": {
    "kbn-evals-evaluations-writer": {
      "cluster": ["manage_index_templates"],
      "indices": [
        {
          "names": ["kibana-evaluations*"],
          "privileges": [
            "auto_configure",
            "create_index",
            "create_doc",
            "read",
            "view_index_metadata"
          ]
        }
      ]
    }
  },
  "metadata": {
    "application": "kbn-evals",
    "purpose": "export evaluation results",
    "environment": "ci"
  }
}
```

Then copy the returned `encoded` value into `evaluationsEs.apiKey` (Vault `kbn-evals` config) as `EVALUATIONS_ES_API_KEY`.

### Exporting to a separate Elasticsearch cluster

By default, exports go to the same Elasticsearch cluster used by the Scout test environment (`esClient` fixture).
If you want to keep using an isolated Scout cluster for the eval run, but export results to a different Elasticsearch cluster (e.g. your local `localhost:9200`), set:

```bash
EVALUATIONS_ES_URL=http://elastic:changeme@localhost:9200 node scripts/playwright test --config ...
```

### Datastream Structure

The evaluation data is stored with the following structure:

- **Index Pattern**: `kibana-evaluations*`
- **Datastream**: `kibana-evaluations`
- **Document Structure**:

  ```json
  {
    "@timestamp": "2025-08-28T14:21:35.886Z",
    "run_id": "run_123",
    "experiment_id": "exp_456",
    "suite": {
      "id": "my-suite"
    },
    "ci": {
      "buildkite": {
        "build_id": "bk-build-1",
        "job_id": "bk-job-1",
        "build_url": "https://buildkite.example/builds/1",
        "pipeline_slug": "my-pipeline",
        "pull_request": "123",
        "branch": "feature-branch",
        "commit": "deadbeef"
      }
    },
    "example": {
      "id": "example-1",
      "index": 0,
      "dataset": {
        "id": "dataset_id",
        "name": "my-dataset"
      }
    },
    "task": {
      "trace_id": "trace-task-123",
      "repetition_index": 0,
      "model": {
        "id": "gpt-4",
        "family": "gpt",
        "provider": "openai"
      }
    },
    "evaluator": {
      "name": "Correctness",
      "score": 0.85,
      "label": "PASS",
      "explanation": "The response was correct.",
      "metadata": {
        "successful": 3,
        "failed": 0
      },
      "trace_id": "trace-eval-456",
      "model": {
        "id": "claude-3",
        "family": "claude",
        "provider": "anthropic"
      }
    },
    "run_metadata": {
      "git_branch": "main",
      "git_commit_sha": "abc123",
      "total_repetitions": 1
    },
    "environment": {
      "hostname": "your-hostname"
    }
  }
  ```

Each document represents a single evaluator score for a single example (and repetition) within a `run_id`.

### Querying Evaluation Data

After running evaluations, you can query the results in Kibana using the query filter provided in the logs:

```kql
environment.hostname:"your-hostname" AND task.model.id:"model-id" AND run_id:"run-id"
```

### Using the Evaluation Analysis Service

The `evaluationAnalysisService` fixture provides methods to analyze and compare evaluation results:

```ts
evaluate('compare model performance', async ({ evaluationAnalysisService }) => {
  // The service automatically retrieves scores from Elasticsearch
  // and provides statistical analysis capabilities
  // Analysis happens automatically after experiments complete
});
```

### LLM-as-a-judge

Some of the evals will use LLM-as-a-judge. For consistent results, you should specify `EVALUATION_CONNECTOR_ID` as an environment variable, in order for the evaluations to always be judged by the same LLM:

```bash
EVALUATION_CONNECTOR_ID=bedrock-claude node scripts/playwright test --config x-pack/solutions/observability/packages/kbn-evals-suite-obs-ai-assistant/test/scout/ui/playwright.config.ts
```

### Testing a specific connector

The helper will spin up one `local` project per available connector so results are isolated per model. Each project is named after the connector id. To run the evaluations only for a specific connector, use `--project`:

```bash
node scripts/playwright test --config x-pack/solutions/observability/packages/kbn-evals-suite-obs-ai-assistant/test/scout/ui/playwright.config.ts --project azure-gpt4o
```

### Selecting specific evaluators

To enable selective evaluator execution, wrap your evaluators with the `selectEvaluators` function:

```ts
import { selectEvaluators } from '@kbn/evals';

await executorClient.runExperiment(
  {
    dataset,
    task: myTask,
  },
  selectEvaluators([
    ...createQuantitativeCorrectnessEvaluators(),
    createQuantitativeGroundednessEvaluator(),
  ])
);
```

Then control which evaluators run using the `SELECTED_EVALUATORS` environment variable with a comma-separated list of evaluator names:

```bash
SELECTED_EVALUATORS="Factuality,Relevance" node scripts/playwright test --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/test/scout/ui/playwright.config.ts
```

**RAG Evaluator Patterns:** For RAG metrics, use pattern names (`Precision@K`, `Recall@K`, `F1@K`) to select evaluators. The actual K values are controlled by `RAG_EVAL_K`:

```bash
# This will run Precision@5, Precision@10, Precision@20 (and same for Recall, F1) based on RAG_EVAL_K
SELECTED_EVALUATORS="Precision@K,Recall@K,F1@K,Factuality" RAG_EVAL_K=5,10,20 node scripts/playwright test ...
```

**Note:** K-specific names like `Precision@10` are not allowed in `SELECTED_EVALUATORS`. Always use the `@K` pattern and control K values via `RAG_EVAL_K`.

If not specified, all evaluators will run by default.

### Repeated evaluations

For statistical analysis and reliability testing, you can run the same evaluation examples multiple times.

**Note:** Each repetition creates a separate experiment in Phoenix with the same dataset name. This may change when Phoenix adds in-experiment repetitions in the future (see [issue](https://github.com/Arize-ai/phoenix/issues/3584)).

#### Configuring repetitions in your Playwright config

You can set a default number of repetitions for your entire test suite by adding the `repetitions` parameter to your Playwright configuration:

```ts
// playwright.config.ts
import { createPlaywrightEvalsConfig } from '@kbn/evals';

export default createPlaywrightEvalsConfig({
  testDir: __dirname,
  repetitions: 3, // Run each example 3 times
});
```

#### Overriding repetitions with environment variables

To override the repetitions at runtime without modifying your configuration, use the `EVALUATION_REPETITIONS` environment variable:

```bash
# Run each example 3 times
EVALUATION_REPETITIONS=3 node scripts/playwright test --config x-pack/solutions/observability/packages/kbn-evals-suite-obs-ai-assistant/test/scout/ui/playwright.config.ts
```

### Running evaluations against your local/development Kibana instance

To run evaluations against your local Kibana instance instead of the Scout server, manually create a Scout configuration file. This approach provides more control over the testing environment (running Kibana in Debug mode, connecting to local/remote test cluster, etc.). Running the Scout server is also not required for this approach.

To do this, you need to create (or override) a configuration file at `.scout/servers/local.json` and add host and auth details for your target Kibana instance:

```json
{
  "serverless": false,
  "isCloud": false,
  "hosts": {
    "kibana": "http://localhost:5601/<basePath>"
  },
  "auth": {
    "username": "elastic",
    "password": "changeme"
  }
}
```

Then you can run the evaluations as normal. The Playwright tests will use the provided configuration details to target your Kibana instance.

> **Note:** Running the Scout server with `node scripts/scout.js start-server --arch stateful --domain classic` will override any manual configuration in `.scout/servers/local.json` so you may need to update this file every time you want to switch between the two.

## Executor selection (Phoenix vs in-Kibana)

By default, evals run using the **in-Kibana executor** (no Phoenix dataset/experiment API required).

If you want to run using the **Phoenix-backed executor**, set:

```bash
KBN_EVALS_EXECUTOR=phoenix
```

When using `KBN_EVALS_EXECUTOR=phoenix`, the eval runner (Playwright worker process) needs Phoenix API settings.
The simplest way to provide them locally (e.g. when running `node scripts/phoenix`) is via environment variables:

```bash
PHOENIX_BASE_URL=http://localhost:6006 KBN_EVALS_EXECUTOR=phoenix node scripts/playwright test --config ...
```

If your Phoenix instance requires auth, also set:

```bash
PHOENIX_API_KEY=... PHOENIX_BASE_URL=... KBN_EVALS_EXECUTOR=phoenix node scripts/playwright test --config ...
```

#### Dataset upsert fallback (Phoenix-only)

Some Phoenix environments intermittently fail the GraphQL dataset upsert used to keep datasets in sync. As a fallback, `@kbn/evals` can **delete and recreate** the dataset via Phoenix REST APIs.

Because deleting a dataset **wipes all past experiments** on that dataset, this fallback is **disabled by default**. To explicitly allow it, set:

```bash
KBN_EVALS_PHOENIX_ALLOW_DATASET_DELETE_RECREATE_FALLBACK=true
```

Alternatively, you can configure a Phoenix exporter in `kibana.dev.yml` so `@kbn/evals` can read Phoenix API settings via `getPhoenixConfig()`.

```yaml
telemetry.tracing.exporters:
  - phoenix:
      base_url: 'https://<my-phoenix-host>'
      public_url: 'https://<my-phoenix-host>'
      project_name: '<my-name>'
      api_key: '<my-api-key>'
```
