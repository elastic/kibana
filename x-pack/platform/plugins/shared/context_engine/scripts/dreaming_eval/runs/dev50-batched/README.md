# Dreaming eval run `dev50-batched`

The `dev_50` preset of the [dreaming eval](../../README.md): 50 fixed LongMemEval S questions across its 6 question types, each dreamed on its own haystack (about 50 sessions, 250 rounds) from a clean AI index, with the default `dreaming-eval-longmemeval` AI index (the `personal_assistant` template).

## Results

| | Targets | Score | Covered / correct | Partial | Missing / incorrect |
| --- | --- | --- | --- | --- | --- |
| KIs hold the target (`summary.md`) | 50 | 56.0% | 23 | 10 | 17 |
| Answer agent answers (`answers.md`) | 50 | 58.0% | 27 | 4 | 19 |

| Category | Targets | KIs | Answers |
| --- | --- | --- | --- |
| knowledge-update | 8 | 50.0% | 43.8% |
| multi-session | 13 | 65.4% | 76.9% |
| single-session-assistant | 6 | 0.0% | 0.0% |
| single-session-preference | 3 | 16.7% | 33.3% |
| single-session-user | 7 | 78.6% | 78.6% |
| temporal-reasoning | 13 | 73.1% | 69.2% |

Dreaming wrote 1,619 KIs (facts and entities; trace dreaming builds no relationships), and took 48 s to 285 s per question (median 138 s, 116 minutes in all). Covered and correct count 1, partial 0.5. Claude Sonnet 4.6 judged both.

single-session-assistant scores 0: those questions ask about what the assistant said, and the dreaming instructions keep what the user says.

## Cost

Dreaming's tokens come from the workflow step executions, and the answer agent's from its Agent Builder traces. The judges' tokens are estimated from their prompts, as the eval wrote them, at 3.5 characters a token. Costs are at list prices: Gemini 3.8 Flash $0.75 / $3.75 per million input / output tokens ($0.075 cached; the introductory price, doubling on January 1, 2027), Claude Opus 5.5 $4 / $20 ($0.20 cache reads; cache writes are not in the traces, so up to about $1 more), Claude Sonnet 4.6 $3 / $15, Claude Haiku 4.5 $1 / $5.

| Stage | Model | LLM calls | Input tokens | Output tokens | Cost |
| --- | --- | --- | --- | --- | --- |
| Dreaming | Gemini 3.8 Flash | 50 | 7.97M (0.16M cached) | 0.85M | $9.07 |
| Ask: answer agent | Claude Opus 5.5 (Agent Builder's default) | 215 | 4.06M (2.96M cache reads) | 42k | $5.84 |
| Ask: conversation titles | Claude Haiku 4.5 | 50 | 45k | 2k | $0.06 |
| Evaluate: KI judge | Claude Sonnet 4.6 | 50 | about 44k | about 3k | $0.18 |
| Ask: answer judge | Claude Sonnet 4.6 | 50 | about 14k | about 2k | $0.08 |
| **Total** | | | | | **about $15.20** |

Per question: about 159k input and 17k output tokens of dreaming ($0.18), $0.12 for the answer agent and half a cent of judging. The reranker runs in the local Elasticsearch.

### Estimated cost of full runs

LongMemEval S scales with the question count, as each question dreams on its own haystack. The other datasets are sized from their extracted transcripts, at the 0.33 input tokens per transcript character and the 10.7% output-to-input ratio this run measured. Ask and judging stay at the measured $0.12 a question, at today's prices.

| Run | Questions | Dreaming | Ask and judging | Total |
| --- | --- | --- | --- | --- |
| LongMemEval S | 470 (500 with abstention) | $85 | $58 | about $145 (about $150) |
| LongMemEval M (about 9.4× the haystack) | 470 | about $810 | about $60 | about $870 |
| LongMemEval oracle (answer sessions only) | 470 | about $5 | $58 | about $65 |
| LME-V2 enterprise, small (one 100-trajectory haystack, dreamed once) | 141 (211 all) | about $1 | $17 | about $20 (about $28) |
| LME-V2 web, small | 153 (240 all) | about $0.50 | $19 | about $20 (about $30) |
| LME-V2 enterprise, medium (500 trajectories a question) | 141 (211) | about $790 | $17 | about $810 (about $1,200) |
| LME-V2 web, medium | 153 (240) | about $340 | $19 | about $360 (about $570) |

The smaller LME-V2 counts leave out the abstention questions and those with a screenshot, which the eval skips by default. Dreaming doubles from January 1, 2027. The answer agent can use a cheaper model (`ask.connector_id`), and the judges are about 2% of the cost.

## How it ran

On a local stack with Gemini 3.8 Flash dreaming (Kibana's default for Context Engine prompts), with trace dreaming batching rounds by conversation, up to 500k tokens a batch, run in parallel ([#304972](https://github.com/elastic/kibana/pull/304972) at `3936a6ff3bbd`). The eval script is the one of [#304953](https://github.com/elastic/kibana/pull/304953).

It ran in two parts, merged here: the 10 questions of the `dev` preset (run `dev-batched-2`), then the other 40 of `dev_50` (run `dev50-rest`), each with

```sh
node scripts/context_engine_dreaming_eval.js --preset <preset> --stage extract,configure,run,evaluate,ask \
  --run-id <run id> --judge-connector .anthropic-claude-4.6-sonnet-chat_completion
```

The merge copied the per-question dumps, and joined the targets, judgements and answers with the scores computed again over all 50; each dump keeps the run it was dreamed in (`dreamedInRun`), and `evaluation.json` and `answers.json` list both runs (`mergedFrom`). `logs/` holds the console output of both runs.

## Files

- `dreaming-eval-longmemeval/samples/<question id>/kis.json`: the KIs dreaming wrote for a question (whole documents), with its workflow runs.
- `dreaming-eval-longmemeval/targets.json`: the 50 targets.
- `dreaming-eval-longmemeval/evaluation.json`, `summary.md`: whether the KIs hold each target.
- `dreaming-eval-longmemeval/answers.json`, `answers.md`: the answer agent's answers, tool calls and queries, and their verdicts.

## Using the memories

To try retrieval on these KIs without dreaming again, load them and ask:

```sh
node scripts/context_engine_dreaming_eval.js --stage configure,load,ask \
  --from x-pack/platform/plugins/shared/context_engine/scripts/dreaming_eval/runs/dev50-batched
```

`--stage compare --run-id dev50-batched` scores them against reference memories once those are written (`--stage reference`).
