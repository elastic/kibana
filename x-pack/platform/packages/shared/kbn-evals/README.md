# @kbn/evals

`@kbn/evals` contains utilities for writing offline evaluation suites against LLM-based workflows in Kibana.

## Vision Alignment

This package follows the strategic direction outlined in the "Future of @kbn/evals" vision document. Contributors should be aware of these principles:

- **Trace-first evaluators**: New evaluators should derive signals from OTel traces stored in Elasticsearch when possible. Use `createTraceBasedEvaluator` for non-functional metrics. For evaluators that currently operate on in-memory output, design interfaces that also accept `traceId` references for future API-based evaluation.
- **Elastic-native path**: Build on ES/Kibana/OTel capabilities rather than introducing new external dependencies. Phoenix usage should remain behind `KBN_EVALS_EXECUTOR=phoenix` and not expand.
- **Shared evaluation layer**: This package provides primitives (evaluator factories, data model, persistence, reporting). Solution-specific evaluators, datasets, and reporting belong in solution-owned evaluation suites, not here.
- **Code-defined datasets**: Evaluation datasets should be defined in code, versioned, and reviewed alongside suites. Ad-hoc datasets must be explicitly decoupled from CI-contributing datasets.
- **Ownership**: Framework is owned by the Observability AI team. General-purpose evaluators discovered in solution suites should be contributed upstream.

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

### Quick start (recommended)

The fastest way to go from zero to running evals locally:

```bash
# 1. Set up connectors (one-time, interactive wizard)
node scripts/evals init

# 2. Start everything and run a suite (one command, one terminal)
node scripts/evals start --suite agent-builder
```

`evals init` walks you through EIS (Cloud Connected Mode) connector discovery or validates existing connectors in `kibana.dev.yml`. It outputs an `export KIBANA_TESTING_AI_CONNECTORS="..."` command to paste into your shell.

`evals start` orchestrates the full stack in one terminal:
1. Starts the EDOT collector (Docker) for trace capture -- exports traces to the configured tracing Elasticsearch cluster (via `TRACING_ES_URL`)
2. Starts Scout (ES + Kibana with `evals_tracing` config)
3. Enables EIS CCM on the Scout ES cluster (if using EIS connectors)
4. Runs the Playwright eval suite with `TRACING_ES_URL` pointing to the configured tracing cluster

EDOT and Scout run as **persistent background daemons** -- they stay alive between eval runs for faster iteration. Use `node scripts/evals stop` to shut them down when you're done.

Both commands prompt interactively when flags are omitted (suite, connector, model). Pass `--skip-server` to skip EDOT/Scout startup if you already have them running.

#### Profiles: golden datasets + local export (recommended for UI iteration)

For iterating on the Evals UI (runs list / run detail pages), it’s often useful to:

- **Read datasets from the golden cluster** (shared, curated datasets)
- **Write results + traces to your local Elasticsearch/Kibana** (`http://localhost:9200` / `http://localhost:5601`)

The Evals CLI supports this via **vault config profiles** in:

- `x-pack/platform/packages/shared/kbn-evals/scripts/vault/`
- `config.json` (default)
- `config.<profile>.json` (e.g. `config.local.json`)

Create the profiles:

```bash
# 1) Golden cluster config (datasets + keys)
node scripts/evals init config

# 2) Local export profile (results + traces to localhost:9200, no golden API key setup)
node scripts/evals init config --profile local
```

Run a suite using golden datasets but exporting locally:

```bash
node scripts/evals start --suite attack-discovery --export-profile local
```

Notes:
- `--datasets-profile <name>` loads `EVALUATIONS_KBN_URL` / `EVALUATIONS_KBN_API_KEY` from `config.<name>.json`
- `--export-profile <name>` loads `EVALUATIONS_ES_URL`, `TRACING_ES_URL`, and `TRACING_EXPORTERS` from `config.<name>.json`

#### Filtering tests with `--grep`

To run only specific tests within a suite (useful for fast iteration):

```bash
node scripts/evals start --suite agent-builder --grep "product documentation"
node scripts/evals run --suite agent-builder --grep "analytical queries"
```

This passes Playwright's `--grep` filter, matching test names against the pattern.

#### Flag aliases

