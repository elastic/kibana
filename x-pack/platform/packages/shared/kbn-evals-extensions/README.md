# @kbn/evals-extensions

Experimental and advanced extensions for `@kbn/evals`.

This package is the home for evals capabilities that are experimental or too specialized to live in the core `@kbn/evals` framework. Mature features can later graduate into `@kbn/evals`.

## What lives here

- **Custom CLI commands** under the `ext` namespace, run via `node scripts/evals ext <command>`.
- **The LLM performance matrix generator** (`node scripts/evals ext matrix`), a docs-publishing workflow described [below](#llm-performance-matrix).

## Architecture

This package depends on `@kbn/evals`, never the other way around:

- `kbn-evals-extensions` CAN import from `kbn-evals`
- `kbn-evals` MUST NOT import from `kbn-evals-extensions`
- Evaluation suites can use both packages independently

## Usage

### CLI

```bash
node scripts/evals ext --help

node scripts/evals ext [command] [...args]
```

### In an evaluation suite

Suites opt in to extension features by importing them from `@kbn/evals-extensions` explicitly, alongside `@kbn/evals` core:

```typescript
import { evaluate } from '@kbn/evals';
import { createSomeEvaluator } from '@kbn/evals-extensions';

evaluate('my suite', async ({ executorClient }) => {
  await executorClient.runExperiment({ datasets: [dataset], task }, [
    // mix core and extension evaluators
    createSomeEvaluator(),
  ]);
});
```

## LLM performance matrix

The `matrix` command turns already-exported evaluation results into a publishable
**LLM performance matrix** (the table comparing models across capabilities in the
docs). It **does not run any evals** -- it reads the latest experiment per
(model, suite) from the evals plugin on the target Kibana (typically the golden
cluster, where the weekly pipeline posts results) via `@kbn/evals`' `EvalsClient`,
normalizes scores onto a 0-10 scale via a config file, and writes markdown + CSV + JSON.
It is a docs-publishing workflow rather than a core evals concern, which is why it
lives here rather than in `@kbn/evals`.

```
Weekly LLM evals  ->  golden cluster (.evaluation-scores via evals plugin)
        |
        v
node scripts/evals ext matrix --config <matrix.config.json>   (kibana-evals-security-matrix pipeline)
        |
        v
target/llm_matrix/{proprietary,open-source}-models.csv + matrix.{md,json}
        |
        v  (CI: upload to GCS gs://<bucket>/security/{latest|<version>}/)
docs-content "Sync LLM performance matrix" workflow  ->  PR  ->  :::{csv-include} render
```

### Run it locally

```bash
# Against the golden cluster via runtime Vault (requires `vault login --method oidc`)
node scripts/evals ext matrix \
  --config .buildkite/pipelines/evals/security_matrix.config.json \
  --profile dev-vault

# Against any Kibana via explicit env/flags
EVALUATIONS_KBN_URL=https://<golden-cluster-kibana> EVALUATIONS_KBN_API_KEY=<key> \
  node scripts/evals ext matrix --config .buildkite/pipelines/evals/security_matrix.config.json
```

| Flag              | Description                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------- |
| `--config <path>` | Path to the matrix config JSON (required).                                                   |
| `--out <dir>`     | Output directory for artifacts (default: `target/llm_matrix`).                               |
| `--branch <name>` | Git branch filter override (default: `config.branch`).                                       |
| `--lookback-days` | Only consider experiments newer than `now-<n>d` (default: `config.lookbackDays`).            |
| `--profile`       | Golden-cluster config profile (`dev-vault` for runtime Vault, or a `config.<name>.json`).    |
| `--kbn-url`       | Kibana URL override.                                                                         |
| `--kbn-api-key`   | Kibana API key override.                                                                     |

Outputs written to `--out` (default `target/llm_matrix/`): `proprietary-models.csv`,
`open-source-models.csv`, `matrix.md`, `matrix.json`. The CSVs are what the
docs-content page consumes via `:::{csv-include}`.

### Configuration

The matrix engine is domain-agnostic; the column taxonomy (columns ->
suites/datasets/evaluators), model allowlist (display names + open-source
classification), and normalization/thresholds live in a config file. The Security
taxonomy is
[`.buildkite/pipelines/evals/security_matrix.config.json`](../../../../../.buildkite/pipelines/evals/security_matrix.config.json).
Other teams can add their own config + pipeline to opt in.

The Security config follows the Agent Builder matrix shape from
[security-team#17904](https://github.com/elastic/security-team/issues/17904): five
data-backed **Agent Builder** sub-columns (Alert Triage, Detection Engineering,
Investigation, Workflow Execution, Multi-step execution) sharing a `group`, two
standalone feature columns (Attack Discovery, Automatic Migration), and two
**composite** columns derived from them -- `Agent Builder Score` (mean of the five
sub-columns) and `Overall Score` (mean of Agent Builder Score + the two standalone
features). Columns whose suites are not yet wired on the golden cluster render as
empty/`Not recommended` and are simply skipped by the composite means until data
lands -- so the matrix shows the gaps without tanking every model's score.

| Field                                 | Purpose                                                                                              |
| ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `columns[]`                           | **Base** (data-backed) columns. Each maps `suites`/`datasetIds`/`evaluators` -> a scaled 0-10 cell. |
| `columns[].group`                     | Optional grouped-header label (e.g. `"Agent Builder"`) carried into the JSON artifact for the docs page. |
| `composites[]`                        | **Derived** columns: `{ id, label, group?, from: [...] }`. Cell = equal-weighted mean of the `from` cells. |
| `composites[].from`                   | Ids of base columns or **earlier** composites, so composites can be layered (e.g. an Overall Score that averages an Agent Builder Score composite alongside standalone feature columns). |
| `layout`                              | Explicit left-to-right order of base + composite ids. Omit to render base columns then composites.   |
| `showOverall`                         | Renders the legacy single weighted/mean "Overall" column at the far right. Set `false` when the layout already expresses Overall as a composite (avoids a duplicate trailing column). |
| `notRecommendedCountsAsZeroInOverall` | When set, `"Not recommended"` sources count as 0 in composites and the legacy Overall; missing sources are skipped so a composite reflects the data that exists. |

Composite/legacy-Overall ranking: rows sort by the **final composite** (e.g. Overall
Score) when composites exist, otherwise by the legacy Overall column.

### CI + publishing

The [`kibana-evals-security-matrix`](../../../../../.buildkite/pipeline-resource-definitions/evals/kibana-evals-security-matrix.yml)
Buildkite pipeline runs `ext matrix` weekly (after the weekly evals), uploads the
artifacts as a Buildkite artifact, and (once a bucket is provisioned) to GCS under
`security/latest/` -- or `security/<version>/` when `MATRIX_VERSION` is set for a
Stack release. A keyless-WIF GitHub Action in `elastic/docs-content` then pulls the
CSVs and opens a PR: scheduled weekly for serverless (`latest` -> `main`) and via
manual `workflow_dispatch` with a version input for versioned releases.
