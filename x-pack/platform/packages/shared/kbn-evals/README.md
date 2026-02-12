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

### Tool Selection Evaluators

Tool selection evaluators verify that an LLM-based workflow selects the correct tools. They measure recall, precision, and order correctness of tool calls.

#### Using Tool Selection Evaluators

```typescript
import {
  createToolSelectionEvaluator,
  createToolSelectionEvaluators,
  type ExpectedToolSelection,
} from '@kbn/evals';

// Create a single evaluator
const toolEvaluator = createToolSelectionEvaluator({
  extractToolCalls: (output) => output.toolCalls,
  extractExpectedTools: (expected) => expected.expectedTools,
});

// Or create all tool selection evaluators at once
const allToolEvaluators = createToolSelectionEvaluators({
  extractToolCalls: (output) => output.toolCalls,
  extractExpectedTools: (expected) => expected.expectedTools,
});
```

#### Expected Tools Format

Define expected tools in your dataset examples:

```typescript
{
  expectedTools: {
    tools: ['search', 'retrieve', 'summarize'],
    orderMatters: true,   // Optional: check if tools are called in order
    exactMatch: false,    // Optional: fail if extra tools are called
  },
}
```

#### Available Evaluators

| Evaluator                   | Description                                                   |
| --------------------------- | ------------------------------------------------------------- |
| `Tool Selection`            | Overall selection correctness (combines recall/precision)      |
| `Tool Selection Recall`     | Fraction of expected tools that were called                   |
| `Tool Selection Precision`  | Fraction of called tools that were expected                   |
| `Tool Selection Order`      | Whether expected tools were called in the correct order       |

### Schema Compliance Evaluators