For convenience, `start` and `run` support shorter aliases:

- `--model` is an alias for `--project` (which connector/model to evaluate)
- `--judge` is an alias for `--evaluation-connector-id` (which connector judges the results)

```bash
node scripts/evals start --suite agent-builder --model eis-gpt-4.1 --judge eis-claude-4-5-sonnet
```

### Evals CLI commands

```bash
node scripts/evals init                  # Set up connectors (EIS or validate existing)
node scripts/evals start [--suite <id>]  # Start stack + run an eval suite
node scripts/evals stop                  # Stop background EDOT + Scout daemons
node scripts/evals logs [--service <n>]  # Tail logs from background services
node scripts/evals scout                 # Start Scout with evals config (standalone)
node scripts/evals run [--suite <id>]    # Run an eval suite (stack must be running)
node scripts/evals list [--refresh]      # List eval suites
node scripts/evals doctor                # Check prerequisites, offer auto-fixes
node scripts/evals compare <a> <b>       # Compare two eval runs
node scripts/evals env                   # List environment variables
node scripts/evals ci-map [--json]       # Output CI label mapping
```

See [CLI.md](./CLI.md) for the full command reference with all flags and examples.

The CLI uses suite metadata from:

```
.buildkite/pipelines/evals/evals.suites.json
```

### CI labels

Eval suites can be triggered in PR CI by adding GitHub labels:

- `evals:<suite-id>` (or the explicit `ciLabels` value from `evals.suites.json`)
- `evals:all` to run **all** eval suites

### CI labels: model selection + judge override

Evals support optional PR labels for selecting which connector projects to run and (separately) which connector should be used for LLM-as-a-judge evaluators:

- **Model selection** (required — evals are skipped if no `models:*` label is present):
  - `models:<model-group>` to select one or more model groups
    - LiteLLM model groups typically look like `llm-gateway/<model>`
    - EIS model groups are expressed as `eis/<modelId>` (e.g. `models:eis/gpt-4.1`)
  - `models:weekly-eis-models` — per-suite EIS model alias. Resolves to each suite's `weeklyEisModelGroups` in `evals.suites.json`, falling back to `DEFAULT_WEEKLY_EIS_MODELS`.
- **Judge override**:
  - `models:judge:<connector-id>` to override the connector id used for LLM-as-a-judge evaluators in CI.
    This takes precedence over the Vault `evaluationConnectorId` fallback (env var overrides still apply in local runs).

Other model group aliases are defined in `MODEL_GROUP_ALIASES`.

#### Automated label sync

The `models:*` and `models:judge:*` labels are automatically synced from LiteLLM and EIS model discovery:

- **Weekly**: The weekly LLM evals pipeline includes a label sync step that runs alongside the build.
- **On demand**: Add the `ci:sync-model-labels` label to any PR to trigger label sync in PR CI.

The sync step:
1. Discovers available models from both **LiteLLM** (`GET /v1/models`) and **EIS** (via `discover_eis_models.js`)
2. Creates/updates labels for all discovered models
3. Marks stale labels as deprecated (renamed from `models:*` to `deprecated:models:*`)

Deprecated labels are kept for historical record — they remain visible on past PRs. The `deprecated:` prefix moves them out of the `models:` autocomplete namespace so they don't clutter label suggestions.

#### CI ops: create/update model + judge labels manually

The helper script `scripts/create_models_labels.sh` is idempotent (safe to re-run) and supports targeting a specific repo.

Update **all** model + judge labels (LiteLLM + EIS) using default discovery sources:

```bash
./scripts/create_models_labels.sh --repo elastic/kibana --update-all-labels
```

To also deprecate stale labels in one step:

```bash
./scripts/create_models_labels.sh --repo elastic/kibana --update-all-labels --prune
```

If you need to run only a subset:

```bash
# EIS model labels (models:eis/<modelId>)
./scripts/create_models_labels.sh --repo elastic/kibana --from-eis-models-json

# EIS judge labels (models:judge:eis/<modelId>)
./scripts/create_models_labels.sh --repo elastic/kibana --judge-from-eis-models-json

# LiteLLM model labels (models:<model-group>)
./scripts/create_models_labels.sh --repo elastic/kibana --from-litellm-vault-config

# LiteLLM judge labels (models:judge:<model-group>)
./scripts/create_models_labels.sh --repo elastic/kibana --judge-from-litellm-vault-config
```

