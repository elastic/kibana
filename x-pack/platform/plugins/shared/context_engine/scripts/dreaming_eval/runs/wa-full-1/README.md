# Dreaming eval run `wa-full-1`

All 141 text questions of LongMemEval-V2 enterprise in the [dreaming eval](../../README.md): questions about a ServiceNow portal (WorkArena), 74 static-environment, 35 dynamic-environment and 32 procedure, asked over the small haystack of 100 trajectories of a web agent working in the portal. Abstention questions and those with a screenshot are left out, as the eval does by default. Dreaming ran once over the 100, with the default `dreaming-eval-workarena` AI index.

## Results

| | Targets | Score | Covered / correct | Partial | Missing / incorrect |
| --- | --- | --- | --- | --- | --- |
| KIs hold the target (`summary.md`) | 141 | 61.0% | 64 | 44 | 33 |
| Answer agent answers (`answers.md`) | 141 | 67.0% | 91 | 7 | 43 |

| Category | Targets | KIs | Answers |
| --- | --- | --- | --- |
| procedure | 32 | 75.0% (19 covered, 10 partial, 3 missing) | 78.1% (25 correct, 7 incorrect) |
| static-environment | 74 | 60.8% (32 covered, 26 partial, 16 missing) | 74.3% (53 correct, 4 partial, 17 incorrect) |
| dynamic-environment | 35 | 48.6% (13 covered, 8 partial, 14 missing) | 41.4% (13 correct, 3 partial, 19 incorrect) |

Dreaming wrote 504 KIs: 98 form fields, 67 gotchas, 65 UI locations, 60 page layouts, 59 procedures, 19 record values, 13 company rules, 12 side effects, and 111 entities (45 pages, 33 catalog items, 24 modules, 9 protocols). It read the 100 trajectories in 15 runs, in 1,236 s.

## Cost

Dreaming's tokens come from the workflow step executions, the answer agent's from its Agent Builder traces; the judges' are estimated. List prices: Gemini 3.8 Flash $0.75 / $3.75 per million input / output tokens, Claude Opus 5.5 $4 / $20 ($0.20 cache reads), Claude Haiku 4.5 $1 / $5, Claude Sonnet 4.6 $3 / $15.

| Stage | Model | LLM calls | Input tokens | Output tokens | Cost |
| --- | --- | --- | --- | --- | --- |
| Dreaming | Gemini 3.8 Flash | 80 | 8.42M | 321k | $7.52 |
| Ask: answer agent | Claude Opus 5.5 | 778 | 17.24M (13.56M cache reads) | 170k | $20.85 |
| Ask: conversation titles | Claude Haiku 4.5 | 141 | 137k | 6k | $0.17 |
| Evaluate and ask: judges | Claude Sonnet 4.6 | 282 | about 0.17M | about 20k | about $0.75 |
| **Total** | | | | | **about $29.30** |

Dreaming costs the same for 10 questions or 141: the haystack is shared. The answer agent is 71% of the cost, about $0.15 a question.

## How it ran

On a local stack, with the feature branch's trace dreaming as of [#305109](https://github.com/elastic/kibana/pull/305109) (batches of up to 100k tokens, 4 at a time, a long round read in parts, tool results kept up to 16,000 characters), and the eval of [#304953](https://github.com/elastic/kibana/pull/304953) (whole pages with iframe content and field state; the WorkArena AI index with page layouts, form fields, side effects, and a page's mandatory and read-only fields).

```sh
node scripts/context_engine_dreaming_eval.js --dataset longmemeval_v2_enterprise --all-samples \
  --stage extract,import,configure,run,evaluate,ask --run-id wa-full-1 \
  --judge-connector .anthropic-claude-4.6-sonnet-chat_completion
```

## Files

- `dreaming-eval-workarena/kis.json`: the KIs dreaming wrote (whole documents), with its workflow runs.
- `dreaming-eval-workarena/targets.json`: the 141 targets.
- `dreaming-eval-workarena/evaluation.json`, `summary.md`: whether the KIs hold each target.
- `dreaming-eval-workarena/answers.json`, `answers.md`: the answer agent's answers, tool calls and queries, and their verdicts.
- `logs/wa-full-1.txt`: the console output.

To try retrieval on these KIs without dreaming again:

```sh
node scripts/context_engine_dreaming_eval.js --dataset longmemeval_v2_enterprise --all-samples --stage configure,load,ask \
  --from x-pack/platform/plugins/shared/context_engine/scripts/dreaming_eval/runs/wa-full-1
```
