# @kbn/evals-runner

Server-safe runtime primitives for running LLM evaluations, shared across the evals plugin server (task providers and its custom Kibana Workflows steps).

## Why this package exists

`@kbn/evals` is **dev-only** (CLI/Scout tooling) and therefore cannot be imported from production server code. `@kbn/evals-runner` is the shared home for the runtime pieces that path needs. It is a _package_ (rather than plugin `server/` code) so the dev-only SDK and the production plugin can eventually converge on one implementation of the score-ingestion contract. Today only the plugin server consumes it. Converging the SDK's `buildIngestRequest` onto `buildScoreDocuments` is a known follow-up; until then the SDK builds the same document shape independently (see the sync note in `build_ingest_request.ts`).

- **`mapWithConcurrency`** — bounded concurrent `map` used by `ai.evals.evaluateDataset` to evaluate examples in parallel without one worker per example. It exists rather than reusing `@kbn/std`'s `asyncMapWithLimit` (or `p-map`) specifically for **`AbortSignal` support**: on cancellation it stops scheduling and rejects with `ConcurrencyAbortError` once in-flight work has settled. `fn` is treated as non-throwing — if it throws, remaining scheduled work still drains, then the map rejects with the first error and results are discarded, so callers wanting continue-on-error semantics must catch inside `fn`.
- **`buildScoreDocuments` / `composeScoreName`** — turn a multi-score `EvaluatorResult` (one LLM-judge invocation → many named scores) into the documents accepted by the score-ingestion API, fanning each named score into its own document. `composeScoreName` sets `evaluator.name` to the bare evaluator name for single-score evaluators, else `evaluator.score` (e.g. `correctness.factuality`) — an external contract that downstream queries and dashboards depend on.
- **Runner types** — `RunnerExample`, `TaskResult`, `EvaluatorScore`, `EvaluatorResult`, and score-document metadata shared across the server.

## Usage

```ts
import { mapWithConcurrency, buildScoreDocuments } from '@kbn/evals-runner';

// Evaluate up to 5 examples at a time. Cancellable via an AbortSignal.
const results = await mapWithConcurrency(examples, async (example) => evaluate(example), {
  concurrency: 5,
  signal: abortSignal,
});

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