Schema compliance evaluators validate that tool call parameters conform to expected JSON schemas. They use [AJV](https://ajv.js.org/) for validation.

#### Using Schema Compliance Evaluators

```typescript
import {
  createSchemaComplianceEvaluator,
  createSchemaComplianceEvaluators,
  type ExpectedToolSchemas,
} from '@kbn/evals';

const schemaEvaluator = createSchemaComplianceEvaluator({
  extractToolCalls: (output) => output.toolCalls,
  extractExpectedSchemas: (expected) => expected.schemas,
});

// Or create all schema compliance evaluators at once
const allSchemaEvaluators = createSchemaComplianceEvaluators();
```

#### Expected Schemas Format

Define expected schemas in your dataset examples:

```typescript
{
  expectedSchemas: {
    schemas: {
      search: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          limit: { type: 'number', minimum: 1, maximum: 100 },
        },
        required: ['query'],
      },
      retrieve: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
    },
    strictMode: true,  // Optional: fail if tool has no matching schema
  },
}
```

#### Available Evaluators

| Evaluator                   | Description                                                   |
| --------------------------- | ------------------------------------------------------------- |
| `Schema Compliance`         | Overall compliance rate with detailed error reporting          |
| `Schema Compliance Rate`    | Percentage of tool calls passing validation                   |
| `Parameter Completeness`    | Fraction of required parameters present in tool calls         |

### Improvement Suggestions Service

The improvement suggestions service analyzes evaluation results and generates actionable recommendations for improving your LLM workflows. It supports both heuristic-based and LLM-based analysis.

#### Basic Usage (Heuristics Only)

```typescript
import { createImprovementSuggestionsService } from '@kbn/evals';

const service = createImprovementSuggestionsService({
  lowScoreThreshold: 0.7,      // Scores below this are considered low
  maxSuggestions: 10,          // Maximum suggestions to generate
});

// Analyze experiment results
const result = await service.analyze({
  experiment: ranExperiment,
  model: 'gpt-4',
});

console.log(result.suggestions);  // Array of improvement suggestions
console.log(result.summary);      // Summary by impact and category
```

#### With LLM Analysis

For deeper analysis, configure an LLM to analyze patterns:

```typescript
const service = createImprovementSuggestionsService({
  output: inferenceClient.output,
  connectorId: 'my-connector',
  analyzerModel: 'gpt-4',
  enableHeuristics: true,  // Combine with heuristic analysis
});

const result = await service.analyze({
  experiment: ranExperiment,
  additionalContext: 'This is a RAG workflow for documentation search',
  focusCategories: ['context_retrieval', 'accuracy'],
});
```

#### With Trace Preprocessing

To include trace data in the analysis:

```typescript
const service = createImprovementSuggestionsService({
  esClient,
  traceIndexPattern: 'traces-apm-*',
  maxSpansPerTrace: 1000,
});

// Fetch and analyze traces
const trace = await service.fetchTrace(traceId);
```

#### Suggestion Categories

Suggestions are categorized by area of improvement:

| Category            | Description                                      |
| ------------------- | ------------------------------------------------ |
| `prompt`            | System prompt or instruction improvements        |
| `tool_selection`    | Tool selection accuracy and efficiency           |
| `response_quality`  | Output formatting and clarity                    |
| `context_retrieval` | RAG/retrieval performance                        |
| `reasoning`         | Logical reasoning and problem-solving            |
| `accuracy`          | Factual correctness and precision                |
| `efficiency`        | Latency, token usage, and cost optimization      |
| `other`             | General improvements                             |

#### Suggestion Output Format

```typescript
interface ImprovementSuggestion {
  id: string;
  title: string;
  description: string;
  category: ImprovementSuggestionCategory;
  impact: 'high' | 'medium' | 'low';
  confidence: 'high' | 'medium' | 'low';
  evidence: Array<{
    evaluatorName: string;
    exampleIndices: number[];
    score?: number;
    explanation?: string;
  }>;
  actionItems: string[];
  priorityScore?: number;
  tags?: string[];
}
```

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

The evaluation results are automatically exported to Elasticsearch in datastream called `.kibana-evaluations`. This provides persistent storage and enables analysis of evaluation metrics over time across different models and datasets.

### Exporting to a separate Elasticsearch cluster

By default, exports go to the same Elasticsearch cluster used by the Scout test environment (`esClient` fixture).
If you want to keep using an isolated Scout cluster for the eval run, but export results to a different Elasticsearch cluster (e.g. your local `localhost:9200`), set:

```bash
EVALUATIONS_ES_URL=http://elastic:changeme@localhost:9200 node scripts/playwright test --config ...
```

### Datastream Structure

The evaluation data is stored with the following structure:

- **Index Pattern**: `.kibana-evaluations*`
- **Datastream**: `.kibana-evaluations`
- **Document Structure**:

  ```json
  {
    "@timestamp": "2025-08-28T14:21:35.886Z",
    "run_id": "026c5060fbfc7dcb",
    "model": {
      "id": "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
      "family": "anthropic",
      "provider": "bedrock"
    },
    "dataset": {
      "id": "dataset_id",
      "name": "my-dataset",
      "examples_count": 10
    },
    "evaluator": {
      "name": "Factuality",
      "stats": {
        "mean": 0.85,
        "median": 1.0,
        "std_dev": 0.37,
        "min": 0.0,
        "max": 1.0,
        "count": 10,
        "percentage": 85.0
      },
      "scores": [1.0, 0.8, 1.0, 0.6, 1.0]
    },
    "experiments": [{ "id": "experiment_id_1" }],
    "environment": {
      "hostname": "your-hostname"
    }
  }
  ```

### Querying Evaluation Data

After running evaluations, you can query the results in Kibana using the query filter provided in the logs:

```kql
environment.hostname:"your-hostname" AND model.id:"model-id" AND run_id:"run-id"
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
EVALUATION_CONNECTOR_ID=bedrock-claude node scripts/playwright test --config x-pack/solutions/observability/packages/kbn-evals-suite-obs-ai-assistant/playwright.config.ts
```

### Testing a specific connector

The helper will spin up one `local` project per available connector so results are isolated per model. Each project is named after the connector id. To run the evaluations only for a specific connector, use `--project`:

```bash
node scripts/playwright test --config x-pack/solutions/observability/packages/kbn-evals-suite-obs-ai-assistant/playwright.config.ts --project azure-gpt4o
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
SELECTED_EVALUATORS="Factuality,Relevance" node scripts/playwright test --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/playwright.config.ts
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
EVALUATION_REPETITIONS=3 node scripts/playwright test --config x-pack/solutions/observability/packages/kbn-evals-suite-obs-ai-assistant/playwright.config.ts
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

## Running Eval Suites Programmatically

The package provides utilities for running eval suites programmatically via subprocess. This is useful for:

- Orchestrating multiple eval suites in CI/CD pipelines
- Running eval suites from custom scripts or tools
- Integrating eval execution into feedback loops

### Running a Single Eval Suite

Use `runEvalSuiteSubprocess` to run an eval suite by spawning a child process:

```typescript
import { runEvalSuiteSubprocess } from '@kbn/evals';

const result = await runEvalSuiteSubprocess({
  configPath: 'x-pack/solutions/security/test/security_solution_evals/playwright.config.ts',
  project: 'azure-gpt4o', // Optional: run specific connector
  env: {
    EVALUATION_CONNECTOR_ID: 'my-connector',
    EVALUATION_REPETITIONS: '3',
  },
  workers: 4, // Optional: parallel workers
  timeout: 30 * 60 * 1000, // Optional: 30 minute timeout
  log, // Optional: ToolingLog instance for output
});

if (result.success) {
  console.log(`Eval suite completed in ${result.durationMs}ms`);
} else {
  console.error(`Eval suite failed with exit code ${result.exitCode}`);
}
```

### Running Multiple Eval Suites

Use `runMultipleEvalSuites` to run multiple suites sequentially or in parallel:

```typescript
import { runMultipleEvalSuites } from '@kbn/evals';

const result = await runMultipleEvalSuites({
  suites: [
    { configPath: 'path/to/suite1/playwright.config.ts' },
    { configPath: 'path/to/suite2/playwright.config.ts', project: 'azure-gpt4o' },
  ],
  parallel: true, // Run suites in parallel
  maxParallel: 2, // Maximum concurrent suites
  stopOnFailure: false, // Continue on failure (sequential mode only)
  log,
});

console.log(`${result.successCount}/${result.results.length} suites passed`);
```

### Creating a Reusable Runner

Use `createEvalSuiteSubprocessRunner` to create a runner with preset defaults:

```typescript
import { createEvalSuiteSubprocessRunner } from '@kbn/evals';
import { REPO_ROOT } from '@kbn/repo-info';

const runner = createEvalSuiteSubprocessRunner({
  log,
  cwd: REPO_ROOT,
  defaultEnv: {
    EVALUATION_CONNECTOR_ID: 'default-connector',
  },
  defaultTimeout: 20 * 60 * 1000, // 20 minutes
});

// Run a single suite
const result = await runner.run({
  configPath: 'path/to/playwright.config.ts',
});

// Run multiple suites
const batchResult = await runner.runMultiple({
  suites: [
    { configPath: 'path/to/suite1/playwright.config.ts' },
    { configPath: 'path/to/suite2/playwright.config.ts' },
  ],
  parallel: true,
});
```

### Configuration Options

| Option | Description |
| ------ | ----------- |
| `configPath` | Path to the Playwright config file (required) |
| `project` | Connector ID to filter tests to a specific project |
| `testFiles` | Array of specific test files to run |
| `grep` | Pattern to filter tests by name |
| `grepInvert` | Pattern to exclude tests by name |
| `env` | Environment variables to pass to the subprocess |
| `timeout` | Timeout in milliseconds (default: 30 minutes) |
| `workers` | Number of parallel workers |
| `headed` | Run in headed (visible browser) mode |
| `log` | ToolingLog instance for output capture |
| `cwd` | Working directory for the subprocess |
| `captureOutput` | Whether to capture stdout/stderr (default: true if log provided) |

## Feedback Loop Orchestrator

The feedback loop orchestrator enables iterative evaluation with automatic improvement suggestions. It runs evaluation cycles, analyzes results, and generates actionable recommendations for improving LLM workflows.

### Basic Usage

```typescript
import { createFeedbackLoopOrchestrator, createImprovementAnalyzer } from '@kbn/evals';

const orchestrator = createFeedbackLoopOrchestrator({
  executorClient,
  maxIterations: 5,
  minImprovementThreshold: 0.01,
  onSuggestion: (suggestion, iteration) => {
    console.log(`Iteration ${iteration}: ${suggestion.title}`);
  },
  onIterationComplete: (result) => {
    console.log(`Iteration ${result.iteration} complete: score ${result.meanScore}`);
  },
});

// Run the feedback loop
const controller = orchestrator.run({
  dataset,
  task: myTask,
  evaluators: myEvaluators,
  model: 'gpt-4',
  additionalContext: 'This is a RAG workflow for documentation search',
});

// Get the final result
const result = await controller.result;
console.log(`Improved from ${result.initialScore} to ${result.finalScore}`);
console.log(`Total suggestions: ${result.allSuggestions.length}`);
```

### Stopping the Loop

You can stop the feedback loop after the current iteration:

```typescript
const controller = orchestrator.run({ dataset, task, evaluators });

// Stop after some condition
setTimeout(() => controller.stop(), 60000);

const result = await controller.result;
if (result.terminationReason === 'manual_stop') {
  console.log('Loop was manually stopped');
}
```

### Single Iteration Mode

For manual control over iterations:

```typescript
const iteration1 = await orchestrator.runSingleIteration({
  dataset,
  task,
  evaluators,
});

// Apply changes based on suggestions...

const iteration2 = await orchestrator.runSingleIteration(
  { dataset, task, evaluators },
  2, // iteration number
  iteration1.meanScore // previous score
);

// Compare iterations
const comparison = orchestrator.compareIterations(iteration1, iteration2);
console.log(`Score delta: ${comparison.scoreDelta}`);
console.log(`New suggestions: ${comparison.newSuggestions.length}`);
console.log(`Resolved suggestions: ${comparison.resolvedSuggestions.length}`);
```

### Termination Reasons

| Reason | Description |
| ------ | ----------- |
| `max_iterations` | Reached the configured maximum iterations |
| `no_improvement` | Score decreased from previous iteration |
| `converged` | Improvement below the minimum threshold |
| `manual_stop` | Loop was stopped via `controller.stop()` |

## Eval Trace Correlation Service

The `EvalTraceCorrelationService` links evaluation runs with their corresponding OpenTelemetry trace data, enabling trace-based analysis and debugging.

### Basic Usage

```typescript
import { createEvalTraceCorrelationService } from '@kbn/evals';

const service = createEvalTraceCorrelationService({
  esClient,
  log,
  indexPattern: 'traces-*',
  maxSpansPerTrace: 1000,
});

// Correlate an experiment with trace IDs
const result = await service.correlateExperiment({
  experiment,
  traceIdMap: new Map([
    ['run-0-0', 'abc123...'],
    ['run-0-1', 'def456...'],
  ]),
});

// Access correlated data
for (const correlation of result.correlations) {
  console.log(`Run ${correlation.runKey}:`);
  console.log(`  LLM calls: ${correlation.trace?.metrics.llmCallCount}`);
  console.log(`  Total tokens: ${correlation.trace?.metrics.totalTokens}`);
  console.log(`  Evaluation scores:`, correlation.evaluationResults);
}
```

### Automatic Trace ID Extraction

If trace IDs are stored in experiment metadata:

```typescript
// Extract trace IDs from experiment metadata
const traceIdMap = service.extractTraceIdsFromExperiment(experiment, 'traceId');

// Correlate with extracted trace IDs
const result = await service.correlateExperiment({
  experiment,
  traceIdMap,
});
```

### Batch Correlation

Correlate multiple experiments at once:

```typescript
const batchResult = await service.batchCorrelate({
  experiments: [experiment1, experiment2, experiment3],
  skipMissingTraces: true,
  continueOnFetchError: true,
});

console.log(`Correlated ${batchResult.summary.totalCorrelated}/${batchResult.summary.totalRuns} runs`);
```

### Fetching Individual Traces

```typescript
// Fetch a single trace
const trace = await service.fetchTrace('abc123...');
console.log(`Trace has ${trace.spans.length} spans`);

// Fetch multiple traces
const traces = await service.fetchTraces(['abc123...', 'def456...']);
```

## Failed Evaluation Traces

The failed evaluation traces utility helps identify and analyze evaluation runs that didn't meet success criteria.

### Basic Usage

```typescript
import { getFailedEvaluationTraces, formatFailedEvaluationsSummary } from '@kbn/evals';

// Get traces for failed evaluations
const result = getFailedEvaluationTraces({
  correlations,
});

console.log(formatFailedEvaluationsSummary(result));
// Output:
// Failed Evaluations Summary
// ==================================================
// Total correlations: 100
// Failed: 15 (15.0%)
// Passed: 85
// 
// Failures by Evaluator:
//   correctness: 10
//   groundedness: 8
```

### Custom Failure Criteria

```typescript
const result = getFailedEvaluationTraces({
  correlations,
  evaluatorNames: ['correctness', 'groundedness'],
  failureCriteria: {
    scoreThreshold: 0.7,  // Scores below 0.7 are failures
    scoreComparison: 'below',  // 'below', 'belowOrEqual', or 'zero'
    treatNullScoreAsFailed: true,
    failureLabels: ['fail', 'incorrect', 'error'],
  },
});
```

### AND vs OR Logic

```typescript
// OR logic (default): Include if ANY evaluator failed
const orResult = getFailedEvaluationTraces({
  correlations,
  evaluatorNames: ['correctness', 'relevance'],
});

// AND logic: Include only if ALL specified evaluators failed
const andResult = getFailedEvaluationTraces({
  correlations,
  evaluatorNames: ['correctness', 'relevance'],
  requireAllEvaluatorsFailed: true,
});
```

### Getting Only Trace IDs

For lightweight retrieval when you only need trace IDs:

```typescript
import { getFailedEvaluationTraceIds } from '@kbn/evals';

const failedTraceIds = getFailedEvaluationTraceIds({
  correlations,
  failureCriteria: { scoreThreshold: 0.7 },
});

// Construct APM URLs
const apmUrls = failedTraceIds.map(
  (traceId) => `${apmBaseUrl}/traces?traceId=${traceId}`
);
```

### Grouping Failed Correlations

```typescript
import {
  groupFailedCorrelationsByEvaluator,
  groupFailedCorrelationsByCriterion,
} from '@kbn/evals';

const result = getFailedEvaluationTraces({ correlations });

// Group by evaluator
const byEvaluator = groupFailedCorrelationsByEvaluator(result.failedCorrelations);
const correctnessFailures = byEvaluator.get('correctness') || [];
console.log(`Correctness had ${correctnessFailures.length} failures`);

// Group by criterion
const byCriterion = groupFailedCorrelationsByCriterion(result.failedCorrelations);
const scoreBelowThreshold = byCriterion.get('score_below_threshold') || [];
```

## Result Collection Utilities

Utilities for aggregating and analyzing experiment results.

### Collecting Results

```typescript
import {
  collectExperimentResults,
  createResultCollector,
} from '@kbn/evals';

// Collect results from a single experiment
const experimentResults = collectExperimentResults(experiment);

console.log(`Dataset: ${experimentResults.datasetName}`);
console.log(`Total examples: ${experimentResults.totalExamples}`);
console.log(`Repetitions: ${experimentResults.repetitions}`);

// Access evaluator summaries
for (const [name, summary] of experimentResults.evaluatorSummaries) {
  console.log(`${name}: mean=${summary.meanScore}, pass=${summary.passingCount}/${summary.count}`);
}
```

### Result Collector for Multiple Experiments

```typescript
const collector = createResultCollector();

// Add experiments
collector.addExperiment(experiment1);
collector.addExperiment(experiment2);

// Or collect from executor client
await collector.collectFromClient(executorClient);

// Get aggregated summary
const summary = collector.getAggregatedSummary();
console.log(`Total experiments: ${summary.experimentCount}`);
console.log(`Total results: ${summary.totalResults}`);
```

### Filtering Results

```typescript
import { filterResults, getFailingResults, getPassingResults } from '@kbn/evals';

const experimentResults = collectExperimentResults(experiment);

// Filter by various criteria
const filtered = filterResults(experimentResults.results, {
  exampleIndex: 0,
  evaluatorName: 'correctness',
  minScore: 0.5,
  passing: false,  // Only failing results
});

// Get failing results for an evaluator
const failures = getFailingResults(experimentResults, 'correctness');
for (const { result, score } of failures) {
  console.log(`Example ${result.exampleIndex} failed with score ${score}`);
}

// Get passing results
const passes = getPassingResults(experimentResults, 'correctness');
```

### Accessing Results by Example or Repetition

```typescript
import { getResultsByExample, getResultsByRepetition, getScoresByEvaluator } from '@kbn/evals';

// Get all results for a specific example
const exampleResults = getResultsByExample(experimentResults, 0);

// Get all results for a specific repetition
const repetitionResults = getResultsByRepetition(experimentResults, 1);

// Get all scores for an evaluator
const scores = getScoresByEvaluator(experimentResults, 'correctness');
console.log(`Scores: ${scores.join(', ')}`);
```

## Eval Thread ID Utilities

Utilities for generating unique thread IDs for evaluation runs, useful for correlating runs across systems.

### Random Thread IDs

```typescript
import { generateEvalThreadId } from '@kbn/evals';

// Generate a random UUID
const threadId = generateEvalThreadId();
```

### Deterministic Thread IDs

Generate consistent IDs based on evaluation context:

```typescript
// Deterministic based on evaluation context
const threadId = generateEvalThreadId({
  datasetName: 'my-dataset',
  exampleIndex: 0,
  repetition: 1,
  runId: 'run-123',
});

// The same parameters always generate the same ID
const threadId2 = generateEvalThreadId({
  datasetName: 'my-dataset',
  exampleIndex: 0,
  repetition: 1,
  runId: 'run-123',
});

console.log(threadId === threadId2); // true
```

### Custom Seed

```typescript
// Use a custom seed for deterministic generation
const threadId = generateEvalThreadId({ seed: 'my-custom-seed' });
```

### Validation

```typescript
import { isValidEvalThreadId } from '@kbn/evals';

console.log(isValidEvalThreadId('550e8400-e29b-41d4-a716-446655440000')); // true
console.log(isValidEvalThreadId('invalid-id')); // false
```

### Parsing Seeds

If you have the original seed string, you can parse it:

```typescript
import { parseEvalThreadIdSeed } from '@kbn/evals';

const seed = 'dataset:my-dataset|example:0|rep:1|run:run-123';
const parsed = parseEvalThreadIdSeed(seed);
// { datasetName: 'my-dataset', exampleIndex: 0, repetition: 1, runId: 'run-123' }
```

## CI/CD Integration

This section documents common patterns for integrating `@kbn/evals` evaluation suites into CI/CD pipelines.

### Buildkite Integration

Kibana primarily uses Buildkite for CI/CD. Here's how to integrate evaluation suites.

#### Basic Pipeline Structure

Create a pipeline definition in `.buildkite/pipelines/`:

```yaml
# .buildkite/pipelines/my_evals/evals.yml
env:
  FTR_GEN_AI: '1'

steps:
  - label: '👨‍🔧 Pre-Build'
    command: .buildkite/scripts/lifecycle/pre_build.sh
    agents:
      image: family/kibana-ubuntu-2404
      imageProject: elastic-images-prod
      provider: gcp
      machineType: n2-standard-2

  - wait

  - label: '🧑‍🏭 Build Kibana Distribution'
    command: .buildkite/scripts/steps/build_kibana.sh
    agents:
      image: family/kibana-ubuntu-2404
      imageProject: elastic-images-prod
      provider: gcp
      machineType: n2-standard-8
    key: build
    if: "build.env('KIBANA_BUILD_ID') == null || build.env('KIBANA_BUILD_ID') == ''"

  - wait

  - command: .buildkite/scripts/steps/test/ftr_configs.sh
    env:
      FTR_CONFIG: 'path/to/your/ftr/config.ts'
      FTR_CONFIG_GROUP_KEY: 'ftr-my-evals'
      FTR_GEN_AI: '1'
    label: My Evaluation Suite
    key: ftr-my-evals
    timeout_in_minutes: 50
    parallelism: 1
    agents:
      image: family/kibana-ubuntu-2404
      imageProject: elastic-images-prod
      provider: gcp
      machineType: n2-standard-4
      preemptible: true
    retry:
      automatic:
        - exit_status: '-1'
          limit: 3
        - exit_status: '*'
          limit: 1
```

#### Running Playwright Evals in Buildkite

For Scout/Playwright-based evals (the standard `@kbn/evals` approach), create a step that runs Playwright:

```yaml
steps:
  # ... pre-build and build steps ...

  - command: |
      node scripts/scout.js start-server --stateful &
      sleep 60
      node scripts/playwright test --config path/to/playwright.config.ts
    env:
      EVALUATION_CONNECTOR_ID: 'my-connector-id'
      EVALUATION_REPETITIONS: '3'
      EVALUATIONS_ES_URL: '${EVALUATIONS_ES_URL}'
      KIBANA_TESTING_AI_CONNECTORS: '${KIBANA_TESTING_AI_CONNECTORS}'
    label: My Playwright Evals
    timeout_in_minutes: 60
    agents:
      machineType: n2-standard-4
      preemptible: true
```

#### Secrets Management in Buildkite

Store sensitive values (API keys, connector configs) as Buildkite secrets:

```yaml
env:
  # Reference secrets using Buildkite's secret syntax
  KIBANA_TESTING_AI_CONNECTORS: '${KIBANA_TESTING_AI_CONNECTORS}'
  EVALUATIONS_ES_URL: '${EVALUATIONS_ES_URL}'
  PHOENIX_API_KEY: '${PHOENIX_API_KEY}'
  PHOENIX_BASE_URL: '${PHOENIX_BASE_URL}'
```

Secrets are configured in the Buildkite organization settings and injected at runtime.

#### Pull Request Pipeline Integration

Add evaluation runs to PR checks in `.buildkite/pipelines/pull_request/`:

```yaml
# .buildkite/pipelines/pull_request/my_evals.yml
steps:
  - group: My Evaluation Suite
    key: my-evals
    depends_on:
      - build
      - quick_checks
      - checks
      - linting
    steps:
      - command: .buildkite/scripts/steps/test/ftr_configs.sh
        env:
          FTR_CONFIG: 'path/to/config.ts'
          FTR_CONFIG_GROUP_KEY: 'ftr-my-evals'
          FTR_GEN_AI: '1'
        label: Evaluation Tests
        timeout_in_minutes: 50
        agents:
          machineType: n2-standard-4
          preemptible: true
        retry:
          automatic:
            - exit_status: '-1'
              limit: 3
```

### GitHub Actions Integration

While Kibana primarily uses Buildkite, GitHub Actions can be useful for scheduled runs or simpler workflows.

#### Basic Workflow

```yaml
# .github/workflows/evals.yml
name: Evaluation Suite

on:
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM UTC
  workflow_dispatch:      # Manual trigger
    inputs:
      connector_id:
        description: 'Connector ID to use for evaluations'
        required: false
        default: 'default-connector'

jobs:
  evaluate:
    name: Run Evaluations
    runs-on: ubuntu-latest
    if: github.repository == 'elastic/kibana'
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          persist-credentials: false

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'

      - name: Install dependencies
        run: yarn kbn bootstrap

      - name: Start Elasticsearch
        run: |
          node scripts/es snapshot --license trial &
          sleep 120

      - name: Start Kibana
        run: |
          node scripts/kibana --dev &
          sleep 120
        env:
          KIBANA_TESTING_AI_CONNECTORS: ${{ secrets.KIBANA_TESTING_AI_CONNECTORS }}

      - name: Run Evaluations
        run: |
          node scripts/playwright test --config path/to/playwright.config.ts
        env:
          EVALUATION_CONNECTOR_ID: ${{ inputs.connector_id || 'default-connector' }}
          EVALUATION_REPETITIONS: '3'
          EVALUATIONS_ES_URL: ${{ secrets.EVALUATIONS_ES_URL }}

      - name: Upload Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: evaluation-results
          path: |
            test-results/
            playwright-report/
```

#### Secrets Configuration

Configure secrets in GitHub repository settings:

| Secret | Description |
| ------ | ----------- |
| `KIBANA_TESTING_AI_CONNECTORS` | JSON object with connector configurations |
| `EVALUATIONS_ES_URL` | Elasticsearch URL for storing results |
| `PHOENIX_API_KEY` | Phoenix API key (if using Phoenix executor) |
| `PHOENIX_BASE_URL` | Phoenix base URL (if using Phoenix executor) |

#### Matrix Strategy for Multiple Connectors

Run evaluations across multiple models:

```yaml
jobs:
  evaluate:
    strategy:
      fail-fast: false
      matrix:
        connector:
          - id: 'azure-gpt4o'
            name: 'Azure GPT-4o'
          - id: 'bedrock-claude'
            name: 'Bedrock Claude'
          - id: 'openai-gpt4'
            name: 'OpenAI GPT-4'
    
    steps:
      - name: Run Evaluations
        run: |
          node scripts/playwright test \
            --config path/to/playwright.config.ts \
            --project ${{ matrix.connector.id }}
```

### Common CI/CD Patterns

#### Environment Variables Reference

| Variable | Description | Required |
| -------- | ----------- | -------- |
| `EVALUATION_CONNECTOR_ID` | Default connector for LLM-as-judge evaluations | Recommended |
| `EVALUATION_REPETITIONS` | Number of times to repeat each example | No (default: 1) |
| `EVALUATIONS_ES_URL` | Elasticsearch URL for result storage | No (uses test cluster) |
| `TRACING_ES_URL` | Elasticsearch URL for trace data | No (uses test cluster) |
| `KIBANA_TESTING_AI_CONNECTORS` | JSON with connector configs | Yes |
| `KBN_EVALS_EXECUTOR` | Executor type (`phoenix` or default) | No |
| `PHOENIX_BASE_URL` | Phoenix server URL | Only if using Phoenix |
| `PHOENIX_API_KEY` | Phoenix API key | Only if using Phoenix |
| `SELECTED_EVALUATORS` | Comma-separated list of evaluators to run | No (runs all) |
| `RAG_EVAL_K` | Override K value for RAG evaluators | No |

#### Result Storage Strategy

For persistent result analysis, export to a dedicated Elasticsearch cluster:

```bash
# In CI environment
EVALUATIONS_ES_URL=https://evals-cluster.example.com:9243 \
  node scripts/playwright test --config ...
```

This allows querying evaluation trends over time independently of test clusters.

#### Scheduled Evaluation Runs

For nightly or weekly comprehensive evaluations:

```yaml
# Buildkite scheduled pipeline
steps:
  - trigger: my-evals-pipeline
    label: Nightly Evaluation Run
    build:
      env:
        EVALUATION_REPETITIONS: '5'
        SELECTED_EVALUATORS: 'Correctness,Relevance,Groundedness'
```

#### Parallel Execution

Leverage parallelism for faster feedback:

```yaml
# Run multiple eval suites in parallel
steps:
  - group: Evaluation Suites
    steps:
      - command: node scripts/playwright test --config suite1/playwright.config.ts
        label: Suite 1
        parallelism: 2
      - command: node scripts/playwright test --config suite2/playwright.config.ts  
        label: Suite 2
        parallelism: 2
```

#### Failure Handling

Configure retries for transient failures:

```yaml
retry:
  automatic:
    - exit_status: '-1'   # Agent disconnected
      limit: 3
    - exit_status: '*'    # Any other failure
      limit: 1
```

#### Conditional Execution

Run evals only when relevant code changes:

```yaml
# In Buildkite
if: |
  build.pull_request.labels includes 'ci:run-evals' ||
  build.message =~ /\[evals\]/
```

```yaml
# In GitHub Actions
on:
  pull_request:
    paths:
      - 'x-pack/solutions/*/packages/**/evals/**'
      - 'x-pack/platform/packages/**/kbn-evals/**'
```

### Best Practices

1. **Use Preemptible/Spot Instances**: Evaluation suites are retry-friendly, making them good candidates for cost savings.

2. **Separate Results Storage**: Export evaluation results to a dedicated cluster to preserve history across test environment resets.

3. **Pin Evaluation Models**: Use `EVALUATION_CONNECTOR_ID` to ensure consistent LLM-as-judge results.

4. **Configure Appropriate Timeouts**: LLM-based evaluations can be slow; set generous timeouts (30-60 minutes).

5. **Use Matrix Builds**: Test across multiple models simultaneously to compare performance.

6. **Archive Artifacts**: Save evaluation reports and traces for post-mortem analysis.

7. **Gate on Regressions**: Consider failing CI if evaluation scores drop below thresholds.
