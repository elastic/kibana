# @kbn/evals-suite-agent-builder-visualizations

Offline LLM evals for **standalone visualization generation** in Agent Builder — the `visualization-creation` skill and the `platform.core.create_visualization` tool.

It drives the full `/api/agent_builder/converse` flow, extracts the ES|QL backing each generated visualization from the `create_visualization` tool result, and scores it.

## What it evaluates

Per [issue #277136](https://github.com/elastic/kibana/issues/277136), "correct" for visualization ES|QL is not the same as for analytical ES|QL. This first increment covers:

- **Visualization skill activated** (`CODE`) — the request loaded the visualization skill and called `platform.core.create_visualization` (guards against the agent answering with raw ES|QL / a table instead of a rendered visualization).
- **ES|QL Validity** (`CODE`) — the generated query parses via `@kbn/esql-language`.
- **ES|QL Execution Validity** (`CODE`) — the query executes against real sample data and (per example) returns rows. This is the tier that surfaces the fast-model regressions that motivated the suite.
- **ES|QL Functional Equivalence** (`LLM` judge) — the generated query is equivalent to the ground-truth query. Uses a calibrated three-point rubric (`equivalent` / `equivalent_with_caveats` / `not_equivalent`) with explicit allow/deny lists, ported from `@kbn/evals-suite-security-esql-generation-regression`, so cosmetic differences (aliases, interchangeable bucketing, `?_tstart`/`?_tend` vs literal ranges) earn partial credit rather than a hard 0.
- **ES|QL Result Equivalence** (`CODE`) — executes gold + candidate and compares result rows via Jaccard similarity (row-order- and float-tolerant); a deterministic complement to the LLM judge.
- **Trajectory** — the agent routed the request to `load_skill` → `platform.core.create_visualization`.
- **Trace-based** — tokens / latency / tool-call counts from OTel spans.

Not yet covered (tracked as follow-up increments in the issue): chart-compatible-result (does the ES|QL result shape fit the requested chart type), chart-type-vs-intent, Lens/Vega-Lite config validity, and an MLLM visual-fidelity judge.

## Running

```bash
node scripts/evals start --suite agent-builder-visualizations --model <connector> --judge <connector>
# or, when a stack is already running:
node scripts/evals run --suite agent-builder-visualizations
```

## Dataset

Seed examples live inline in `evals/visualization_creation/visualization_creation.spec.ts` and target the `kibana_sample_data_logs` index (loaded in `beforeAll`). Grow this to 20–30 real prompts with ground-truth ES|QL and expected chart types.

## Notes

The ES|QL validity, execution, result-equivalence, and calibrated functional-equivalence evaluators plus the `?_tstart` / `?_tend` bind-param substitution are copied from `@kbn/evals-suite-security-esql-generation-regression` because Kibana module-visibility rules forbid importing across sibling `functional-tests` suites. If a third suite needs them, consider promoting them into `@kbn/evals` (which already exports the v1 `createEsqlEquivalenceEvaluator`).