Create/update a specific judge override label:

```bash
./scripts/create_models_labels.sh --repo elastic/kibana \
  --judge litellm-llm-gateway-gpt-4o
```

### CI telemetry: tagging EIS traffic

When running evals against **EIS-backed models**, `@kbn/evals` can tag inference requests with:

- **Header**: `X-Elastic-Product-Use-Case`
- **Value**: `<pluginId>`

This value is sent via `metadata.connectorTelemetry.pluginId` on inference API calls and is forwarded to the ES `_inference` request.

By default, `@kbn/evals` sets this to `kbn_evals`.

To override (rare), set:

- **pluginId**: `KBN_EVALS_TELEMETRY_PLUGIN_ID`

Example:

```bash
EVAL_SUITE_ID=agent-builder ...
# -> X-Elastic-Product-Use-Case: kbn_evals
```

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

To sync your local `config.json` from Vault (requires Vault auth):

```bash
node x-pack/platform/packages/shared/kbn-evals/scripts/vault/retrieve_secrets.js --vault ci-prod
```

### Local dev: EIS (CCM)

To run eval suites against **EIS-backed models** locally, you need:

- **EIS connectors** in `KIBANA_TESTING_AI_CONNECTORS` (so `@kbn/evals` can build Playwright projects)
- **CCM enabled** on your test Elasticsearch cluster (so EIS inference endpoints exist)

**Recommended flow** -- use the interactive CLI:

```bash
# 1) Set up connectors (automates Vault, model discovery, connector generation)
node scripts/evals init

# 2) Export the KIBANA_TESTING_AI_CONNECTORS value printed by init

# 3) Start everything and run a suite
node scripts/evals start --suite <suite-id>
```

`evals start` handles EDOT, Scout, and EIS CCM enablement automatically.

## Snapshot datasets (Dataplex)

Snapshot datasets used by eval suites are stored in GCS and can optionally be registered in **Dataplex** for discoverability (see the Snapshot Dataset Management best practices).

### Where aspects files live

Team-owned Dataplex aspects YAML files are checked in under:

- `x-pack/platform/packages/shared/kbn-evals/snapshots/dataplex/<team>/`

These YAML files are **metadata only** (GCS path, description, indices, etc). Never commit credentials.

### Syncing Dataplex entries from aspects files

This repo includes a helper command that runs `gcloud dataplex entries create/update` based on those YAML files:

```bash
# One-time: create the aspect type + entry type + entry group (requires permissions)
node scripts/evals dataplex bootstrap

# Create/update entries for all checked-in aspects YAML files
node scripts/evals dataplex sync

# Dry run (print what would happen)
node scripts/evals dataplex sync --dry-run

# If you do not have Dataplex write permissions, generate commands to hand off
node scripts/evals dataplex sync --print-commands
```

Note: The **Dataplex "Aspect types"** console page lists *schemas*. Snapshot datasets themselves show up under Dataplex **Entries**.

<details>
<summary>Manual flow (if you prefer full control)</summary>

```bash
# 1) Provide the CCM API key (used to enable CCM on your test ES cluster)
# (requires Vault auth)
export KIBANA_EIS_CCM_API_KEY="$(vault read -field key secret/kibana-issues/dev/inference/kibana-eis-ccm)"

# 2) Discover available EIS models (writes target/eis_models.json)
node scripts/discover_eis_models.js

# 3) Generate EIS connector payload for @kbn/evals (base64 JSON)
export KIBANA_TESTING_AI_CONNECTORS="$(node x-pack/platform/packages/shared/kbn-evals/scripts/ci/generate_eis_connectors.js)"

# 4) Pick a connector id to use for judge + project (example prints the first 30 ids)
node -e "const o=JSON.parse(Buffer.from(process.env.KIBANA_TESTING_AI_CONNECTORS,'base64').toString('utf8'));console.log(Object.keys(o).slice(0,30).join('\\n'))"
export EVALUATION_CONNECTOR_ID="eis-<model>"

# 5) Start Scout (the evals config sets auto-preconfigure EIS connectors in Kibana from KIBANA_TESTING_AI_CONNECTORS)
node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet evals_tracing

# 6) Enable CCM on the *Scout* ES cluster and wait for EIS endpoints
node x-pack/platform/packages/shared/kbn-evals/scripts/local_repros/enable_eis_ccm.js

# 7) Run an eval suite against a single EIS connector project
node scripts/evals run --suite <suite-id> --project "$EVALUATION_CONNECTOR_ID"
```

