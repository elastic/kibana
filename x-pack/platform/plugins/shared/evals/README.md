# Evals plugin

The **Evals plugin** provides an in-Kibana UI for browsing LLM evaluation experiment results, per-evaluator statistics, and OpenTelemetry traces produced by the `@kbn/evals` evaluation framework.

## Architecture

The evaluation system spans three packages:

- `@kbn/evals-common` — shared schemas (OpenAPI-generated Zod types), constants, and Elasticsearch query builders. Used by both the plugin server routes and the CLI tooling in `@kbn/evals`.
- `@kbn/evals` — dev-only CLI tooling for running offline evaluation suites against LLM-based workflows. Ingests evaluation score documents via the Kibana API and emits traces via OpenTelemetry.
- `evals` plugin (this package) — Kibana server routes for experiment browsing, score ingestion, dataset management, tracing, and remote config, plus a React UI.

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

## API routes

All routes are internal (`elastic-api-version: 1`). Read routes require the `read_evals` privilege; write routes require `manage_evals`.

- **Experiments** — list, detail, scores, dataset-level examples, and statistical comparison of two experiments
- **Datasets** — full CRUD for datasets and their examples, plus a bulk upsert endpoint. Supports remote forwarding to a configured golden-cluster Kibana.
- **Scores** — bulk ingestion of evaluation score documents
- **Examples** — per-example score history across experiments
- **Traces** — span retrieval for a given trace ID
- **Tracing** — project-level aggregations (error rate, latency, token usage) and per-project trace listing with search
- **Remotes** — manage remote Kibana configurations for dataset forwarding

For full request/response schemas, see the OpenAPI definitions in [`@kbn/evals-common/impl/schemas/`](../../packages/shared/kbn-evals-common/impl/schemas/).

## Instrumentation profiles

Evaluator routes reconstruct a normalized evidence round (`input.message`, `response.message`, `steps`) from a trace using an **instrumentation profile**. Pass `subject.instrumentation.profile` on `_validate` / `_evaluate`; when omitted, **`elastic-inference`** is used.

| Profile | `user_query` | `agent_response` | `tool_calls` |
| --- | --- | --- | --- |
| `elastic-inference` (default) | LLM spans, `gen_ai.input.messages` (`genai_messages`) | LLM spans, `gen_ai.output.messages` (`genai_messages`) | TOOL spans via Elastic inference span kind |
| `otel-genai-attributes` | Trace attributes `gen_ai.input.messages` (`genai_messages`) | Trace attributes `gen_ai.output.messages` (`genai_messages`) | `execute_tool` spans |
| `otel-genai-events` | Log event `gen_ai.user.message` (string) | Log event `gen_ai.choice` (string) | `execute_tool` spans |
| `claude-code` | Log event `user_prompt` (string) | Log event `api_response_body` (`anthropic_message`) | `claude_code.tool` spans (`prefixed_json`) |

Profile definitions live in [`server/evaluators/evidence/profiles.ts`](server/evaluators/evidence/profiles.ts).

## UI pages

The plugin UI is organized into four navigation tabs:

- **Experiments** — paginated listing of evaluation experiments, detail view with per-evaluator stats, and a comparison view with paired t-test results
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
