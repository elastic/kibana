# Evals plugin

The **Evals plugin** provides an in-Kibana UI for browsing LLM evaluation experiment results, per-evaluator statistics, and OpenTelemetry traces produced by the `@kbn/evals` evaluation framework.

## Architecture

The evaluation system spans three packages:

- `@kbn/evals-common` — shared schemas (OpenAPI-generated Zod types), constants, and Elasticsearch query builders. Used by both the plugin server routes and the CLI tooling in `@kbn/evals`.
- `@kbn/evals` — dev-only CLI tooling for running offline evaluation suites against LLM-based workflows. Ingests evaluation score documents via the Kibana API and emits traces via OpenTelemetry.
- `@kbn/evals-runner` — server-safe runtime primitives shared between the plugin server and workflow steps (bounded-concurrency helpers, score-document builders, and the runner types). Unlike `@kbn/evals`, it is **not** dev-only, so it can be imported from production server code.
- `evals` plugin (this package) — Kibana server routes for experiment browsing, score ingestion, dataset management, tracing, and remote config; custom Kibana Workflows steps for running experiments on the server; plus a React UI.

```
┌──────────────────────────────────────────────────────────────┐
│  @kbn/evals  (CLI / dev-only)                                │
│  - runs evaluation suites                                    │
│  - ingests scores via POST /internal/evals/scores            │
│  - emits traces via OTLP                                     │
└──────────────────┬───────────────────────────────────────────┘
                   │ imports shared query builders & types
                   ▼
┌──────────────────────────────────────────────────────────────┐
│  @kbn/evals-common                                           │
│  - OpenAPI schemas (Zod)                                     │
│  - ES query builders                                         │
│  - constants (URLs, index patterns, API versions)            │
└──────────────────┬───────────────────────────────────────────┘
                   │ imports shared query builders & types
                   ▼
┌──────────────────────────────────────────────────────────────┐
│  evals plugin  (this package)                                │
│  - server: internal API routes for experiments, datasets,    │
│    scores, traces, tracing, and remotes                      │
│  - public: React UI (Experiments, Datasets, Tracing,         │
│    Remotes tabs)                                             │
│  - uses @kbn/llm-trace-waterfall for trace visualization     │
└──────────────────────────────────────────────────────────────┘
```

## Enabling the plugin

The plugin is **disabled by default**. To enable it locally, add the following to your `kibana.dev.yml`:

```yaml
# Enable the evals plugin
xpack.evals.enabled: true

# Required: enable experimental agent-builder features
uiSettings:
  overrides:
    agentBuilder:experimentalFeatures: true

# Disable APM (conflicts with OTel tracing)
elastic.apm.active: false
elastic.apm.contextPropagationOnly: false

# Enable tracing so evaluation traces are collected
telemetry.enabled: true
telemetry.tracing.enabled: true
telemetry.tracing.sample_rate: 1
telemetry.tracing.exporters:
  - http:
      url: 'http://localhost:4318/v1/traces'
```

Then start the EDOT collector in a separate terminal:

```bash
node scripts/edot_collector
```

### Prerequisite data

The plugin reads from the following indices:

| Index pattern                  | Source                | Contents                                |
| ------------------------------ | --------------------- | --------------------------------------- |
| `.evaluation-scores`           | Score ingestion API   | Evaluation score documents              |
| `.evaluation-datasets`         | Datasets API          | Dataset metadata                        |
| `.evaluation-dataset-examples` | Datasets API          | Dataset examples                        |
| `traces-*`                     | OTLP / EDOT collector | OpenTelemetry trace spans               |

Run evaluation suites via the `@kbn/evals` CLI to populate the scores and traces indices. See the [`@kbn/evals` README](../../packages/shared/kbn-evals/README.md) for details.

## Score ingestion

The `@kbn/evals` CLI sends scores via `POST /internal/evals/scores` rather than writing directly to Elasticsearch. The plugin validates the payload and persists documents to the `.evaluation-scores` data stream.

For a shared "golden cluster", set `EVALUATIONS_KBN_URL` (and optionally `EVALUATIONS_KBN_API_KEY`) to route score ingestion and dataset operations to a remote Kibana instance.

## Workflow-based experiment execution

In addition to the dev-only `@kbn/evals` CLI (which runs suites via Scout/Playwright in CI), the plugin can run **experiments on the server** using [Kibana Workflows](../../../../src/platform/plugins/shared/workflows_management). This path is **additive** — it does not change how evals run in CI — and it powers the in-Kibana "New experiment" UI as well as version-controlled experiment YAML.