</details>

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

`evals start` handles this automatically. If you prefer to manage services manually:

```bash
node scripts/edot_collector.js
node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet evals_tracing
node scripts/evals run --suite <suite-id> --evaluation-connector-id <connector-id>
```

If you are _not_ using Scout to start Kibana (e.g. you are targeting your own dev Kibana), configure the HTTP exporter in `kibana.dev.yml`:

```yaml
elastic.apm.active: false
elastic.apm.contextPropagationOnly: false
telemetry.enabled: true
telemetry.tracing.enabled: true
telemetry.tracing.sample_rate: 1
telemetry.tracing.exporters:
  - http:
      url: 'http://localhost:4318/v1/traces'
```

> **Note:** `elastic.apm.active: false` and `elastic.apm.contextPropagationOnly: false` are required when enabling OpenTelemetry tracing — Elastic APM and OTel tracing cannot run simultaneously. The Scout `evals_tracing` config set handles this automatically, but when configuring `kibana.dev.yml` directly you must set both.

If you want EDOT to store traces in a specific Elasticsearch cluster, override via env:

```bash
ELASTICSEARCH_HOST=http://localhost:9200 node scripts/edot_collector.js
```

If you want to view traces in the Phoenix UI, add a Phoenix exporter to the `telemetry.tracing.exporters` list in `kibana.dev.yml` (alongside the APM and telemetry flags shown above):

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

To enable trace-based evaluators, configure tracing in `kibana.dev.yml`. You must also disable Elastic APM (it conflicts with OpenTelemetry tracing):

```yaml
elastic.apm.active: false
elastic.apm.contextPropagationOnly: false
telemetry.enabled: true
telemetry.tracing.enabled: true
telemetry.tracing.sample_rate: 1
telemetry.tracing.exporters:
  - phoenix:
      base_url: 'https://<my-phoenix-host>'
      public_url: 'https://<my-phoenix-host>'
      project_name: '<my-name>'
      api_key: '<my-api-key>'
  - http:
      url: 'http://localhost:4318/v1/traces'
```

The Phoenix exporter is optional - include it if you want traces visible in Phoenix.

#### Start EDOT Collector

Start the EDOT (Elastic Distribution of OpenTelemetry) Gateway Collector to receive and store traces. Ensure Docker is running, then execute:

