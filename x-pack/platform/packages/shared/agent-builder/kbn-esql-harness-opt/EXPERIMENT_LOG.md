# Experiment log — automated harness optimization for `generate_esql`

Context for anyone picking this up, including the things that are easy to get wrong. Tracking
issue: `elastic/nightshift-program#2285`.

## What was built

A loop that improves the `generate_esql` tool by **editing its source files** and keeping only
the changes that survive a held-out test.

```
incumbent worktree (:5681)            candidate worktree (:5691)
        │                                      │
        │ 1. measure on the search split       │
        │ 2. bundle failures + full traces ───►│ 3. proposer (claude-opus-5-5) edits files
        │                                      │ 4. reviewer agent judges the diff
        │                                      │ 5. typecheck + unit tests + eslint
        │ 6. gate: both lanes on the gate split, paired bootstrap over seeds
        │ 7. accept → promote into the incumbent worktree, restart its lane
```

Two Kibana processes against one Elasticsearch, because a dev-server restart per variant swap
would dominate the round and because A/B without ordering effects is the point of the gate.

## Results, 20 rounds, $29 of model spend

| | |
|---|---|
| accepted | 3 of 20 (rounds 1, 9, 16) |
| rejected at the gate | 15 |
| blocked by the reviewer | 1 |
| produced no edit | 1 |
| manifest predictions confirmed | 39 of 65 |
| files touched | `instructions.md` ×13, `examples.md` ×6, `nl_to_esql.ts` ×1, `syntax.md` ×1 |

Accepted changes:

1. **Round 1** (+0.045, CI [0.000, 0.100]) — a worked example for multi-valued fields. Its own
   diagnosis: the model `MV_EXPAND`s before counting, inflating counts 10087 vs 4675, *and
   `instructions.md` already forbids this in prose, which the model ignores* — so it added the
   example instead.
2. **Round 9** (+0.122, CI [0.032, 0.204], cost 0.58×) — a `MIN`/`MAX` rule for extremes plus a
   switch to `claude-5.5-haiku`. **Confounded**: the gain is not attributable to the prose alone.
3. **Round 16** (+0.030, CI [0.004, 0.062], cost 1.00×) — a rule for parse/extract questions and
   threshold filtering.

Standing result, measured three times independently: **raising the model tier buys a large,
significant quality gain (+0.080 to +0.153) at 6–11× the cost.** The cost ceiling rejected it
every time, which is the gate working, but it is the clearest lever found.

The last three rounds were +0.006, −0.015, +0.012 — plateaued.

## What this measures, exactly

Reward per example, no LLM judge anywhere:

```
0.6 · result_equivalence + 0.3 · executes + 0.1 · ast_valid
```

- `result_equivalence` — Jaccard over row multisets vs the gold query, **after aligning columns
  by content** (names and order are free; extra columns are reported, not punished)
- gold that does not execute → that component is dropped and the rest renormalised
- abstention examples invert it: producing any query is wrong
- cost is USD, priced per model from OpenRouter list prices, never part of the reward

The gate: paired bootstrap over **seeds** (10k resamples), accept if the reward CI excludes zero
at ≤1.1× cost, or if reward is non-inferior at significantly lower USD per solved example.
Regressions are capped, and a seed only counts as regressed if *every* rollout got worse.

## Dataset (163 seeds, split 66 search / 47 gate / 50 sealed by hash of seed id)

| tier | n | provenance |
|---|---|---|
| anchors | 34 | security ES\|QL regression suite + agent-builder spec; human questions, human gold |
| expert | 45 | human-written queries mined from Elasticsearch's own `.csv-spec` suite, with its test datasets loaded so they execute |
| generated | 84 | templates run against live mappings, executed, back-translated by a different model, difficulty-probed |

Reported separately, always. A gain only on the generated corpus is not a promotion signal.

## Mistakes worth not repeating

Every one of these produced *plausible numbers* and was caught only because a figure looked
wrong in context. Assume more remain.

1. **Columns compared positionally.** A candidate adding `KEEP` to reorder output scored 0.00 on
   data identical to the gold — ES|QL returns the grouping key last in `STATS … BY`. Inflated
   every early "improvement". Now aligned by value multiset; 7 unit tests pin it.
2. **`git stash` of the tool directory stashed nothing**, because the edits had been committed by
   an earlier `git add -A`. Both sides of a "baseline vs optimized" comparison ran identical
   code; the 0.022 gap was pure noise. Hence: `check` snapshots a directory, never stashes, and
   repeats each side.
3. **Manifest predictions verified against the wrong split.** Predictions describe search-split
   failures; they were matched against gate-split seeds — disjoint, so 0 of 30 was structurally
   impossible to beat. With that fixed, precision is 39/65.
4. **Prose labels where the matcher expected ids.** Manifests now use `id` values from the
   bundle, and unmatched predictions are reported as a manifest defect, not a wrong prediction.
5. **A candidate did not inherit the incumbent's model.** After round 9 pinned haiku, every later
   candidate silently ran the code default: four rounds reported −0.08 to −0.11 at 1.6× cost and
   were measuring a model downgrade, not their edits. Deleted from the ledger.
6. **Baseline for `check` was `origin/main`**, which has no trace writer, so the baseline recorded
   zero tokens and a 3.6e15× cost ratio. Campaigns now snapshot the tool directory they start
   from.
7. **Doc `.md` edits are invisible without a restart** — not watched by the dev server, and the
   corpus is memoised. A round once measured the previous code while believing otherwise. Lanes
   restart explicitly and must be observed going down before coming back.
8. **The report server loads its code once.** Two "fixed, reload" messages were wrong. It now
   renders each request in a child process.

## Guardrails, and why each exists

- **Editable boundary**: everything under `tools/generate_esql/` except `*.test.ts` and
  `harness_trace.ts` — the tests are a guard on the optimizer, the trace writer is measurement.
- **Reviewer agent** reads the diff with an anti-cheating prompt (encodes the benchmark, detects
  the evaluation, tampers with measurement, escapes the tool, fakes success). It replaced regex
  rules that blocked a published `postgres-logs*` documentation example, an ordinary
  `process.env` read, and would have blocked any word containing "eval(".
- **Three splits**, assigned by hash of the seed id so adding examples never reshuffles them.
- **Sealed split** is scored rarely and deliberately; it decays into a dev set if used often.

## Reading the lineage

`node scripts/esql_harness_opt.js report --serve --port 7711` — campaign graph, per-round diffs,
per-seed effects with both sides' queries and rows, manifest verification, dataset composition.
The ledger is `~/.esql-harness/lineage/ledger.json`; accepted variants are in
`~/.esql-harness/lineage/accepted-*/variant.diff`.

Optimizer output is committed separately under `[optimizer]` so it stays attributable. Use
`commit-scaffolding.sh`-style staging rather than `git add -A`: three times, an accepted variant
was swept into an infrastructure commit.

## Open questions

- **Is round 9's gain the prose or the model?** Not separated. Measure the current incumbent on
  the default model to find out.
- **Does any of it survive on the sealed split?** The previous campaign's gate gains did not
  (anchor subset went down while generated went up, on 8 anchor seeds — too few to conclude).
- **`graph.ts` has never been edited** in 20 rounds despite being named as untouched in the
  prompt. Control flow remains unexplored.
- **Anchors are too thin to gate on** (8–14 seeds per split). The detectable effect size is about
  +0.05; anything smaller is invisible regardless of whether it is real.