An **experiment** evaluates one task model against N datasets. Running the same configuration against multiple models produces multiple experiments that can be compared.

> Workflows requires an **Enterprise** license. When Workflows is disabled or unlicensed, the `workflowsExtensions` / `workflowsManagement` dependencies are absent, the custom steps are simply not registered, and the experiment-execution routes return `501 Not Implemented`. The rest of the plugin (browsing, ingestion, datasets, tracing) is unaffected.

### Custom workflow steps

The plugin registers eight composable steps under the `evals.` namespace, layered from atomic primitives to whole-experiment lifecycle. Fine-grained steps give authors full control over dataset resolution, per-example trials, and failure handling; the composite steps are the ergonomic default.

| Step | Layer | Purpose |
| --- | --- | --- |
| `evals.resolveDataset` | atomic | Load one or more datasets and their examples. |
| `evals.executeTask` | atomic | Run the feature under evaluation against a single example; returns output + `trace_id`. |
| `evals.evaluateTrace` | atomic | Grade a single trace with one or more evaluators (shared by offline **and** online use cases). |
| `evals.ingestScores` | atomic | Persist evaluator scores for one example/repetition, fanning each named score into its own document. |
| `evals.evaluateExample` | composite | `executeTask` → `evaluateTrace` → `ingestScores` for a single example across repetitions. |
| `evals.evaluateDataset` | composite | Resolve datasets and evaluate every example with bounded internal concurrency. The workhorse step; implemented as a **durable poll step** so long runs don't block Task Manager workers. |
| `evals.startExperiment` | lifecycle | Mint the `experiment_id` / `execution_id` that group a run's scores. |
| `evals.compareExperiments` | lifecycle | Statistically compare two or more experiments (e.g. across models). |

Step definitions (Zod input/output schemas + i18n labels) live in [`common/workflows/steps.ts`](common/workflows/steps.ts) so the server handlers and the public YAML-editor metadata stay locked together. Server handlers are in [`server/workflows/`](server/workflows).

### Running experiments

**From the UI.** The **New experiment** button on the Experiments tab opens a form (connectors, task target, datasets, evaluators, repetitions, concurrency). The server infers the workflow topology from the inputs — you never pick a "shape":

- one model, few datasets → a single pooled execution;
- one model, many datasets (> 5) → one execution per dataset (fan-out), still one experiment;
- two or more models → one execution per model (fan-out), compared by the shared `execution_id`.

"Run now" launches the execution(s) and redirects to the experiment detail page, which polls live progress and offers cancellation. "Save as workflow" persists a reusable, self-contained workflow instead.

**From YAML.** Because steps are ordinary workflow steps, a data scientist can version-control an experiment as a workflow file and (re-)run it by posting the YAML to Workflows Management — no UI required. A minimal single-model experiment:

```yaml
version: '1'
name: Evaluate my-model
description: Saved evaluation experiment
enabled: true
tags:
  - evals
  - evals-experiment
settings:
  timeout: 24h
triggers:
  - type: manual
steps:
  - name: start
    type: evals.startExperiment
    with:
      task_model:
        id: my-model-connector-id
  - name: evaluate
    type: evals.evaluateDataset
    with:
      experiment_id: '{{ steps.start.output.experiment_id }}'
      execution_id: '{{ steps.start.output.execution_id }}'
      connector_id: my-model-connector-id
      dataset_ids:
        - my-dataset-id
      evaluators:
        - name: correctness
          connector_id: my-judge-connector-id # required for LLM evaluators
      repetitions: 1
      concurrency: 5
```

The UI's "Show YAML" toggle previews exactly this (via `POST /internal/evals/experiments/_preview`), so the form and the file format never diverge. See [`server/workflow_generator.ts`](server/workflow_generator.ts) for the fan-out / cross-model shapes.

### Concurrency & scalability

`evals.evaluateDataset` evaluates examples with a bounded internal pool (`concurrency`, via `mapWithConcurrency` from `@kbn/evals-runner`) rather than one worker per example. Larger experiments fan out into multiple executions across Task Manager workers. A global concurrency budget is split across concurrent executions so aggregate parallelism stays within the connector's rate limit instead of multiplying it. If the workflow engine gains native `foreach` concurrency / `parallel` execution, the composite steps can delegate to it without changing the YAML contract.

