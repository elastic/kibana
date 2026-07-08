# context-noise eval

Multi-turn agentic eval that measures how much file-read noise (license
headers, boilerplate, copyright banners) degrades a coding agent's
answer quality, tool-use efficiency, and token spend.

Motivation, hypotheses, harness design, and metric definitions live in
[`../../docs/context_noise_eval.md`](../../docs/context_noise_eval.md).

## What this eval measures

A coding agent is given a multi-turn task that requires reading and
reasoning over ~5-15 Kibana source files. Each dataset example is run in
two variants over the SAME task:

| Variant | Description |
| --- | --- |
| `raw` | The agent's `read_file` tool returns the file as-is (Apache/Elastic license header at the top, ~6-8 lines of legalese). |
| `stripped` | The tool wrapper skips the leading license header block before returning content to the agent. Byte offsets and line numbers are preserved so citations remain accurate. |

Both variants use the **same model, same seed, same dataset, same
scaffolding** — the ONLY difference is what the file-read tool returns.

## Metrics reported (paired, per example)

| Metric | Direction | Source |
| --- | --- | --- |
| `correctness` | higher is better | LLM-as-judge (`kbn-evals` `correctnessAnalysis`) |
| `groundedness` | higher is better | LLM-as-judge (`kbn-evals` `groundednessAnalysis`) |
| `taskComplete` | higher is better | deterministic CODE evaluator (asserts required terms / file citations appear in the final message) |
| `inputTokens` | lower is better | trace-based |
| `outputTokens` | lower is better | trace-based |
| `cachedTokens` | higher is better | trace-based |
| `toolCalls` | lower is better | trace-based |
| `latency` | lower is better | trace-based (Converse span) |

We report per-variant means AND paired deltas (`stripped − raw`) with a
95% bootstrap CI. The primary win condition is: `stripped` matches or
beats `raw` on correctness/groundedness AND reduces input tokens by a
statistically significant margin.

## Running

```bash
cd ~/kibana
node scripts/evals start --suite agent-builder-context-noise \
  --model eis-claude-4-5-sonnet \
  --repetitions 3
```

`--repetitions 3` is important — the delta we're chasing is small
relative to run-to-run variance, so we need enough samples per (example,
variant) cell to distinguish signal from noise.
