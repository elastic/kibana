# Decision model benchmark (temporary)

> Temporary: kept with [#302821](https://github.com/elastic/kibana/pull/302821) to back its benchmark results. Delete this folder before anything here is merged.

Compares the decision providers behind `decisions.decide()` on 24 cases with a known answer, 3 runs each:

- **Jev 1.13** through Elasticsearch and EIS (`.typesafe-jev-1.13_decision` on QA), or through OpenRouter's Decisions API directly.
- **The fast model**, Gemini 3.5 Flash Lite, with the prompt and answer schema of `server/services/decisions/providers/fast_model.ts`, through OpenRouter's chat completions API (EIS chat endpoints answered 403 on the test cluster).

## Files

| File | What it is |
|---|---|
| `decision_cases.mjs` | The 24 cases: 6 yes/no (`should_respond`, P1–P6), 6 where only the agent's description decides (D1–D6), 6 pick-one (`pick_skill`) and 6 score (`reasoning_effort`), each with its expected answer |
| `run_decision_benchmark.mjs` | Runs the cases and writes a results file |
| `report_decision_benchmark.mjs` | Turns results into the Markdown tables and Mermaid charts in the PR description |
| `compare_prompts.mjs` | Compares the fast model's prompt before and after the calibration change |
| `compare_should_respond.mjs` | Compares the `should_respond` instruction variants on P1–P6 and D1–D6 |
| `capture_jev_examples.mjs` | Captures raw Jev request/response pairs from OpenRouter |
| `results.json` | Jev through OpenRouter and the fast model with its original prompt (2026-11-03) |
| `results_calibrated.json` | The fast model with the calibrated prompt (2026-11-03) |
| `results_jev_eis.json` | Jev through EIS (2026-11-05) |
| `jev_examples.json` | Raw Jev calls through OpenRouter (2026-11-03) |
| `results_scope_*.json` | P1–P6 and D1–D6 with each `should_respond` variant, Jev through EIS and the calibrated fast model (2026-11-05) |
| `report.md` | The main report: Jev through EIS and the calibrated fast model, on P, C and S cases |
| `report_should_respond.md` | The `should_respond` instruction comparison |

## Running it

Run from the repo root.

- **Jev through EIS** needs Elasticsearch on `localhost:9200` (`elastic`/`changeme`) connected to EIS QA.
- **The OpenRouter routes** need an OpenRouter key, read from `apiKey:` in `config/kibana.dev.yml`. The key is never printed or written out.

```bash
# Jev through EIS
MODELS=jev_eis OUTPUT=results_jev_eis.json node x-pack/platform/plugins/shared/agent_builder/benchmarks/decisions/run_decision_benchmark.mjs 3

# The fast model with the calibrated prompt
PROMPT=calibrated MODELS=fast_model OUTPUT=results_calibrated.json node x-pack/platform/plugins/shared/agent_builder/benchmarks/decisions/run_decision_benchmark.mjs 3

# Regenerate the report
node x-pack/platform/plugins/shared/agent_builder/benchmarks/decisions/report_decision_benchmark.mjs > x-pack/platform/plugins/shared/agent_builder/benchmarks/decisions/report.md
```

Options, all optional:

- `MODELS`: `jev` (OpenRouter), `jev_eis` and `fast_model`, comma-separated. Without it, `jev` and `fast_model` run.
- `CASES`: case ids or id prefixes, comma-separated, such as `P,D`.
- `SHOULD_RESPOND`: the `should_respond` instructions. The default, `scoped_mention_unless`, matches `build_trigger_decision_input.ts`; `current`, `scoped` and `scoped_mention` are the earlier wordings.
- `PROMPT=calibrated`: the fast model's calibrated prompt, which matches `fast_model.ts`.