### Task providers

A **task provider** knows how to execute "the thing being evaluated" for one example. The plugin ships three built-ins:

| Provider id | Runs |
| --- | --- |
| `inference` | A direct model call via the Inference plugin (default). |
| `agentBuilder.converse` | An Agent Builder agent conversation. |
| `agentBuilder.tool` | A single Agent Builder tool/skill execution. |

`evals.executeTask` chooses a provider from the task target: `task_ref` (explicit) > `tool_id` > `agent_id` > `inference`.

Other plugins can register a **custom provider** (e.g. a real suite task like `sigEvents.identify`) through the setup contract, so their production feature — not a reimplementation — is what gets evaluated:

```ts
// In your plugin's server setup(), with `evals` as an optional dependency:
export class MyPlugin {
  setup(core: CoreSetup, plugins: { evals?: EvalsPluginSetup }) {
    plugins.evals?.registerTaskProvider({
      name: 'sigEvents.identify',
      description: 'Identify significant events for a document',
      async run(ctx) {
        // ctx: { input, connectorId, params, logger, abortSignal,
        //        getInferenceClient, callKibanaApi }
        const client = await ctx.getInferenceClient(ctx.connectorId);
        const output = await runMyFeature(client, ctx.input);
        return { output, traceId: getTraceId() };
      },
    });
  }
}
```

Reference the provider from YAML (or the UI's task-target picker, which lists registered providers) via `task_ref: sigEvents.identify`. The provider contract is defined in [`server/task_providers/types.ts`](server/task_providers/types.ts).

## API routes

All routes are internal (`elastic-api-version: 1`). Read routes require the `read_evals` privilege; write routes require `manage_evals`.

- **Experiments** — list, detail, scores, dataset-level examples, and statistical comparison of two experiments
- **Experiment execution (Workflows)** — launch (`_run`), save as reusable workflow (`_save_as_workflow`), preview generated YAML (`_preview`), list templates/task providers (`templates`), and poll or cancel a run (`executions/{id}`, `executions/{id}/_cancel`). These require an Enterprise license and the Workflows plugins; otherwise they return `501`.
- **Datasets** — full CRUD for datasets and their examples, plus a bulk upsert endpoint. Supports remote forwarding to a configured golden-cluster Kibana.
- **Scores** — bulk ingestion of evaluation score documents
- **Examples** — per-example score history across experiments
- **Traces** — span retrieval for a given trace ID
- **Tracing** — project-level aggregations (error rate, latency, token usage) and per-project trace listing with search
- **Remotes** — manage remote Kibana configurations for dataset forwarding

For full request/response schemas, see the OpenAPI definitions in [`@kbn/evals-common/impl/schemas/`](../../packages/shared/kbn-evals-common/impl/schemas/).

## UI pages

The plugin UI is organized into four navigation tabs:

- **Experiments** — paginated listing of evaluation experiments, detail view with per-evaluator stats, and a comparison view with paired t-test results. The **New experiment** flow launches or saves workflow-based runs and streams live progress on the detail page (see [Workflow-based experiment execution](#workflow-based-experiment-execution)).
- **Datasets** — manage evaluation datasets and examples (CRUD, JSON editor)
- **Tracing** — browse tracing projects with metrics, drill into individual traces with a waterfall view
- **Remotes** — configure remote Kibana instances for cross-cluster dataset management

The trace waterfall UI lives in the standalone `@kbn/llm-trace-waterfall` package. The evals plugin uses it for trace visualization but does not re-export it — other plugins can depend on `@kbn/llm-trace-waterfall` directly.

## Development

### Running tests

```bash
# Plugin unit tests
yarn test:jest --config=x-pack/platform/plugins/shared/evals/jest.config.js

# Shared query builders tests
yarn test:jest --config=x-pack/platform/packages/shared/kbn-evals-common/jest.config.js
```

### Regenerating OpenAPI schemas

The Zod types in `@kbn/evals-common` are generated from OpenAPI `.schema.yaml` files:

```bash
cd x-pack/platform/packages/shared/kbn-evals-common
yarn openapi:generate
```

After regenerating, you may need to fix unused imports added by the generator:

```bash
node scripts/eslint --fix x-pack/platform/packages/shared/kbn-evals-common/impl/schemas/**/*.gen.ts
```
