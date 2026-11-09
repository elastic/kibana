# @kbn/esql-harness-opt

Experimental, dev-only optimization loop for the `platform.core.generate_esql` harness
(tracking issue: `elastic/nightshift-program#2285`).

It searches a **typed config object** (`EsqlHarnessConfig`), not free-form rewrites of the tool,
and it gates every candidate on a held-out split with a paired test clustered by seed. Both
choices come straight from the failure catalogue in the harness-optimization literature review
that motivated the experiment: unrestricted rewriting underperformed no optimization at all, and
"keep it if the dev score went up" overstates held-out accuracy by 13–20 points.

## What it measures

Reward per example is deterministic and LLM-free:

```
0.6 · result_equivalence + 0.3 · executes + 0.1 · ast_valid
```

- `ast_valid` — `@kbn/esql-language` `validateQuery`
- `executes` — the query runs against the fixture indices (`?_tstart` / `?_tend` substituted)
- `result_equivalence` — Jaccard over normalised row multisets against the gold query. When the
  gold query itself does not execute, this component is dropped and the rest renormalised.

Cost comes from the in-process harness trace (generation attempts and real token counts), which
the HTTP response does not expose.

## Running it

1. Start a stack from this worktree with the two eval-only environment variables set:

   ```bash
   ESQL_HARNESS_CONFIG=~/.esql-harness/current.json \
   ESQL_HARNESS_TRACE_FILE=~/.esql-harness/trace.jsonl \
   node scripts/kibana --dev
   ```

   Neither variable is read anywhere in production; with them unset the harness is byte-identical
   to `main`.

2. Seed the fixtures and check how many gold queries execute:

   ```bash
   node scripts/esql_harness_opt.js setup-fixtures
   ```

3. Measure what the current harness costs and buys, including the matched-compute baselines
   (`maxRetries ∈ {1, 3, 5}`) that any later "gain" has to beat:

   ```bash
   node scripts/esql_harness_opt.js baseline --rollouts 2
   ```

4. Run optimization rounds (search split → proposer → gate split → ledger):

   ```bash
   node scripts/esql_harness_opt.js campaign --rounds 5
   ```

5. Score a promoted config once, on the split the proposer never saw:

   ```bash
   node scripts/esql_harness_opt.js sealed --config ~/.esql-harness/lineage/accepted-3-<hash>.json
   ```

## Guardrails

- Three disjoint splits assigned by hash of the seed id; the proposer only ever sees the search
  split's failures.
- The proposer runs in a scratch directory containing the bundle, the incumbent config and the
  ledger — it has no access to the dataset, fixtures, scorers or runner.
- Candidates are linted for fixture index names and other benchmark leakage before they are run.
- Gate requires: paired bootstrap 95% CI over seeds excluding 0, ≤2 regressed seeds, and ≤1.1×
  token cost.

## Known limitations (read before believing a number)

- The anchor dataset is 34 hand-written examples. That is enough to smoke-test the loop and
  nowhere near enough to promote a config to production defaults.
- Several gold queries in the security regression set are themselves dubious or non-executable;
  those examples score on `executes` / `ast_valid` only.
- Only one model tier is exercised per run. Harness fixes are pathology-matched to a model, so a
  promotion needs at least two.
