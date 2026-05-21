# Evals plugin

The **Evals plugin** provides an in-Kibana UI for browsing LLM evaluation run results, per-evaluator statistics, and OpenTelemetry traces produced by the `@kbn/evals` evaluation framework.

## Architecture

The evaluation system spans three packages:

- `@kbn/evals-common` — shared schemas (OpenAPI-generated Zod types), constants, and Elasticsearch query builders. Used by both the plugin server routes and the CLI tooling in `@kbn/evals`. Server routes adapt these Zod schemas to Kibana's route validation via `buildRouteValidationWithZod` from `@kbn/zod-helpers/v4`.
- `@kbn/evals` — dev-only CLI tooling for running offline evaluation suites against LLM-based workflows. Writes evaluation score documents to the `kibana-evaluations` datastream and traces via OpenTelemetry.
- `evals` plugin (this package) — Kibana server routes that read from those indices, plus a React UI for browsing results.

```
┌──────────────────────────────────────────────────────────────┐
│  @kbn/evals  (CLI / dev-only)                                │
│  - runs evaluation suites                                    │
│  - writes scores to  kibana-evaluations  datastream          │
│  - emits traces via OTLP                                     │
└──────────────────┬───────────────────────────────────────────┘
                   │ imports shared query builders & types
                   ▼
┌──────────────────────────────────────────────────────────────┐
│  @kbn/evals-common                                           │
│  - OpenAPI schemas (Zod)                                     │
│  - ES query builders (buildRunFilterQuery, etc.)             │
│  - constants (URLs, index patterns, API versions)            │
└──────────────────┬───────────────────────────────────────────┘
                   │ imports shared query builders & types
                   ▼
┌──────────────────────────────────────────────────────────────┐
│  evals plugin  (this package)                                │
│  - server: 4 internal API routes (runs, run detail,          │
│    scores, traces)                                           │
│  - public: React UI (runs list, run detail, trace waterfall) │
│  - uses @kbn/llm-trace-waterfall for trace visualisation     │
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
      url: "http://localhost:4318/v1/traces"
```

Then start the EDOT collector in a separate terminal:

```bash
node scripts/edot_collector
```

### Prerequisite data

The plugin reads from two index patterns:

| Index pattern | Source | Contents |
|---|---|---|
| `kibana-evaluations*` | `@kbn/evals` score export | Evaluation score documents (one per example × evaluator × repetition) |
| `traces-*` | OTLP / EDOT collector | OpenTelemetry trace spans from evaluation task and evaluator runs |

Run evaluation suites via the `@kbn/evals` CLI to populate these indices. See the [`@kbn/evals` README](../../packages/shared/kbn-evals/README.md) for details.

## API routes

All routes are internal, versioned (`v1`), and require the `evals` privilege.

| Method | Path | Description |
|---|---|---|
| `GET` | `/internal/evals/runs` | List evaluation runs with summary metadata (paginated, filterable by suite, model, branch) |
| `GET` | `/internal/evals/runs/{runId}` | Get run detail with per-evaluator, per-dataset statistics |
| `GET` | `/internal/evals/runs/{runId}/scores` | Get individual score documents for a run |
| `GET` | `/internal/evals/traces/{traceId}` | Get trace spans for a given trace ID |

## UI pages

| Page | Route | Description |
|---|---|---|
| Runs list | `/app/evals` | Paginated table of evaluation runs with branch filter, model badges, CI links |
| Run detail | `/app/evals/runs/:runId` | Run metadata, evaluator statistics table, trace links, trace waterfall flyout |

The trace waterfall UI lives in the standalone `@kbn/llm-trace-waterfall` package so any plugin can consume it without depending on the evals runtime:

```ts
import { TraceWaterfall, createEsTraceFetcher } from '@kbn/llm-trace-waterfall';
```

The package ships a built-in ES fetcher (`createEsTraceFetcher`), or bring your own fetcher via the `TraceFetcher` callback interface.

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
