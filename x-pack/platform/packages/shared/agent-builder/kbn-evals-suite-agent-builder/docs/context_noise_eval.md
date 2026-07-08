# Eval design: does stripping file-header noise help coding agents?

**Status:** draft — issue [elastic/security-team#TBD](https://github.com/elastic/security-team/issues) tracks
the full spec and rollout.

## 1. Question we are answering

Kibana source files begin with a ~6-8 line Elastic License / SSPL /
Apache-2.0 header. Across the roughly 67k `.ts` files under `src/` and
`x-pack/`, that is on the order of **400k-500k lines of boilerplate**
that never carries task-relevant signal but IS read by coding agents
whenever they open a file.

Does that boilerplate materially hurt agent performance — beyond the
trivially-true token cost — and does an `AGENTS.md`-driven convention
(or a thin file-read-tool wrapper) recover the lost quality?

The web-search summary Kirill posted in the Slack thread suggests the
direction is real (SNR / distractor / lost-in-the-middle literature),
but nobody has A/B'd it on a real coding benchmark against Kibana-shaped
tasks. This eval is that A/B.

## 2. Hypotheses

* **H1 (quality):** stripping the header yields a small but positive
  effect on `correctness` and `groundedness` on multi-turn tasks that
  require reading ≥5 files. Effect size: 1-3 pp absolute.
* **H2 (efficiency):** stripping cuts input tokens by roughly
  `n_files × 60` tokens per turn — measurable and cache-neutral.
* **H3 (tool use):** stripping does NOT increase the number of
  `read_file` calls (i.e. the model doesn't compensate by re-reading).
* **H4 (regression guard):** stripping does NOT hurt tasks that
  legitimately depend on the header (e.g. "which license does this
  file use?"). We include a small hold-out for this.

## 3. Two intervention variants

We evaluate two ways to hide the header, since a decision made on the
eval should transfer to how we'd actually ship this:

| Variant | Where the change lives | Cost to adopt |
| --- | --- | --- |
| `AGENTS.md`-only | New section instructs agents to pass `offset=8` when reading `.ts/.tsx/.js` files under Kibana. No code change. | Zero — pure prompt. |
| `read-file-wrapper` | Thin wrapper around the file-read tool detects and strips the leading license comment block before returning content. Byte offsets and line numbers reported to the model are preserved (headers are still counted). | Small — one wrapper, opt-in via env var. |

Rationale for testing both: `AGENTS.md`-only is cheapest but relies on
the model complying with the instruction; the wrapper is deterministic
but ships code. If the wrapper wins by a large margin over
`AGENTS.md`-only we ship the wrapper; if they tie we ship the
instruction; if neither beats baseline we shelve.

## 4. Multi-turn task design

Existing agent-builder eval suites are single-turn (one question →
one answer over a fixed KB). This eval needs multi-turn interaction over
real Kibana source, so we introduce a new task shape:

Each dataset example is a **repo-grounded coding scenario** with:

* `startingMessage`: the initial user request (e.g. "Find every place we
  register a Task Manager task with `maxAttempts: 1` and explain the
  reasoning behind the choice in each case.").
* `expectedFiles`: canonical set of file paths the agent should have
  read to answer correctly. Used both for the `groundedness` judge and
  the deterministic `FilesCited` evaluator.
* `expectedAnswer`: a reference answer written by a human reviewer.
* `metadata.turns`: expected number of assistant turns (upper bound
  used to cap runaway conversations).

The agent runs against a **frozen Kibana snapshot** (a specific commit)
served through the AgentBuilder file-read tool, so the ground-truth
files can't drift under us.

Dataset seeds (starter set — expand to ~40 before shipping):

| # | Category | Files touched | Why the header matters |
| --- | --- | --- | --- |
| 1 | Cross-file trace: find every call site of `SecurityPluginStart.authc.getCurrentUser` | 8-12 | Trace by grep + open — reads a lot of files. |
| 2 | Config surface: enumerate all `preconfigured` connector types loaded at boot | 5-8 | Ops-flavored, real-life question. |
| 3 | Behavioral question: does `evals` plugin re-import `./plugin` at server-index time? (See AGENTS.md rule) | 3-5 | Small file count, tests whether truncated header hides the `import type` shape. |
| 4 | Data flow: how does an alert `_id` reach the frontend? | 10-15 | High file count, long context — worst case for lost-in-the-middle. |
| 5 | Refactor prep: which files use `enzyme` and would need React-Testing-Library migration? | 20+ | Skims many small files — token savings maximal. |
| 6 | **Header-relevant hold-out**: what license does `x-pack/platform/plugins/shared/evals/kibana.jsonc` fall under, per the top-of-file header? | 1 | Must FAIL with `stripped`; used to prove we detected the regression. |

Examples 1-5 test H1-H3; example 6 tests H4.

## 5. Harness

Built on `@kbn/evals` (Playwright + custom fixture). New package:
`@kbn/evals-suite-agent-builder-context-noise` — wired into
`.buildkite/pipelines/evals/evals.suites.json` as suite id
`agent-builder-context-noise`.

Fixture layout:

```
evals/context_noise/
  context_noise.spec.ts        # playwright describe + evaluate() calls
  dataset.ts                   # the ~40 seeded scenarios
  file_read_variants.ts        # 'raw' | 'stripped-header' | 'stripped-per-agents-md'
  README.md                    # user-facing docs (see sibling file)
src/context_noise/
  strip_license_header.ts      # deterministic regex-driven stripper
  strip_license_header.test.ts # unit tests
  file_read_tool_wrapper.ts    # wraps AgentBuilder file-read tool
```

The wrapper strips the *leading contiguous C-style block comment* IF
that block matches one of a small allow-list of Elastic/Apache/SSPL
copyright banner shapes. It never strips comments that follow code, and
it never strips headers on non-source files (JSON, YAML, MD).

## 6. Metrics and stats

Reported per (example, variant, repetition):

| Metric | Kind | Source |
| --- | --- | --- |
| `correctness` (0-5) | LLM judge | `kbn-evals` `correctnessAnalysis` |
| `groundedness` (0-5) | LLM judge | `kbn-evals` `groundednessAnalysis` |
| `FilesCited` (0-1) | CODE | reference-set overlap with the files the agent claims to have read |
| `taskComplete` (0-1) | CODE | required-terms evaluator (variant-agnostic) |
| `inputTokens` | trace | `kbn-evals` trace-based |
| `outputTokens` | trace | `kbn-evals` trace-based |
| `cachedTokens` | trace | `kbn-evals` trace-based |
| `toolCalls` | trace | `kbn-evals` trace-based |
| `latency_s` | trace | `Converse` span, `kbn-evals` |

Analysis (paired, per example × repetition):

* Per-metric mean delta `stripped − raw` with a **95% bootstrap CI**
  over the (example × repetition) pairs. We ship if the interval
  excludes 0 in the expected direction on `inputTokens` AND
  `correctness` is non-negative at its lower bound.
* We also report per-category deltas (dataset row `metadata.category`)
  so we can see whether the effect concentrates on the many-file
  categories, which is what the lost-in-the-middle theory predicts.

Sample size: 40 examples × 3 repetitions × 3 variants = **360 runs per
model**. Budget one model to start (Sonnet-4.5); add Opus-4.8 and
GPT-4.1 as a secondary sweep once we know the harness works.

## 7. Threats to validity

* **Judge cost.** `correctnessAnalysis` uses an LLM judge; if we grade
  with the same model we test, we get self-preference bias. Grade with
  Sonnet-4.5-as-judge for a GPT-4.1 task run, and vice versa. Configure
  via `--judge` at run time.
* **Cache warming.** The trace-based `cachedTokens` metric will look
  artificially good on later reps if the prompt caches per model. Log
  cache stats separately and prefer `inputTokens - cachedTokens` as the
  "effective new tokens" headline number.
* **Model compliance for the `AGENTS.md`-only variant.** Some models
  will honour the `offset=` instruction; others will silently ignore
  it. Report per-variant compliance rate (fraction of reads that
  actually passed `offset ≥ header_length`) as a first-class metric —
  a low number invalidates that variant's headline result.
* **Selection bias.** If we seed the dataset from tasks we already know
  agents struggle with, we bias toward large deltas. Include at least
  one-third of examples drawn from real Slack asks and PR comments,
  not synthesized by whoever built the eval.

## 8. Ship criteria

We ship one of the two variants (or the `AGENTS.md` instruction, or
nothing) based on the following table, run over ≥3 repetitions and
≥40 examples:

| Δ correctness (LB of 95% CI) | Δ input tokens | Action |
| --- | --- | --- |
| ≥ 0 pp | ≤ −2% | Ship the winning variant. |
| ≥ 0 pp | ≥ 0% | Shelve — no efficiency win either. |
| < 0 pp | — | Do not ship; note in a short retro so we don't repeat this proposal in six months. |

## 9. Deliverables tracked

- [ ] This design doc (in-tree, so it lives next to the eval)
- [ ] Dataset — starter examples in `context_noise/dataset.ts` (this PR
      lands a scaffold + 2 examples; full 40 in a follow-up)
- [ ] `strip_license_header` utility + unit tests
- [ ] File-read-tool wrapper wiring the utility into the agent runtime
- [ ] `context_noise.spec.ts` running both variants across the dataset
- [ ] Buildkite suite registration (`evals.suites.json`) so the label
      `evals:agent-builder-context-noise` triggers it on a PR
- [ ] `AGENTS.md` addendum documenting the offset convention (this PR)
- [ ] Follow-up PR: swap the winner in globally once the eval has run

This PR is a **draft** carrying deliverables 1, 6, 7 and a scaffold of
2-5. It is deliberately non-runnable-yet so that reviewers can push
back on the design before we invest in the dataset labor.
