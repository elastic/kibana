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

| Fixture           | Description                                                       |
| ----------------- | ----------------------------------------------------------------- |
| `inferenceClient` | Bound to the connector declared by the active Playwright project. |
| `phoenixClient`   | Client for the Phoenix API (to run experiments)                   |

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

## Regenerating Phoenix GraphQL types

```bash
node x-pack/platform/packages/shared/kbn-evals/scripts/generate_schema
```

The script temporarily installs GraphQL-Codegen, fetches the Phoenix schema, emits the artefacts into `kibana_phoenix_client/__generated__`, lints them, and finally removes the transient dependencies.
