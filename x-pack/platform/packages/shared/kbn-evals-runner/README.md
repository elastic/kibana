# @kbn/evals-runner

Server-safe runtime primitives for running LLM evaluations, shared between the `evals` plugin server routes and its custom Kibana Workflows steps.

## Why this package exists

`@kbn/evals` is **dev-only** (CLI/Scout tooling) and therefore cannot be imported from production server code. `@kbn/evals-runner` holds the small, dependency-light pieces that the server and the workflow steps both need at runtime:

- **`mapWithConcurrency`** — bounded concurrent `map` (a tiny, dependency-free stand-in for `p-limit`) used by `evals.evaluateDataset` to evaluate examples in parallel without one worker per example.
- **`buildScoreDocuments` / `composeScoreName`** — turn a multi-score `EvaluatorResult` (one LLM-judge invocation → many named scores) into the documents accepted by the score-ingestion API, fanning each named score into its own document.
- **Runner types** — `RunnerExample`, `TaskResult`, `EvaluatorScore`, `EvaluatorResult`, and score-document metadata shared across the server.

## Usage

```ts
import { mapWithConcurrency, buildScoreDocuments } from '@kbn/evals-runner';

// Evaluate up to 5 examples at a time.
const results = await mapWithConcurrency(examples, 5, async (example) => evaluate(example));

// Fan a multi-score evaluator result into ingest-ready score documents.
const body = buildScoreDocuments({
  experimentId,
  taskModel,
  evaluatorModel,
  metadata,
  example,
  task,
  evaluatorResults,
});
```

See the exported `BuildScoreDocumentsParams` / `MapWithConcurrencyOptions` types for the full parameter shapes.

See the plugin docs for how these are wired into workflow steps and task providers: [`evals` plugin — Workflow-based experiment execution](../../../plugins/shared/evals/README.md#workflow-based-experiment-execution).

## Testing

```bash
node scripts/jest x-pack/platform/packages/shared/kbn-evals-runner
```