```bash
# Optionally use non-default ports using --http-port <http-port> or --grpc-port <grpc-port>
# You must update the tracing exporters with the right port in kibana.dev.yml
ELASTICSEARCH_HOST=http://localhost:9200 node scripts/edot_collector.js
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

#### Using Separate Clusters and Kibana

Use these settings when traces, evaluation results, or managed datasets live outside the default Scout Kibana/Elasticsearch pair.

| Variable | CLI flag | Purpose |
| --- | --- | --- |
| `TRACING_ES_URL` | `--trace-es-url` | Sends trace-based evaluator queries to a separate monitoring Elasticsearch cluster. |
| `EVALUATIONS_ES_URL` | `--evaluations-es-url` | Exports evaluation scores to a separate Elasticsearch cluster. |
| `EVALUATIONS_KBN_URL` | `--evaluations-kbn-url` | Routes dataset upsert and dataset lookup operations to a separate Kibana instance. |
| `EVALUATIONS_KBN_API_KEY` | `--evaluations-kbn-api-key` | Optional API key used for dataset Kibana operations when `EVALUATIONS_KBN_URL` is set. |

#### Using a Separate Kibana for Dataset Operations

By default, dataset sync (`POST /internal/evals/datasets/_upsert`) and dataset resolution by name use the same Kibana client as the eval run.
If your datasets are curated in another Kibana instance, set `EVALUATIONS_KBN_URL` (or `--evaluations-kbn-url`) so dataset operations target that instance instead.

When that remote Kibana should be accessed with an API key, set `EVALUATIONS_KBN_API_KEY` (or `--evaluations-kbn-api-key`).
When `EVALUATIONS_KBN_API_KEY` is provided, requests use `Authorization: ApiKey ...`; otherwise URL-embedded credentials in `EVALUATIONS_KBN_URL` are used.

##### Golden cluster Kibana API key for dataset operations

The recommended approach is to run `node scripts/evals init config`, which creates a single unified API key covering both dataset operations and evaluation result export. See [Golden cluster API key privileges](#golden-cluster-api-key-privileges-required) for details.

In CI, these values are automatically sourced from the vault config field `evaluationsKbn`.

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

A single API key can cover **all** golden cluster operations: evaluation result export, trace storage, and dataset management. The key is created via the Kibana API (not the ES API) so it can bundle both Elasticsearch index privileges and Kibana feature privileges using `kibana_role_descriptors`.

When exporting to a “golden”/centralized Elasticsearch cluster via `EVALUATIONS_ES_URL` + `EVALUATIONS_ES_API_KEY`, `@kbn/evals` does **not** attempt to create/update templates or create the data stream. Instead it runs an export **preflight check** (sentinel write + best-effort cleanup) to fail fast when the cluster is misconfigured (missing data stream, incompatible mappings, missing write privileges, etc).

**Automatic setup (recommended):**

```bash
node scripts/evals init config
```

This interactive wizard opens your browser to the golden cluster Dev Tools, copies the API key creation payload to your clipboard, and walks you through pasting the result back. The single `encoded` key is applied to all four config fields (`evaluationsEs.apiKey`, `tracingEs.apiKey`, `evaluationsKbn.apiKey`, and the tracing exporter `Authorization` header).

**Manual setup:**

In the golden cluster Kibana Dev Tools, run `POST kbn:/internal/security/api_key` with the privilege payload defined in [`src/api_key/golden_cluster_privileges.json`](src/api_key/golden_cluster_privileges.json). The `init config` wizard builds this request automatically, filling your email from `git config user.email`.

For manual use, add a `"name"` (e.g. `"kbn-evals-<your-email>"`) and `"expiration"` (e.g. `"90d"`) alongside the `kibana_role_descriptors` and `metadata` from that JSON file.

This grants:

- **Evaluation results**: write/read `kibana-evaluations*` data stream (index privileges)
- **Tracing**: write/read `traces-*` indices (for OTLP trace ingest and trace-based evaluators)
- **Dataset storage**: write/read/delete `kibana-evaluation-dataset*` indices (backing storage for managed datasets)
- **Dataset API access**: Kibana `evals` feature privilege (`all`) for `/internal/evals/datasets/*` routes

Copy the returned `encoded` value and use it for all four secret fields in your vault config:

| Config field | Env variable | Value |
| --- | --- | --- |
| `evaluationsEs.apiKey` | `EVALUATIONS_ES_API_KEY` | `<encoded>` |
| `tracingEs.apiKey` | `TRACING_ES_API_KEY` | `<encoded>` |
| `evaluationsKbn.apiKey` | `EVALUATIONS_KBN_API_KEY` | `<encoded>` |
| `tracingExporters[0].http.headers.Authorization` | via `TRACING_EXPORTERS` | `ApiKey <encoded>` |

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
EVALUATION_CONNECTOR_ID=bedrock-claude node scripts/playwright test --config x-pack/solutions/observability/packages/kbn-evals-suite-obs-ai-assistant/playwright.config.ts
```

### Testing a specific connector

The helper will spin up one `local` project per available connector so results are isolated per model. Each project is named after the connector id. To run the evaluations only for a specific connector, use `--project`:

```bash
node scripts/playwright test --config x-pack/solutions/observability/packages/kbn-evals-suite-obs-ai-assistant/playwright.config.ts --project azure-gpt4o
```

### Skipping connector setup/teardown

By default, the eval runner creates and tears down connectors for each worker. If you are evaluating with pre-defined connectors (e.g. preconfigured in `kibana.yml`), you can skip this step:

```bash
KBN_EVALS_SKIP_CONNECTOR_SETUP=true node scripts/playwright test --config ...
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
