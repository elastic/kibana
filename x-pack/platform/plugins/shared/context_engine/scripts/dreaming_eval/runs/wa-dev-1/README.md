# Dreaming eval run `wa-dev-1`

The `dev` preset of LongMemEval-V2 enterprise in the [dreaming eval](../../README.md): 10 fixed questions about a ServiceNow portal (WorkArena), 4 static-environment, 3 dynamic-environment and 3 procedure. All of them are asked over the same small haystack: 100 trajectories of a web agent working in the portal, each one round of a goal, a `browser` tool call per action with the page it led to, and how the task ended. Dreaming ran once over the 100, with the default `dreaming-eval-workarena` AI index.

## Results

| | Targets | Score | Covered / correct | Partial | Missing / incorrect |
| --- | --- | --- | --- | --- | --- |
| KIs hold the target (`summary.md`) | 10 | 40.0% | 2 | 4 | 4 |
| Answer agent answers (`answers.md`) | 10 | 50.0% | 5 | 0 | 5 |

| Category | Targets | KIs | Answers |
| --- | --- | --- | --- |
| procedure | 3 | 83.3% | 100.0% |
| static-environment | 4 | 25.0% | 25.0% |
| dynamic-environment | 3 | 16.7% | 33.3% |

Dreaming wrote 224 KIs: 40 procedures, 51 UI locations, 48 gotchas, 12 company rules, 11 record values, and 62 entities (modules, pages, catalog items, protocols). It read the 100 trajectories in 4 runs of 12 to 35, in 401 s.

Procedures are learned well: the company protocols the agent followed are KIs, and the agent answers each procedure question from them. What a page or form shows is not: which tabs a form has, which fields are mandatory or read-only, a field's default value, the sections of a catalog item page.

## Cost

Dreaming's tokens come from the workflow step executions, the answer agent's from its Agent Builder traces; the judges' are estimated. List prices: Gemini 3.8 Flash $0.75 / $3.75 per million input / output tokens, Claude Opus 5.5 $4 / $20 ($0.20 cache reads), Claude Sonnet 4.6 $3 / $15.

| Stage | Model | LLM calls | Input tokens | Output tokens | Cost |
| --- | --- | --- | --- | --- | --- |
| Dreaming | Gemini 3.8 Flash | 22 | 2.34M | 93k | $2.10 |
| Ask: answer agent | Claude Opus 5.5 | 77 | 1.90M (1.58M cache reads) | 17k | $1.91 |
| Ask: conversation titles | Claude Haiku 4.5 | 10 | 10k | 0.4k | $0.01 |
| Evaluate and ask: judges | Claude Sonnet 4.6 | 20 | about 40k | about 4k | about $0.18 |
| **Total** | | | | | **about $4.20** |

## How it ran

On a local stack, with trace dreaming of [#305064](https://github.com/elastic/kibana/pull/305064) at `587d87bcb080`: batches of up to 100k tokens, 4 at a time, without the existing KIs; tool results kept up to 8,000 characters and rounds up to 200,000. The eval script is the one of [#304953](https://github.com/elastic/kibana/pull/304953) at `02710a1b93a6`, with pages kept whole.

```sh
node scripts/context_engine_dreaming_eval.js --dataset longmemeval_v2_enterprise --preset dev \
  --stage extract,import,configure,run,evaluate,ask --run-id wa-dev-1 \
  --judge-connector .anthropic-claude-4.6-sonnet-chat_completion
```

## Files

- `dreaming-eval-workarena/kis.json`: the KIs dreaming wrote (whole documents), with its workflow runs.
- `dreaming-eval-workarena/targets.json`: the 10 targets.
- `dreaming-eval-workarena/evaluation.json`, `summary.md`: whether the KIs hold each target.
- `dreaming-eval-workarena/answers.json`, `answers.md`: the answer agent's answers, tool calls and queries, and their verdicts.
- `logs/wa-dev-1.txt`: the console output.

To try retrieval on these KIs without dreaming again:

```sh
node scripts/context_engine_dreaming_eval.js --dataset longmemeval_v2_enterprise --stage configure,load,ask \
  --from x-pack/platform/plugins/shared/context_engine/scripts/dreaming_eval/runs/wa-dev-1
```
