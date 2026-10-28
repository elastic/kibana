# @kbn/evals-extensions

Experimental and advanced extensions for `@kbn/evals`.

This package is the home for evals capabilities that are experimental or too specialized to live in the core `@kbn/evals` framework. Mature features can later graduate into `@kbn/evals`.

## What lives here

- **Custom CLI commands** under the `ext` namespace, run via `node scripts/evals ext <command>`.

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

### Matrix configs

| Config | Shape | Use |
|---|---|---|
| `config/security_matrix.json` | 32 columns | Full board: persona + attack-discovery slices + migrations |
| `config/security_matrix_persona.json` | 21 columns | Persona columns only — the column set the published persona matrix uses |

`security_matrix_persona.json` is `security_matrix.json` restricted to the column
ids in the persona suite's `persona_matrix.production.config.json`. Its scores are
identical to the full board's; only `overall` differs, because it averages over 21
columns instead of 32. Boards built from the two configs are therefore **not**
comparable on `overall`.

### Generating a board

The matrix CLI is the supported entrypoint. It queries scores and traces through
the Kibana evals API, so it needs a reachable Kibana rather than direct cluster
access:

```bash
node scripts/evals ext matrix \
  --config x-pack/platform/packages/shared/kbn-evals-extensions/config/security_matrix_persona.json \
  --out target/persona_board \
  --kbn-url "$EVAL_KBN_URL" \
  --kbn-api-key "$EVAL_KBN_API_KEY" \
  --html
```

Useful flags: `--branch` and `--lookback-days` / `--as-of` select which runs are
in scope, `--model` restricts the rows, and `--trace-cache <path>` reuses a
previously fetched set of score documents instead of re-querying them.

CI runs this step from `.buildkite/pipelines/evals/llm_evals.yml` after the eval
suites finish, and publishes the generated board as a build artifact.

The generator refuses to emit a board when the data cannot satisfy the config —
too few cells resolve, `examplePrefixes` columns with no `prefix:` keys, a scoring
policy that was not applied, or missing traces. Each refusal names the cause
and its override (`ALLOW_UNENFORCED_SCORING=1`, `ALLOW_NO_TRACES=1`); a scores-only
board publishes numbers with no transcript behind them, so override deliberately.

Pin a single grader with `JUDGE_MODEL_ID=<id>`. Note that golden data is
mixed-judge: pinning drops every cell graded by anyone else, and the published
provenance reports the real mix rather than asserting one judge.

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
