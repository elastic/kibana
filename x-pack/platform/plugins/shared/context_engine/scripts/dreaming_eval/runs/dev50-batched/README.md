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
