# @kbn/evals

`@kbn/evals` contains utilities for writing offline evaluation suites against LLM-based workflows in Kibana.

This package is built on top of `@kbn/scout` and the `@kbn/inference-*` packages. It bundles three main entry-points:

1. `createPlaywrightEvalsConfig` – helper that returns a ready-made Playwright config for evaluation suites. It automatically:

   - discovers available connectors from `kibana.yml` / `KIBANA_TESTING_AI_CONNECTORS` env var
   - duplicates the standard _local_ Playwright project once per connector so the same test file is executed for each model.

2. `evaluate` – a [`@playwright/test`](https://playwright.dev/docs/test-intro) extension that boots:

   - an Inference Client that is pre-bound to a Kibana connector
   - a (Kibana-flavored) Phoenix client to run experiments

3. `scripts/generate_schema` – one-off script that (re)generates typed GraphQL artifacts for the Phoenix schema using `@graphql/codegen`. The artifacts are currently not in use because we only have a single query, but the script is useful if we add more queries.

## Writing an evaluation test

```ts
// my_eval.test.ts
import { evaluate } from '@kbn/evals';

evaluate('the model should answer truthfully', async ({ inferenceClient, phoenixClient }) => {
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

  await phoenixClient.runExperiment({
    dataset,
    evaluators: [
      {
        name: 'equals',
        kind: 'CODE',
        evaluate: ({ input, output, expected }) => {
          return {
            score: output === 'bar' ? 1 : 0,
          };
        },
      },
    ],
    task: async ({ input }) => {
      return (
        await inferenceClient.output({
          id: 'foo',
          input: input.content as string,
        })
      ).content;
    },
  });
});
```

### Available fixtures

| Fixture                     | Description                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| `inferenceClient`           | Bound to the connector declared by the active Playwright project.                           |
| `phoenixClient`             | Client for the Phoenix API (to run experiments)                                             |
| `evaluationAnalysisService` | Service for analyzing and comparing evaluation results across different models and datasets |
| `reportModelScore`          | Function that displays evaluation results (can be overridden for custom reporting)          |

## Running the suite

Make sure that you've configured a Phoenix exporter in `kibana.dev.yml`:

```yaml
telemetry.tracing.exporters:
  phoenix:
    base_url: 'https://<my-phoenix-host>'
    public_url: 'https://<my-phoenix-host>'
    project_name: '<my-name>'
    api_key: '<my-api-key>'
```

Create a Playwright config that delegates to the helper:

```ts
// playwright.config.ts
import { createPlaywrightEvalsConfig } from '@kbn/evals';

export default createPlaywrightEvalsConfig({ testDir: __dirname });
```

Start scout:

```bash
node scripts/scout.js start-server --stateful
```

Now run the tests exactly like a normal Scout/Playwright suite in another terminal:

```bash
node scripts/playwright test --config x-pack/platform/packages/shared/<my-dir-name>/playwright.config.ts
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

evaluate('my test', async ({ phoenixClient }) => {
  // Your test logic here
});
```

**Note:** Elasticsearch export always happens first and is not affected by custom reporters. This ensures all results are persisted regardless of custom reporting logic.

## Elasticsearch Export

The evaluation results are automatically exported to Elasticsearch in datastream called `.kibana-evaluations`. This provides persistent storage and enables analysis of evaluation metrics over time across different models and datasets.

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
    },
    "tags": ["tag1", "tag2"]
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

await phoenixClient.runExperiment(
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
SELECTED_EVALUATORS="Factuality,Relevance" node scripts/playwright test --config x-pack/platform/packages/shared/onechat/kbn-evals-suite-onechat/playwright.config.ts
```

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

> **Note:** Running the Scout server with `node scripts/scout.js start-server --stateful` will override any manual configuration in `.scout/servers/local.json` so you may need to update this file every time you want to switch between the two.

## Regenerating Phoenix GraphQL types

```bash
node --require ./src/setup_node_env x-pack/platform/packages/shared/kbn-evals/scripts/generate_schema/index.ts
```

The script temporarily installs GraphQL-Codegen, fetches the Phoenix schema, emits the artefacts into `kibana_phoenix_client/__generated__`, lints them, and finally removes the transient dependencies.
