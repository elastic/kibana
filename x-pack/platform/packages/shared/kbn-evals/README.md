# @kbn/evals

Offline evaluation framework for LLM-based workflows in Kibana. Requires the `evals` plugin to be enabled.

**Entry points:**

- **Local** - `node scripts/evals start` (interactive CLI, see [CLI.md](./CLI.md) for the full command reference)
- **CI on PRs** - GitHub labels (`evals:<suite-id>`, `models:<model-group>`)
- **On-demand** - [Buildkite pipeline](https://buildkite.com/elastic/kibana-evals-on-demand)

---

## 1. Running evaluations

### 1.1 Getting started locally

```bash
node scripts/evals start
```

On first run, `start` prompts for an infrastructure target, discovers connectors, starts background services (EDOT collector + Scout), and runs a Playwright eval suite. Subsequent runs reuse the running services for fast iteration.

Suite selection is interactive. `start` lists registered suites from [`evals.suites.json`](../../../../../.buildkite/pipelines/evals/evals.suites.json). Pass `--suite <id>` to skip the prompt.

**Validate your setup with the smoke tests:**

```bash
node scripts/evals start --suite smoke-tests
```

#### Profiles

| `--profile` value | Behavior                                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------------------------- |
| `dev-vault`       | Read Golden Cluster config from Vault at runtime (requires `vault login --method oidc`). No file needed. |
| `local`           | Use `config.local.json` (auto-created with localhost defaults if missing).                               |
| `<name>`          | Use `config.<name>.json`. If missing, runs an interactive wizard.                                        |
| _(omitted)_       | Interactive prompt: local / golden-cluster / custom.                                                     |

Config files live in `scripts/vault/config.<profile>.json`. The golden cluster profile reads secrets directly from Vault -- no local file required.

#### Key flags

| Flag                | Description                                      |
| ------------------- | ------------------------------------------------ |
| `--suite <id>`      | Suite to run (interactive prompt if omitted)     |
| `--model <id>`      | Connector/model to evaluate (comma-separated OK) |
| `--judge <id>`      | Connector for LLM-as-a-judge evaluators          |
| `--grep <pattern>`  | Filter tests by name                             |
| `--repetitions <n>` | Repeat each example N times                      |
| `--skip-server`     | Skip EDOT/Scout startup (use existing services)  |
| `--skip-init`       | Skip config and connector setup                  |
| `--dry-run`         | Print configuration and exit                     |

#### EIS connector setup

`start` auto-detects missing connectors and walks you through EIS model discovery (Vault auth, model selection, connector generation). To run setup separately and discover connectors to use across terminals:

```bash
node scripts/evals init
```

#### Loading datasets from Golden Cluster

Use `--datasets-profile` when dataset credentials should come from the shared golden cluster:

```bash
node scripts/evals start --suite agent-builder --datasets-profile dev-vault
```

#### Filtering, model selection, judge, repetitions

```bash
node scripts/evals start --suite agent-builder --grep "product documentation"
node scripts/evals start --suite agent-builder --model eis-gpt-4.1 --judge eis-claude-4-5-sonnet
node scripts/evals start --suite agent-builder --model eis-gpt-4.1,eis-claude-4-sonnet
node scripts/evals start --suite agent-builder --repetitions 3
```

#### Advanced options

<details>
<summary>LiteLLM setup</summary>

If you have access to the internal LiteLLM gateway:

```bash
bash x-pack/platform/packages/shared/kbn-evals/scripts/litellm/dev_env.sh
```

This logs you in via SSO, generates a virtual key, and exports `KIBANA_TESTING_AI_CONNECTORS`.

</details>

<details>
<summary>Scout server (standalone)</summary>

`start` manages Scout automatically. To run it independently:

```bash
node scripts/evals scout
```

This wraps `node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet evals_tracing`.

</details>

<details>
<summary>EDOT collector (standalone)</summary>

`start` manages the EDOT collector automatically. To run it independently:

```bash
node scripts/edot_collector.js
# Override target ES cluster:
ELASTICSEARCH_HOST=http://localhost:9200 node scripts/edot_collector.js
```

</details>

<details>
<summary>Phoenix executor (backward compatibility)</summary>

The Phoenix-backed executor is maintained in [`@kbn/evals-phoenix-executor`](../kbn-evals-phoenix-executor/) for backward compatibility. That package is the source of truth for Phoenix integration.

To switch:

```bash
KBN_EVALS_EXECUTOR=phoenix node scripts/evals run --suite <id>
```

</details>

<details>
<summary>Running directly via Playwright</summary>

Only use this if the CLI doesn't cover your use case. Ensure Scout and EDOT are already running.

```bash
node scripts/playwright test --config x-pack/platform/packages/shared/<suite-dir>/playwright.config.ts
```

</details>

<details>
<summary>Skipping connector setup/teardown</summary>

If evaluating with pre-configured connectors (e.g. from `kibana.yml`):

```bash
KBN_EVALS_SKIP_CONNECTOR_SETUP=true node scripts/evals run --suite <id>
```

</details>

<details>
<summary>Running against your local/dev Kibana</summary>

We recommend using Scout (the default). If you must target your own Kibana instance, create `.scout/servers/local.json`:

```json
{
  "serverless": false,
  "isCloud": false,
  "hosts": { "kibana": "http://localhost:5601/<basePath>" },
  "auth": { "username": "elastic", "password": "changeme" }
}
```

You must also configure tracing in `kibana.dev.yml`:

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

> **Note:** Starting Scout overwrites `.scout/servers/local.json`, so you may need to recreate it when switching back.

</details>

---

### 1.2 Running evals on PRs (CI)

Add GitHub labels to trigger evals in PR CI:

| Label                         | Effect                                                            |
| ----------------------------- | ----------------------------------------------------------------- |
| `evals:<suite-id>`            | Run a specific suite                                              |
| `evals:all`                   | Run all suites                                                    |
| `models:<model-group>`        | Select model(s) to evaluate (required -- evals skip without this) |
| `models:judge:<connector-id>` | Override the judge connector                                      |
| `models:weekly-eis-models`    | Per-suite EIS model alias (resolves from `evals.suites.json`)     |

Model groups follow the pattern `eis/<modelId>` for EIS or `llm-gateway/<model>` for LiteLLM.

---

### 1.3 On-demand evals (Buildkite)

Run a suite on any branch without a PR:

1. Open [kibana-evals-on-demand](https://buildkite.com/elastic/kibana-evals-on-demand)
2. Click **New build**, select branch/commit
3. Add environment variables:

| Variable                  | Required           | Description                                                                 |
| ------------------------- | ------------------ | --------------------------------------------------------------------------- |
| `EVAL_SUITE_ID`           | yes                | Suite id from `evals.suites.json`                                           |
| `EVAL_MODEL_GROUPS`       | yes                | Comma-separated model groups, e.g. `eis/openai-gpt-5.4,llm-gateway/gpt-5.2` |
| `EVAL_INCLUDE_EIS_MODELS` | for `eis/*` models | Set to `1` when using EIS models or an EIS judge                            |
| `EVALUATION_CONNECTOR_ID` | no                 | LLM-as-judge connector override                                             |
| `EVAL_SERVER_CONFIG_SET`  | some suites        | From `serverConfigSet` in `evals.suites.json`                               |
| `KIBANA_BUILD_ID`         | no                 | Reuse a Kibana build from another job (skips build step)                    |
| `EVAL_GREP`               | no                 | Playwright test name filter (same as `node scripts/evals run --grep`)       |
| `EVALUATION_REPETITIONS`  | no                 | Repeat each example N times (same as `--repetitions`)                       |

Example:

```text
EVAL_SUITE_ID=agent-builder
EVAL_MODEL_GROUPS=eis/openai-gpt-5.4
EVAL_INCLUDE_EIS_MODELS=1
```

---

## 2. Creating a new evaluation suite

Each eval suite lives in its own `kbn-evals-suite-<name>` package. The package contains a Playwright config, evaluation specs, and optionally custom fixtures.

To scaffold a new suite, you can use the [`evals-create-suite`](../../../../../.agents/skills/evals-create-suite/SKILL.md) skill (available to AI coding agents) or follow its templates manually. Register suites in [`evals.suites.json`](../../../../../.buildkite/pipelines/evals/evals.suites.json) for CI labeling and `node scripts/evals list`.

### Playwright config

```ts
import { createPlaywrightEvalsConfig } from '@kbn/evals';

export default createPlaywrightEvalsConfig({ testDir: __dirname });
```

This auto-discovers connectors and creates one Playwright project per model so the same test file runs against each.

### Writing evaluation tests

```ts
import { evaluate } from '@kbn/evals';

evaluate('the model should answer truthfully', async ({ inferenceClient, executorClient }) => {
  const dataset = {
    name: 'my-dataset',
    description: 'my-description',
    examples: [{ input: { content: 'Hi' }, output: { content: 'Hey' } }],
  };

  await executorClient.runExperiment(
    {
      datasets: [dataset],
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
        evaluate: async ({ output, expected }) => ({
          score: output?.content === expected?.content ? 1 : 0,
          metadata: { output: output?.content, expected: expected?.content },
        }),
      },
    ]
  );
});
```

### Typing datasets

```ts
import type { Example } from '@kbn/evals';

type MyExample = Example<
  { question: string },
  { expectedAnswer: string },
  { tags?: string[] } | null
>;
```

Use `selectEvaluators<MyExample, MyTaskOutput>(...)` for typed evaluator callbacks.

### Available fixtures

| Fixture            | Description                                                                |
| ------------------ | -------------------------------------------------------------------------- |
| `inferenceClient`  | Bound to the connector declared by the active Playwright project.          |
| `executorClient`   | Runs experiments (in-Kibana executor by default).                          |
| `evalsClient`      | Client for evals plugin APIs (scores, datasets, experiment stats).         |
| `reportModelScore` | Displays results in terminal (overridable for custom reporting).           |
| `traceEsClient`    | ES client for querying OTel traces (defaults to Scout `esClient` cluster). |

### Available evaluators

Built-in evaluator factories you can use directly or as inspiration for custom evaluators:

- **LLM-as-a-judge** -- the most common evaluator type. Built-in judge evaluators include:
  - `Criteria` -- scores output against user-defined criteria (most commonly used)
  - `Correctness` -- checks factual accuracy against expected output
  - `Groundedness` -- verifies claims are supported by provided context
- **Trace-based** -- `createTraceBasedEvaluator` (token usage, latency, tool calls), `createSkillInvocationEvaluator` (checks agent skill reads)
- **RAG** -- `createRagEvaluators` (Precision@K, Recall@K, F1@K)
- **Code evaluators** -- any inline `{ name, kind: 'CODE', evaluate }` object

You can use these as-is or build your own directly in the suite.

#### LLM-as-a-judge

Set `--judge` to select which model judges results. Judge evaluators receive the judge connector automatically.

```bash
node scripts/evals start --suite agent-builder --judge eis-claude-4-5-sonnet
```

#### Selecting evaluators at runtime

Wrap evaluators with `selectEvaluators()` then control which run via environment variable:

```bash
SELECTED_EVALUATORS="Factuality,Relevance" node scripts/evals run --suite agent-builder
```

### Customizing report display

<<<<<<< HEAD
Override `reportModelScore` to create custom reports:
=======
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

### Weekly CI notifications

The [weekly LLM evals pipeline](https://buildkite.com/elastic/kibana-evals-weekly-llm-evals) uses **two Slack flows**:

| Flow                | Channel                               | Mechanism                                                                                                               | Content                                                                                                                                                             |
| ------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — build-level** | `#kbn-evals-notifications`            | `KIBANA_SLACK_NOTIFICATIONS_ENABLED` + metadata `slack:kbn_evals_weekly_failures:body`                                  | Rollup of per-suite summaries ([`weekly_build_slack_summary.sh`](../../../../../.buildkite/scripts/steps/evals/weekly_build_slack_summary.sh))                      |
| **B — per-suite**   | `slackChannel` in `evals.suites.json` | Buildkite `notify` after [`suite_owner_notify.sh`](../../../../../.buildkite/scripts/steps/evals/suite_owner_notify.sh) | Suite name, failing models, build link, plus an LLM triage summary from the **same** judge connector used for LLM-as-a-judge evaluators (`EVALUATION_CONNECTOR_ID`) |

**Metadata handoff (B → A):** failing fanout steps write `kbn-evals:suite-failures:{suite}:{project}` and `kbn-evals:suite-failure-log:{suite}:{project}` (log tail). The fanout parent records `kbn-evals:evaluation-connector-id:{suite}` with the effective judge for the build. `suite_owner_notify.sh` calls [`build_suite_owner_slack_message.js`](scripts/ci/build_suite_owner_slack_message.js), which collects failure context ([`collect_failure_context.js`](scripts/ci/collect_failure_context.js): metadata logs + `kibana-evaluations` scores for the Buildkite build), then asks the judge via [`summarize_failures_with_judge.js`](scripts/ci/summarize_failures_with_judge.js) using the same connector resolution as evals (`EVALUATION_CONNECTOR_ID` env → build metadata → vault `evaluationConnectorId`, including PR `models:judge:*` overrides). Stores the combined body in `kbn-evals:triage:{suite}` and posts to the suite channel. Flow A embeds those triage bodies in the weekly rollup.

### On-demand evals (Buildkite)

Run a single suite and model on any branch without opening a PR or waiting for the full Kibana PR pipeline:

1. Open [kibana-evals-on-demand](https://buildkite.com/elastic/kibana-evals-on-demand) on Buildkite
2. Click **New build**, select the branch (or commit) to evaluate
3. Under **Environment variables** (in New build options), add the required variables below — one `KEY=value` per line. These are build-level env vars read by `run_suite.sh`.

Pipeline registration: [`.buildkite/pipeline-resource-definitions/evals/kibana-evals-on-demand.yml`](../../../../../.buildkite/pipeline-resource-definitions/evals/kibana-evals-on-demand.yml).

| Variable                  | Required           | Description                                                                                             |
| ------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------- |
| `EVAL_SUITE_ID`           | yes                | Suite id from `evals.suites.json`, e.g. `agent-builder`                                                 |
| `EVAL_MODEL_GROUPS`       | yes                | Model group, e.g. `eis/openai-gpt-5.4`                                                                  |
| `EVAL_INCLUDE_EIS_MODELS` | for `eis/*` models | Set to `1` when `EVAL_MODEL_GROUPS` uses `eis/...`                                                      |
| `EVALUATION_CONNECTOR_ID` | no                 | LLM-as-judge connector id override (connector id, not `eis/...` model group)                            |
| `EVAL_SERVER_CONFIG_SET`  | some suites        | From `serverConfigSet` on the suite entry in `evals.suites.json` (e.g. `evals_endpoint` for `endpoint`) |
| `KIBANA_BUILD_ID`         | no                 | Reuse a Kibana build from another Buildkite job (skips the build step)                                  |

The eval pipeline step sets `FTR_EIS_CCM=1` and `EVAL_FANOUT=1`; `KBN_EVALS=1` is set on the pipeline.

Example environment variables for Agent Builder + one EIS model:

```text
EVAL_SUITE_ID=observability-ai
EVAL_MODEL_GROUPS=eis/openai-gpt-5.4
EVAL_INCLUDE_EIS_MODELS=1
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

Note: The **Dataplex "Aspect types"** console page lists _schemas_. Snapshot datasets themselves show up under Dataplex **Entries**.

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
>>>>>>> 4f146bce553f (Unify Slack triage judge with eval LLM-as-a-judge)

```ts
import { evaluate as base, type EvalsClient } from '@kbn/evals';

export const evaluate = base.extend({
  reportModelScore: async ({}, use) => {
    await use(async (evalsClient: EvalsClient, experimentId, log) => {
      const experimentStats = await evalsClient.getExperimentStats(experimentId);
      log.info(`Model: ${experimentStats.taskModel.id}`);
      // Custom formatting, file output, etc.
    });
  },
});
```

Score ingestion happens before custom reporting and is not affected by it.

---

## 3. Seeding datasets into your environment

Use [`@kbn/es-snapshot-loader`](../kbn-es-snapshot-loader/) to restore snapshots and replay data streams within your eval suite. See that package's README for full API docs.

- **`restoreSnapshot`** -- restore indices directly from a GCS/URL/FS snapshot
- **`replaySnapshot`** -- restore with timestamp transformation, making historical data streams appear fresh

Typical usage in a suite (from [`kbn-evals-suite-observability-ai`](../../../../solutions/observability/packages/kbn-evals-suite-observability-ai)):

```ts
import { createGcsRepository, replaySnapshot } from '@kbn/es-snapshot-loader';

const result = await replaySnapshot({
  esClient,
  log,
  repository: createGcsRepository({ bucket: 'my-bucket', basePath: 'my-path' }),
  snapshotName: 'my-snapshot',
  patterns: ['logs-*', 'metrics-*', 'traces-*'],
});
```

Set `GCS_CREDENTIALS` (full JSON service account string) before starting Scout so Elasticsearch can access GCS repositories.

### Dataplex (optional)

Register snapshot datasets in Dataplex for discoverability. Aspects YAML files live in `snapshots/dataplex/<team>/`.

```bash
node scripts/evals dataplex sync            # Create/update entries from YAML
node scripts/evals dataplex sync --dry-run   # Preview changes
```

---

## 4. Developer details

### Automated label sync

`models:*` and `models:judge:*` labels are synced automatically:

- **Weekly** -- the weekly LLM evals pipeline includes a label sync step
- **On demand** -- add `ci:sync-model-labels` label to any PR

Stale labels are renamed to `deprecated:models:*` (kept for historical record).

### CI ops

Update all model + judge labels:

```bash
./scripts/create_models_labels.sh --repo elastic/kibana --update-all-labels
./scripts/create_models_labels.sh --repo elastic/kibana --update-all-labels --prune  # also deprecate stale
```

Update Vault config:

```bash
# Edit scripts/vault/config.json, then generate a vault write command:
node scripts/vault/get_command.js --vault ci-prod
# Sync from Vault:
node scripts/vault/retrieve_secrets.js --vault ci-prod
```

### CI telemetry

EIS inference requests are tagged with `X-Elastic-Product-Use-Case: kbn_evals`. Override via `KBN_EVALS_TELEMETRY_PLUGIN_ID`.

### Golden cluster privileges

A single API key covers all golden cluster operations (scores, traces, datasets). Create via Kibana Dev Tools using the privilege payload exported from [`@kbn/evals-common`](../kbn-evals-common/golden_cluster_privileges.ts).

Grants:

- Write/read `.evaluation-scores*` (results)
- Write/read `traces-*` (OTLP traces)
- Write/read/delete `.evaluation-dataset*` (managed datasets)
- Kibana `evals` feature privilege (`all`)

With `--profile dev-vault`, these keys are read from Vault automatically.
