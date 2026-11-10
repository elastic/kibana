# @kbn/esql-harness-opt

Experimental, dev-only optimization loop for the `platform.core.generate_esql` harness
(tracking issue: `elastic/nightshift-program#2285`).

A **harness variant is a set of file edits inside the tool** — prompts, documentation corpus,
control flow, model selection. There is no config object and no override layer: the optimizer
edits the same files a human would, and every edit has to typecheck, pass the tool's unit tests
and pass lint before it is measured.

## What it measures

Reward per example is deterministic and LLM-free:

```
0.6 · result_equivalence + 0.3 · executes + 0.1 · ast_valid
```

- `ast_valid` — `@kbn/esql-language` `validateQuery`
- `executes` — the query runs against the fixtures (`?_tstart` / `?_tend` substituted)
- `result_equivalence` — Jaccard over normalised row multisets vs the gold query; dropped (and
  the rest renormalised) when the gold query itself does not execute

Cost is **USD, priced per model** from OpenRouter list prices (`src/pricing.ts`, override with
`~/.esql-harness/prices.json`), computed from the token counts the harness trace records.

## Two lanes

| lane | worktree | Kibana | role |
|---|---|---|---|
| incumbent | your checkout | `:5681` | the current best variant |
| candidate | `setup-candidate` worktree | `:5691` | the proposal under test |

Both point at the same Elasticsearch. Two processes rather than one, because a dev-server
restart per variant swap would dominate every round, and because A/B without ordering effects is
the whole point of the gate.

## What the optimizer may edit

Everything under `tools/generate_esql/`, except `*.test.ts` and `harness_trace.ts` — the tests
are a guard on the optimizer and the trace writer is measurement apparatus.

Rejected mechanically, before anything runs: paths outside that folder, filesystem / process /
network / environment access, dynamic code execution, new dependencies, hardcoded fixture index
names or gold strings, and more than two files touched in one round.

## Running it

```bash
# once
node scripts/esql_harness_opt.js setup-fixtures --sample-data
node scripts/esql_harness_opt.js setup-models          # connectors used as gate tiers
node scripts/esql_harness_opt.js setup-candidate       # second worktree + bootstrap
node scripts/esql_harness_opt.js generate-corpus --probes 3

# measure what you have, on each model you care about
node scripts/esql_harness_opt.js baseline --tiers <connectorA>,<connectorB>

# optimize
node scripts/esql_harness_opt.js campaign --rounds 5 \
  --candidate-path ~/kibana-harness-cand --candidate-url http://localhost:5691 \
  --tiers <connectorA>,<connectorB>

# the honest number, once
node scripts/esql_harness_opt.js sealed --tiers <connectorA>

# ...or as an A/B against what the campaign started from: both sides in one session, repeated,
# each side on the model its own variant runs on (from the ledger; --model / --baseline-model
# override). --baseline is only needed when the campaign recorded no starting snapshot.
node scripts/esql_harness_opt.js check --split sealed --repeats 2

# browse everything
node scripts/esql_harness_opt.js report --serve --port 7711
```

Each lane's Kibana must run with `ESQL_HARNESS_TRACE_FILE` pointing at
`~/.esql-harness/{incumbent,candidate}/trace.jsonl`; that file is how the loop sees retries,
token spend and which model served each call. `ESQL_HARNESS_MODEL_CONNECTOR` pins a model for
tier runs. Production sets neither.

## The dataset

- **Anchor set (34)** — 31 from the security ES|QL regression suite, 3 from the agent-builder
  ES|QL spec. Human language, human-verified gold. The benchmark of record.
- **Generated corpus (159)** — `generate-corpus`: templates instantiated against live mappings
  and sampled literals, executed (so gold is an observed fact), back-translated into questions by
  a different model family, then probed three times to label difficulty.

Saturation is actively controlled: the first generated corpus was solved 95% of the time on the
first attempt and could show neither improvement nor regression. Flipping cases are all kept,
never-solved examples are capped, trivial ones are admitted only as regression ballast (≤30%).

Splits are assigned by hash of the seed id: search 62 / gate 79 / sealed 52.

## The gate

Paired bootstrap over **seeds** (not rows — rollouts of one seed are not independent), 10k
resamples, with two acceptance paths:

- **quality**: reward CI excludes 0 and cost ≤ 1.1×
- **cost**: reward non-inferior (CI low > −0.02) and USD per solved example significantly lower

Either way: ≤2 regressed seeds, and the candidate must clear every model tier.

## Known limitations

- 193 seeds. Enough to resolve effects around +0.05 reward; not enough to promote to production
  defaults without more data.
- Held out, the first campaign's chain is worth +0.097 reward (CI [0.025, 0.181]) at 0.63× cost
  — against gate deltas summing to ~+0.20. Gate numbers overstate; treat them as a search
  signal (`EXPERIMENT_LOG.md`).
- 11 of the 34 anchor gold queries do not execute against the fixtures; those score on
  `executes` / `ast_valid` only.
- The proposer runs with write access to the candidate worktree. Local-only, never in CI.
