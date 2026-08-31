# @kbn/evals-suite-agent-builder-visualizations

Offline LLM evals for **standalone visualization generation** in Agent Builder — the `visualization-creation` skill and the `platform.core.create_visualization` tool.

It drives the full `/api/agent_builder/converse` flow, extracts the ES|QL backing each generated visualization from the `create_visualization` tool result, and scores it.

## What it evaluates

Per [issue #277136](https://github.com/elastic/kibana/issues/277136), "correct" for visualization ES|QL is not the same as for analytical ES|QL. The suite covers:

- **ES|QL Execution Validity** (`CODE`) — AST parse + execute against real sample data and return rows. This is the tier that surfaces the fast-model regressions that motivated the suite.
- **ES|QL Functional Equivalence** (`LLM` calibrated judge) — three-point rubric (`equivalent` / `equivalent_with_caveats` / `not_equivalent`) for *logical* equivalence. Column alias wording is never scored (including `1-minute` vs `1-Minute Load`).
- **Chart Type vs Intent** (`CODE`) — `create_visualization`'s `chart_type` matches the example's expected type (bar/line → `xy`, KPI → `metric`, …).
- **Renderer vs Intent** (`CODE`) — `renderer` matches when the example declares `lens` or `vega` (skipped otherwise).
- **Visualization Config Validity** (`CODE`) — Lens configs parse against the chart-type ESQL schema; Vega-Lite specs parse as JSON with a visual root.
- **Chart Compatible Result** (`CODE`) — executed ES|QL column shape fits the chart type (e.g. `xy` needs a dimension + numeric measure).
- **Trajectory** — the agent routed the request to `load_skill` → `platform.core.create_visualization`.
- **Trace-based** — tokens / latency / tool-call counts from OTel spans.

A standalone ES|QL Validity evaluator also exists in this suite (`createEsqlValidityEvaluator`) but is not in the default set — execution already covers AST validation.

Not yet covered (tracked as follow-up increments in the issue): renderer-vs-intent examples, negative/recovery cases, iterative edits, and an MLLM visual-fidelity judge.

## Running

```bash
node scripts/evals start --suite agent-builder-visualizations --model <connector> --judge <connector>
# or, when a stack is already running:
node scripts/evals run --suite agent-builder-visualizations
```

## Dataset

Seed examples live inline in `evals/visualization_creation/visualization_creation.spec.ts` (~17 prompts):

- **logs** (`kibana_sample_data_logs`): xy (bar/line/horizontal/multi-series), metric, gauge, pie, tag_cloud, data_table, heatmap, treemap, plus one Vega-Lite scatter
- **ecommerce** (`kibana_sample_data_ecommerce`): metric / pie / xy over `order_date` + numeric revenue/quantity fields
- **host metrics** (GCS otel-demo replay): multi-series load averages on `metrics-system.load-default`

Each positive example carries ground-truth ES|QL and (for Lens) an expected `chartType`. Negatives / recovery / multi-turn edits are still follow-ups.

**Gold queries follow the agent's idiom** (see `agent-builder-visualizations-server/shared/esql_instructions.ts`):

- **Categorical / metric** golds include the raw-`@timestamp` time filter (`WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend`).
- **Time-series** golds express the window via the auto-bucket-count form (`BUCKET(@timestamp, 75, ?_tstart, ?_tend)` / `TBUCKET(75, ?_tstart, ?_tend)`); an extra `@timestamp` WHERE is optional and stripped before equivalence scoring.

This keeps gold and candidate structurally parallel so the equivalence evaluators measure real differences instead of cosmetic ones. The `?_tstart` / `?_tend` bind params substitute to a **now-relative** window (see `src/evaluators/esql_bind_params.ts`), which brackets both `kibana_sample_data_logs` and the GCS snapshot replay data (whose timestamps are shifted to end at `now` by the replay pipeline).

### OTel data fixture

`src/fixtures/replay.ts` uses `@kbn/es-snapshot-loader` to replay the shared OTel Demo snapshot from `gs://obs-ai-datasets/otel-demo/payment-service-failures` — the same bucket and vault credentials as `@kbn/evals-suite-observability-ai`. No custom snapshot needed; no separate GCS setup required.

The snapshot contains OTel Demo logs, metrics, and traces. After first replay, check what `metrics-*` streams actually landed and adjust the CPU-load example accordingly:

```bash
GET metrics-*/_field_caps?fields=system.cpu.*,@timestamp
GET _data_stream/metrics-*
```
