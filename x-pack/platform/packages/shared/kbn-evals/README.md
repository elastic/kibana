# @kbn/evals

Offline evaluation framework for LLM-based workflows in Kibana. Requires the `evals` plugin to be enabled.

**Entry points:**

- **Local** - `node scripts/evals start` (interactive CLI, see [CLI.md](./CLI.md) for the full command reference)
- **CI on PRs** - GitHub labels (`evals:<suite-id>`, `models:<model-group>`)
- **On-demand** - [Buildkite pipeline](https://buildkite.com/elastic/kibana-evals-on-demand-llm-evals)
- **UI** - the "New experiment" form on the Experiments tab runs experiments server-side via Kibana Workflows, no CLI required (see [From the UI](../../../plugins/shared/evals/README.md#from-the-ui))
- **Agent Builder** - the `eval-experiment-authoring` skill composes, previews, saves, and runs experiments from a chat (see [From Agent Builder](../../../plugins/shared/evals/README.md#from-agent-builder))
- **Workflow YAML** - a version-controlled experiment workflow file, run via Workflows Management (see [From YAML](../../../plugins/shared/evals/README.md#from-yaml))

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

| Flag                | Description                                                            |
| ------------------- | ---------------------------------------------------------------------- |
| `--suite <id>`      | Suite to run (interactive prompt if omitted)                           |
| `--model <id>`      | Connector/model to evaluate (comma-separated OK)                       |
| `--judge <id>`      | Connector for LLM-as-a-judge evaluators                                |
| `--grep <pattern>`  | Filter tests by name                                                   |
| `--repetitions <n>` | Repeat each example N times                                            |
| `--concurrency <n>` | Examples each experiment runs at once (default 5)                      |
| `--space-ids <ids>` | Spaces to assign datasets and scores to (the run works from the first) |
| `--skip-server`     | Skip EDOT/Scout startup (use existing services)                        |
| `--skip-init`       | Skip config and connector setup                                        |
| `--dry-run`         | Print configuration and exit                                           |

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

#### Filtering, model selection, judge, repetitions, concurrency

```bash
node scripts/evals start --suite agent-builder --grep "product documentation"
node scripts/evals start --suite agent-builder --model eis-gpt-4.1 --judge eis-claude-4-5-sonnet
node scripts/evals start --suite agent-builder --model eis-gpt-4.1,eis-claude-4-sonnet
node scripts/evals start --suite agent-builder --repetitions 3
node scripts/evals start --suite agent-builder --concurrency 8
```

`--concurrency` (or `EVAL_CONCURRENCY`) sets how many examples each experiment runs at once. It falls back to the `concurrency` passed to `createPlaywrightEvalsConfig`, then 5. A spec that passes its own `concurrency` to `runExperiment` still wins, and the run logs a warning when that overrides the value you asked for. Server-side limits such as Task Manager capacity stay with the suite's Scout config set.

> **Rate limits:** Concurrent LLM calls are roughly workers × concurrency. Connectors such as EIS and OpenRouter enforce requests-per-minute limits, so a high `--concurrency` can cause 429 (rate limit) errors. If they occur, reduce `--concurrency` or set `KBN_EVALS_HTTP_RETRIES` to retry `fetch` requests (off by default).

#### Advanced options

<details>
<summary>OpenRouter setup</summary>

If you have an OpenRouter API key (from vault config or `OPENROUTER_API_KEY`):

```bash
bash x-pack/platform/packages/shared/kbn-evals/scripts/openrouter/dev_env.sh
```

This generates connectors from the OpenRouter catalog and prints `export` lines for `OPENROUTER_BASE_URL`, `OPENROUTER_API_KEY`, and `KIBANA_TESTING_INFERENCE_ENDPOINTS`.

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
| `evals:skip-<suite-id>`       | Skip a suite, e.g. `evals:skip-smoke-tests`                       |

Model groups follow the pattern `eis/<modelId>` for EIS or `openrouter/<provider>-<model>` for OpenRouter.

A suite whose results are only comparable under one fixed judge (e.g. one scored against a pinned baseline) can set `defaultJudge` to a judge connector id in its `evals.suites.json` entry:

```json
"defaultJudge": "eis-abc-1"
```

The judge is resolved in this order: `models:judge:` label (locally `--evaluation-connector-id`, then `EVAL_CONNECTOR_ID`), then the suite's `defaultJudge`, then the Vault `evaluationConnectorId`.

`defaultJudge` applies to PR (label-triggered) runs and the local CLI. Weekly and on-demand runs go straight to `run_suite.sh`, where the Vault default is already exported, so they use `EVAL_CONNECTOR_ID` or the Vault default and ignore the `defaultJudge`.

PRs touching the eval framework get `evals:smoke-tests` automatically
([`.github/paths-labeller.yml`](../../../../../.github/paths-labeller.yml)). Add
`evals:skip-smoke-tests` to skip it.

When the labels match, PR CI triggers the dedicated
[`kibana-evals-pr-llm-evals`](https://buildkite.com/elastic/kibana-evals-pr-llm-evals) pipeline. Results
surface on the PR as a separate `kibana-evals` commit status — open its build for per-suite/per-model
results and triage.

Every run logs a link to its experiments in the evals UI
(`/app/management/ai/evals/experiments/<experiment-id>?execution_id=<execution-id>`) after the
score table. The link points at the Kibana that received the scores: `EVAL_KBN_URL` when set
(by CI, `--evaluations-kbn-url`, or the datasets profile's `evaluationsKbn.url`; `dev-vault` and a
synced `config.json` point it at the golden cluster), otherwise the Kibana Scout ran against. On Buildkite (PR, weekly and on-demand builds) the same
links are added to a `kbn-evals-experiments-<suite>` build annotation, one row per model and
shard, so they show at the top of the build. Logged URLs never include credentials.

#### Per-spec model groups

The weekly run normally runs every model in a suite against every spec. To run a spec against
fewer models, list it under `specModelGroups` in
[`evals.suites.json`](../../../../../.buildkite/pipelines/evals/evals.suites.json):

```jsonc
{
  "id": "significant-events",
  "weeklyEisModelGroups": ["eis/openai-gpt-5.4", "eis/anthropic-claude-4.6-opus", "eis/openai-gpt-5.4-mini"],
  "specModelGroups": [
    { "files": ["evals/discovery/discovery.spec.ts"], "models": ["eis/openai-gpt-5.4"] },
    { "files": ["evals/ki_feature_extraction/ki_feature_extraction.spec.ts"], "models": ["eis/openai-gpt-5.4-mini"] }
  ]
}
```

- `files` are paths relative to the suite's config directory.
- A spec without an entry (or without `models`) runs against the whole `weeklyEisModelGroups` list.
- Every model in `specModelGroups` must be in `weeklyEisModelGroups`, and every model there must
  be in the weekly step's `EVAL_MODEL_GROUPS` in `llm_evals.yml`. Both are checked in PR CI. The
  weekly run requests `EVAL_MODEL_GROUPS`; EIS provisions every model it discovers.
- `shards` are unrelated. They decide which specs share a CI step, not which models run. A shard
  can also set `judge` to an evaluation connector id (for example `"judge": "eis-openai-gpt-5-4"`)
  to pin the judge for its steps only; shards without one keep the suite-wide judge.
- Only the weekly run (`KBN_EVALS_WEEKLY=1`) applies this. PR and on-demand runs still run every
  model against every spec.

`spec_model_groups.test.js` fails PR CI if an entry points at a missing file, lists a file twice,
names a model outside the weekly list, or leaves a spec on disk unlisted.

**Preview the fanout locally.** `get_fanout_matrix.js` prints one `{ connectorId, shardId,
specFiles, judge? }` line per CI step. It needs an endpoint for every weekly model, so fake them from the
suite config. Drop `KBN_EVALS_WEEKLY=1` to see the PR / on-demand fanout.

```bash
CI=x-pack/platform/packages/shared/kbn-evals/scripts/ci
export EVAL_SUITE_INFO="$(node $CI/get_suite_info.js nightshift-investigations)"
export EVAL_MODEL_GROUPS="$(jq -r '.weeklyEisModelGroups | join(",")' <<<"$EVAL_SUITE_INFO")"
export KIBANA_TESTING_INFERENCE_ENDPOINTS="$(jq -c '[.weeklyEisModelGroups[] | ltrimstr("eis/")]
  | map({ key: ("eis-" + gsub("[^a-zA-Z0-9]+"; "-")), value: { provider: "elastic", providerConfig: { model_id: . } } })
  | from_entries' <<<"$EVAL_SUITE_INFO")"
KBN_EVALS_WEEKLY=1 node $CI/get_fanout_matrix.js
```

**Run it on real agents.** Start an [on-demand build](#13-on-demand-evals-buildkite) with
`KBN_EVALS_WEEKLY=1` in the build environment. `KBN_EVALS_WEEKLY` also makes the notify step post
to the suite's team Slack channel, so build from a branch name in `elastic/kibana` (not
`refs/pull/<N>/head`) and leave `EVAL_SLACK_NOTIFICATION_CHANNEL` unset. Then no notify step is
created.

---

### 1.3 On-demand evals (Buildkite)

Run a suite on any branch without a PR:

1. Open [kibana-evals-on-demand-llm-evals](https://buildkite.com/elastic/kibana-evals-on-demand-llm-evals)
2. Click **New build**, select branch/commit
3. Add environment variables:

| Variable                          | Required           | Description                                                                                                  |
| --------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------ |
| `EVAL_SUITE_ID`                   | yes                | Suite id from `evals.suites.json`. Comma-separate to run several suites                                      |
| `EVAL_MODEL_GROUPS`               | yes                | Comma-separated model groups, e.g. `eis/openai-gpt-5.4,openrouter/openai-gpt-5.4`                            |
| `EVAL_INCLUDE_EIS_MODELS`         | for `eis/*` models | Set to `1` when using EIS models or an EIS judge                                                             |
| `EVAL_CONNECTOR_ID`               | no                 | LLM-as-judge connector override                                                                              |
| `EVAL_SERVER_CONFIG_SET`          | some suites        | From `serverConfigSet` in `evals.suites.json`                                                                |
| `EVAL_SCOUT_ARCH` / `EVAL_SCOUT_DOMAIN` | some suites  | From `scoutArch` / `scoutDomain` in `evals.suites.json` (default `stateful` / `classic`)                     |
| `KIBANA_BUILD_ID`                 | no                 | Reuse a Kibana build from another job (skips build step)                                                     |
| `EVAL_GREP`                       | no                 | Playwright test name filter (same as `node scripts/evals run --grep`)                                        |
| `EVAL_REPETITIONS`                | no                 | Repeat each example N times (same as `--repetitions`)                                                        |
| `EVAL_CONCURRENCY`                | no                 | Examples each experiment runs at once (same as `--concurrency`)                                              |
| `EVAL_SPACE_IDS`                  | no                 | Comma-separated spaces to assign datasets and scores to (same as `--space-ids`)                              |
| `EVAL_SLACK_NOTIFICATION_CHANNEL` | no                 | Slack channel or member ID to send the triage to. If unset, no Slack notification is sent for on-demand runs |

Example (single suite):

```text
EVAL_SUITE_ID=agent-builder
EVAL_MODEL_GROUPS=eis/openai-gpt-5.4
EVAL_INCLUDE_EIS_MODELS=1
```

Example (multiple suites):

```text
EVAL_SUITE_ID=agent-builder,observability-ai,streams
EVAL_MODEL_GROUPS=eis/openai-gpt-5.4
EVAL_INCLUDE_EIS_MODELS=1
```

#### Where the triage summary is sent (on-demand)

On-demand triage routing is "branch OR PR" (never both), plus an independent Slack opt-in:

- Run a **branch**: set the New Build **Branch** to branch (e.g. `main`). No PR comment is posted.
- Run a **PR**: set the New Build **Branch** to `refs/pull/<N>/head` (e.g. `refs/pull/123/head`), Commit `HEAD`.
- **Slack** is independent: set `EVAL_SLACK_NOTIFICATION_CHANNEL` to send the triage to a Slack channel.

Example (PR run + Slack)
Set Branch to `refs/pull/<N>/head`, Commit `HEAD`, then under Options -> Environment Variables:

```text
EVAL_SUITE_ID=observability-ai
EVAL_MODEL_GROUPS=eis/openai-gpt-5.4
EVAL_INCLUDE_EIS_MODELS=1
EVAL_SLACK_NOTIFICATION_CHANNEL=#my-test-channel
```

### 1.4 Comparing experiments and gating on regressions

`node scripts/evals compare <target> <baseline>` (or `<target> --baseline-branch main --suite <suite-id>`) pairs the scores of two experiments and runs one paired test per dataset and evaluator: McNemar for pass/fail scores, Wilcoxon signed-rank otherwise, and a paired t-test for continuous scores once there are enough pairs. Each evaluator's direction (higher-is-better, lower-is-better or neutral) decides whether a change counts as an improvement or a regression.

With `--fail-on-regression`, pairs are formed per example. When a suite runs with `repetitions > 1`, each example's scores are first averaged across its repetitions, because repetitions of one example are not independent samples: 5 examples × 3 repetitions are 5 pairs, not 15. Both runs average the same number of repetitions per example (the ones both have, lowest index first), so a 3-repetition run compared against a 1-repetition baseline is not read as a shift; a warning lists how many examples were trimmed. `N` in the report and `--min-pairs` then count examples.

Averaging changes which test a row gets. A pass/fail evaluator with repetitions becomes a pass fraction per example (0, 1/3, 2/3, 1), so the gated run tests it with Wilcoxon on those fractions, while the un-gated report runs McNemar on the per-repetition pairs. The two can disagree on the p-value. Wilcoxon rows in the gated run are re-tested on differences rounded to 1e-9, so differences that are equal on paper (`1 - 2/3` and `1/3`) get tied ranks instead of being split by floating-point roundoff.

Without `--fail-on-regression`, pairs are formed per repetition, as in the evals UI and its compare API, so the report matches what the UI shows.

**Multiplicity correction (default under the gate).** A comparison tests many evaluators at once, so at α = 0.05 a few false "significant" flags are expected by chance. With `--fail-on-regression` (or `--multiplicity-correction`) the p-values of all comparisons in the run (every dataset × evaluator with a p-value) are adjusted with the Holm-Bonferroni step-down procedure. Without the gate, reports use raw p-values by default, so they agree with the evals UI and compare route, which do not adjust yet. Reports show both the raw `p-value` and the `Adj. p-value`; the `Sig` / `Significant` column, the outcome and the regression gate use the adjusted value. The family is always every comparison in the run: `--regression-evaluators` and `--min-pairs` narrow what the gate can trip on, not the number of hypotheses the adjustment accounts for, so the gate and the report judge the same adjusted p-values. Pass `--no-multiplicity-correction` to judge the gate on raw p-values too (the adjusted column is then omitted).

**Regression gate.** `compare` never fails on its own. Add `--fail-on-regression` to make it exit non-zero when any gated evaluator shows a statistically significant change in the worse direction:

| Flag                           | Description                                                                                                                                                                                  |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--fail-on-regression`         | Exit with a failure if an evaluator is significantly worse (adjusted p < 0.05, unless `--no-multiplicity-correction`). Improvements, non-significant drops and neutral evaluators never trip. |
| `--regression-evaluators a,b`  | Comma-separated evaluator names that can trip the gate (default: all). Names absent from the comparison log a warning; if none match, the run fails rather than pass vacuously. Requires `--fail-on-regression`. |
| `--min-pairs <n>`              | Minimum paired examples for an evaluator to be gated (default: 10). Evaluators below it are listed as `insufficient pairs`, can't trip the gate, and are called out in a warning: they were not checked. Requires `--fail-on-regression`. |
| `--multiplicity-correction`    | Holm-Bonferroni adjust p-values. On by default with `--fail-on-regression`; pass it to get adjusted values in a report without the gate.                                                     |
| `--no-multiplicity-correction` | Use raw p-values, also under `--fail-on-regression`.                                                                                                                                         |

Exit codes (with `--fail-on-regression`):

- **0, passed**: at least one evaluator comparison was actually checked and none got significantly worse. The `Regression gate passed` line says how many were checked out of how many were in scope (`N of M evaluator comparison(s) checked`). Any `insufficient pairs`, `no usable p-value`, `underpowered` or direction-conflict warning means those evaluators were not checked, not that they passed.
- **1, usage or unexpected error**: bad flags (including `--min-pairs` or `--regression-evaluators` without `--fail-on-regression`), Kibana unreachable, the evals plugin disabled, a failed request while looking up the baseline or reading scores (a server error, a timeout, a suite larger than the score read limit), and similar. Never a regression verdict, and never mistaken for "no baseline" or "no scores".
- **2, inconclusive or not evaluated**: the gate could not rule regressions in or out, so it fails instead of passing silently. This happens when no baseline is found on `--baseline-branch`, when there are no scores, no overlapping datasets or no paired scores to compare, when the comparison returns no results, when `--regression-evaluators` matches no evaluator, and when nothing was checkable (every row has too few pairs, no usable p-value or is underpowered, or only neutral evaluators are in scope).
- **3, significant regression**: `Regression gate tripped`, listing each regressed dataset / evaluator with delta, raw (and adjusted) p-value, the test used and the number of pairs.

The direction of a change is the one the row's test measured: the mean difference for the paired t-test, the discordant pairs for McNemar (which follow the mean for pass/fail scores), and the signed-rank sum for Wilcoxon. Wilcoxon is rank-based, so a few large drops can lower the mean while most pairs improve, or the reverse. Such a row shows `Mixed` in the markdown Outcome column (and a yellow `(mixed)` diff in the terminal report), cannot trip the gate, is not counted as checked and is listed in a warning to inspect by hand.

Rank and count tests have a smallest possible p-value that depends only on the number of pairs: with 10 pairs, 2/2^10 for Wilcoxon and 1/2^10 for McNemar. After the Holm adjustment over a large run, that floor can sit above 0.05, so the row could not be significant even if every pair got worse. The gate reports such non-significant rows as `underpowered` (with the best p-value they could have reached), does not count them as checked, and is inconclusive when nothing else was checkable. Add examples, or narrow the run, to make them checkable.

With `--fail-on-regression`, a significant regression the gate cannot trip on (fewer than `--min-pairs` pairs, or outside `--regression-evaluators`) shows `Regression (not gated)` in the markdown Outcome column.

Without `--fail-on-regression`, `compare` keeps its old behavior: a failed lookup or score read is logged and treated as empty, a missing baseline or empty comparison logs a warning and exits 0, and missing scores, datasets or pairs remain plain errors (exit 1).

Things to know before wiring the gate into CI:

- **Handle exit 2 and exit 3 separately.** Exit 3 is a regression verdict; exit 2 means nothing was proven either way (often a missing baseline or a too-small dataset). Treating both as "regressed", or both as "ignore", loses that distinction.
- **The baseline is the latest run on `--baseline-branch`.** Anything that changed on that branch since (a model update, a dataset edit, another merged change) is attributed to the run under test.
- **The default scope is every evaluator, including trace-based lower-is-better ones** such as latency and token counts, which vary with infrastructure load. For a CI gate, pass `--regression-evaluators` with the quality evaluators that should block a merge.
- **"passed" can rest on one checked comparison.** The `Regression gate passed` line reports how many comparisons were checked out of how many were in scope; read it before trusting a pass on a small suite.

The gate decision is a pure function (`evaluateRegressionGate` in `src/utils/reporting/regression_gate.ts`); the Holm adjustment is in `holm_correction.ts`.

---

## 2. Creating a new evaluation suite

Each eval suite lives in its own `kbn-evals-suite-<name>` package. The package contains a Playwright config, evaluation specs, and optionally custom fixtures.

To scaffold a new suite, you can use the [`evals-create-suite`](../../../../../.agents/skills/evals-create-suite/SKILL.md) skill (available to AI coding agents) or follow its templates manually. Register suites in [`evals.suites.json`](../../../../../.buildkite/pipelines/evals/evals.suites.json) for CI labeling and `node scripts/evals list`.

### Suite-owned secrets (`scoutHook`)

A suite whose Scout server needs secrets from the evals config can map them into env with a hook in its own package, rather than teaching the shared evals tooling about them. Point `scoutHook` in its `evals.suites.json` entry at a repo-relative bash script:

```json
{
  "id": "my-suite",
  "configPath": "x-pack/.../kbn-evals-suite-my-suite/playwright.config.ts",
  "serverConfigSet": "evals_my_suite",
  "scoutHook": "x-pack/.../kbn-evals-suite-my-suite/scout/scout_hook.sh",
  "vaultSecret": "my-suite"
}
```

The hook reads a config JSON on stdin and prints `{ "env"?: Record<string, string> }`. `node scripts/evals start`/`run` and `run_suite.sh` export that env to Scout and the Playwright run, so the suite's server config set can read it. Kibana also resolves `${VAR}` references in YAML config files from its environment, so a config set can pass a suite-owned YAML file with `--config` and keep secrets out of files and process arguments. Scout restarts when the hook output changes. See [the Nightshift investigations hook](../../../../solutions/observability/packages/kbn-evals-suite-nightshift-investigations/scout/scout_hook.sh) for an example.

Give the suite its own Vault secret with `vaultSecret`, so rotating its credentials never rewrites the general config other suites read. The hook then reads that secret instead of the general config:

| Where                        | Hook input                                                                                    |
| ---------------------------- | --------------------------------------------------------------------------------------------- |
| CI (`run_suite.sh`)          | `kv/ci-shared/kbn-evals/<vaultSecret>` in the ci-prod Vault                                   |
| `--profile dev-vault`        | `secret/kibana-issues/dev/kbn-evals/<vaultSecret>` in the dev Vault                           |
| `--profile <file profile>`   | `config.<profile>.json`, which holds the suite's blocks next to the general keys              |
| No `vaultSecret` (any place) | The general config (`--profile` config locally, `KBN_EVALS_CONFIG_B64` in CI)                 |

CI forwards the initial hook input as `KBN_EVALS_SCOUT_HOOK_CONFIG_B64`. The native `evals run`
command reuses it when no datasets profile is selected, so both hook invocations see the same
suite secret without another Vault read. Explicit profiles retain their own configuration.

Manage the secret with the Vault scripts' `--suite` flag, which keeps the local copy in a gitignored `vault/config.json` next to the suite's `playwright.config.ts` (copy `vault/config.example.json` to start):

```bash
node scripts/vault/retrieve_secrets.js --vault ci-prod --suite my-suite
node scripts/vault/upload_secrets.js --vault ci-prod --suite my-suite
```

### Serverless suites (`scoutArch` / `scoutDomain`)

Suites run on a stateful/classic Scout cluster unless their `evals.suites.json` entry says otherwise:

```json
{
  "id": "my-suite",
  "serverConfigSet": "evals_my_suite",
  "scoutArch": "serverless",
  "scoutDomain": "observability_complete"
}
```

Scout then starts with that arch and domain, locally and in CI, so the config set needs a matching `serverless/observability_complete.serverless.config.ts` (start from the serverless `evals_tracing` config). Serverless Elasticsearch runs in Docker, and GCS snapshot restores work as on stateful.

To run a suite on a different arch or domain locally, pass `--scout-arch` / `--scout-domain` to `node scripts/evals start`, for example `--scout-arch stateful`. Switching restarts Scout.

### Playwright config

```ts
import { createPlaywrightEvalsConfig } from '@kbn/evals';

export default createPlaywrightEvalsConfig({ testDir: __dirname });
```

This auto-discovers connectors and creates one Playwright project per model so the same test file runs against each.

#### `workers` — parallelising spec files

By default Playwright runs all spec files in the suite serially (`workers: 1`). If your spec files are independent you can run several in parallel:

```ts
export default createPlaywrightEvalsConfig({
  testDir: __dirname,
  workers: 3, // run up to 3 spec files simultaneously
});
```

Allowed values are `1` (default), `2`, or `3`.

**Before raising `workers`, verify that every spec file in the suite is isolation-safe:**

hints:

1. **Do two specs write to the same named index / data stream / saved-object namespace?** If yes, their cleanup windows can overlap and corrupt each other's data.
2. **Do any tests assert hard-coded expected values that depend on the index being empty of other fixtures?** If yes, a concurrently seeding spec will invalidate those assertions.
3. **Is `beforeAll` cleanup scoped to this run's resources only?** Cleanup via document IDs returned from the current `beforeAll` is safe; `deleteByQuery` on a shared alias without a run-specific filter is not.

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
        direction: 'maximize',
        evaluate: async ({ output, expected }) => ({
          score: output?.content === expected?.content ? 1 : 0,
          metadata: { output: output?.content, expected: expected?.content },
        }),
      },
    ]
  );
});
```

`direction` sets the optimization goal for this evaluator's score:

| Value      | When to use                          |
| ---------- | ------------------------------------ |
| `maximize` | Higher is better (quality, accuracy) |
| `minimize` | Lower is better (latency)            |
| `neutral`  | No clear better direction            |

### Tagging datasets

Datasets can declare `tags` and a `maturity` level, which the dataset list in Kibana filters on. Declaring them alongside the examples keeps them current on every run:

```ts
const dataset = {
  name: 'my-dataset',
  description: 'my-description',
  tags: ['agent-builder', 'esql'],
  maturity: 'golden', // 'raw' | 'cleaned' | 'golden'
  examples: [{ input: { content: 'Hi' }, output: { content: 'Hey' } }],
};
```

Tags are lowercased and deduplicated when stored, so `ESQL` and `esql` are the same tag. Each tag must start with a letter or number and may otherwise contain letters, numbers and `: . _ -`; a tag with a space or comma in it fails the upsert with a 400, so keep them slug-like (`team:obs-ai`, `esql`). Leaving either field out preserves what the dataset already has, so a suite that doesn't declare them will not wipe tags curated in the UI.

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
- **IR (information retrieval)** -- `createIrEvaluators` (Precision@K, Recall@K, F1@K, HitRate@K, MRR@K, NDCG@K, MAP@K)
- **Code evaluators** -- any inline `{ name, kind: 'CODE', direction, evaluate }` object

You can use these as-is or build your own directly in the suite.

#### LLM-as-a-judge

Judge evaluators receive the judge connector automatically. Without `--judge`, the [default judge](#default-judge) is used; set `--judge` to pick another model.

```bash
node scripts/evals start --suite agent-builder --judge eis-claude-4-5-sonnet
```

#### Default judge

Without `--judge` / `EVAL_CONNECTOR_ID`, the judge comes from `evaluationConnectorId` in the profile config (`dev-vault`, or a `config.<profile>.json` synced from Vault). Profiles without it, such as `local`, still prompt (or fail without a TTY).

#### Selecting evaluators at runtime

Wrap evaluators with `selectEvaluators()` then control which run via environment variable:

```bash
SELECTED_EVALUATORS="Factuality,Relevance" node scripts/evals run --suite agent-builder
```

### Customizing report display

Override `reportModelScore` to create custom reports:

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

### Connector definitions and inference endpoints

Model definitions come from two sources:

1. `KIBANA_TESTING_INFERENCE_ENDPOINTS` — **inference endpoint definitions** (base64-encoded or raw JSON, set by CI or exported by `node scripts/evals init`).
2. `KIBANA_TESTING_AI_CONNECTORS` or, locally, `xpack.actions.preconfigured` in `config/kibana.dev.yml` — **stack connector definitions** (Actions saved objects, e.g. the workflow suites' mock Slack/email connectors).

`KIBANA_TESTING_INFERENCE_ENDPOINTS` example (decoded):

```json
{
  "eis-anthropic-claude-sonnet-4-6": {
    "name": "EIS anthropic-claude-sonnet-4-6",
    "inferenceId": ".anthropic-claude-sonnet-4-6-chat_completion",
    "provider": "elastic",
    "taskType": "chat_completion",
    "providerConfig": { "model_id": "anthropic-claude-sonnet-4-6" }
  },
  "openrouter-openai-gpt-4o": {
    "name": "OpenRouter openai/gpt-4o",
    "inferenceId": "openrouter-openai-gpt-4o",
    "provider": "openai",
    "taskType": "chat_completion",
    "providerConfig": {
      "model_id": "openai/gpt-4o",
      "url": "https://openrouter.ai/api/v1/chat/completions"
    },
    "secrets": { "providerSecrets": { "api_key": "<api key>" } }
  }
}
```

#### Migrating `.gen-ai` definitions

**deprecated `.gen-ai` stack connector**, `.gen-ai` definitions are no longer recognized as LLM definitions.

Preferred replacement: an inference endpoint definition in `KIBANA_TESTING_INFERENCE_ENDPOINTS` (see the `openrouter-openai-gpt-4o` entry above). If you would rather keep the model in `kibana.dev.yml`, use a preconfigured `.inference` stack connector, Kibana creates the underlying endpoint at startup and evals reuses the preconfigured connector:

```yaml
# Before
xpack.actions.preconfigured:
  my-gpt:
    name: My GPT
    actionTypeId: .gen-ai
    config:
      apiUrl: https://openrouter.ai/api/v1/chat/completions
      defaultModel: openai/gpt-4o
    secrets:
      apiKey: '<api key>'

# After
xpack.actions.preconfigured:
  openrouter-openai-gpt-4o:
    name: OpenRouter openai/gpt-4o
    actionTypeId: .inference
    config:
      provider: openai
      taskType: chat_completion
      inferenceId: openrouter-openai-gpt-4o
      providerConfig:
        model_id: openai/gpt-4o
        url: https://openrouter.ai/api/v1/chat/completions
    secrets:
      providerSecrets:
        api_key: '<api key>'
```

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

| `--vault` | Path                                        | Read by                 |
| --------- | ------------------------------------------- | ----------------------- |
| `ci-prod` | `kv/ci-shared/kbn-evals/golden` (KV v2)     | CI (`setup_job_env.sh`) |
| `dev`     | `secret/kibana-issues/dev/kbn-evals/golden` | `--profile dev-vault`   |

Log in to the matching Vault first; the scripts print the login command if your token is missing or expired. `--vault ci-prod` ignores `VAULT_ADDR`; set `KBN_EVALS_CI_PROD_VAULT_ADDR` to override its address.

```bash
# Sync scripts/vault/config.json from Vault, edit it, then upload it:
node scripts/vault/retrieve_secrets.js --vault ci-prod
node scripts/vault/upload_secrets.js --vault ci-prod

# Or print the vault command instead of running it. The command holds the whole config inline,
# so running it puts the secret in your shell history; prefer upload_secrets.js.
node scripts/vault/get_command.js --vault ci-prod
```

Upload writes the whole secret, so always retrieve first. The ci-prod path is KV v2 and keeps previous versions (numbered up by one per upload). To undo a bad upload, retrieve an earlier version and upload it again (add `--suite <id>` to both for a suite's secret). Retrieve validates the config and fails before touching `config.json` if the version can't be read:

```bash
node scripts/vault/retrieve_secrets.js --vault ci-prod --version <n>
node scripts/vault/upload_secrets.js --vault ci-prod
```

### CI telemetry

EIS inference requests are tagged with `X-Elastic-Product-Use-Case: kbn_evals`. Override via `KBN_EVALS_TELEMETRY_PLUGIN_ID`.

### Golden cluster privileges

A single API key covers all golden cluster operations (scores, traces, datasets). Create via Kibana Dev Tools using the privilege payload exported from [`@kbn/evals-common`](../kbn-evals-common/golden_cluster_privileges.ts).

Grants:

- Write/read `.evaluation-scores*` (results)
- Write/read `traces-*` (OTLP traces)
- Read evidence events from `logs-*`, restricted by document-level security
- Write/read/delete `.evaluation-dataset*` (managed datasets)
- Kibana `evals` feature privilege (`all`)

The log-event allowlist is embedded in the API key. Regenerate existing keys when support for a new log-backed instrumentation profile or event name is added.

With `--profile dev-vault`, these keys are read from Vault automatically.
