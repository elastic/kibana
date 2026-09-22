# @kbn/evals-suite-agent-builder-visualizations

Offline LLM evals for **standalone visualization generation** in Agent Builder — the `visualization-creation` skill and the `platform.core.create_visualization` tool.

It drives the full `/api/agent_builder/converse` flow, extracts the ES|QL backing each generated visualization from the `create_visualization` tool result, and scores it.

## What it evaluates

Per [issue #277136](https://github.com/elastic/kibana/issues/277136), "correct" for visualization ES|QL is not the same as for analytical ES|QL. The suite covers:

- **ES|QL Execution Validity** (`CODE`) — AST parse + execute against real sample data and return rows. This is the tier that surfaces the fast-model regressions that motivated the suite.
- **ES|QL Functional Equivalence** (`LLM` calibrated judge) — three-point rubric (`equivalent` / `equivalent_with_caveats` / `not_equivalent`) for *logical* equivalence. Column alias wording is never scored (including `1-minute` vs `1-Minute Load`).
- **Chart Type vs Intent** (`CODE`) — `create_visualization`'s `chart_type` matches the example's gold `config.type` (bar/line → `xy`, KPI → `metric`, …).
- **Renderer vs Intent** (`CODE`) — `renderer` matches when the example declares `lens` or `vega` (skipped otherwise).
- **Visualization Config Validity** (`CODE`) — Lens configs parse against the chart-type ESQL schema; Vega-Lite specs parse as JSON with a visual root.
- **Visualization Config vs Intent** (`CODE`) — generated Lens/Vega config matches the gold partial Config API: layer type, column roles (alias-tolerant), Vega mark/encodings. Scored as the fraction of gold leaf assertions that hold, with each mismatch listed in metadata, so one wrong field does not zero the example. Column alias wording is always ignored; titles, styling, and other keys are only checked when the gold spells them out.
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
- **host metrics** (synthtrace Beats load fixture): multi-series load averages on `metrics-system.load-default`

Each positive example carries a partial Lens Config API gold (`config`): chart `type`, layer type / column roles, and ground-truth ES|QL nested in `data_source.query`. Negatives / recovery / multi-turn edits are still follow-ups.

### What a gold `config` can assert

Config vs Intent walks the gold object and turns every leaf into one assertion. Keys the gold does not mention are never checked, so the gold only needs to spell out what the prompt actually pins down.

| Gold leaf | How it is compared | Example |
| --- | --- | --- |
| `type`-style string | case-insensitive, `['a', 'b']` means either | `type: 'xy'`, `layers[0].type: ['bar', 'bar_horizontal']`, Vega `mark: 'point'` (also accepts `circle`) |
| `{ column }` / `{ field }` | resolved through the ES\|QL alias map, so wording differs freely | gold `y: [{ column: 'Request Count' }]` matches actual `y: [{ column: 'count' }]` when both alias `COUNT(*)` |
| number / boolean / null | strict equality | `sampling: 1`, `ignore_global_filters: false` |
| array of objects | each gold item is paired with the best-fitting unused actual item; extra actual items are fine | gold `y: [{ column: 'Request Count' }]` passes against actual `y: [count, bytes]` |
| `data_source` | skipped here; the query is scored by the ES\|QL evaluators instead | — |

Worked examples against the bar-chart gold above (`type` + layer `type` + `x` + `y[0]` = 4 leaves):

- Actual is a `bar` layer with `x: response` and `y: count` over `STATS count = COUNT(*) BY response` → 4/4, score 1. `response` vs `response.keyword` and `count` vs `Request Count` are alias-tolerant.
- Actual is a `line` layer with the same columns → 3/4, score 0.75, mismatch `layers[0].type: expected bar | bar_horizontal, got line`.
- Actual is `xy` with no `layers` at all → 1/4, score 0.25; every leaf under `layers[0]` is reported individually.
- Actual is a `pie` → the top-level `type` fails and `layers` is absent, so 0/4. Chart Type vs Intent also reports the type mismatch, so a wrong chart type is penalised twice by design.
- Actual `y: [{ column: 'total' }]` over `STATS total = SUM(bytes) BY response.keyword` → `y[0]` fails because `total` resolves to `SUM(bytes)`, not `COUNT(*)`.

Column resolution follows one alias hop inside `STATS` and `EVAL`, tolerates `.keyword` twins, `COUNT()` / `COUNT(*)`, `HOUR()` / `DATE_EXTRACT("HOUR_OF_DAY", …)`, and treats any `BUCKET` / `TBUCKET` as the same time axis. It does not follow `RENAME` or chained aliases (`EVAL a = … | STATS b = AVG(a)`).

**Gold queries follow the agent's idiom** (see `agent-builder-visualizations-server/shared/esql_instructions.ts`):

- **Categorical / metric** golds include the raw-`@timestamp` time filter (`WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend`).
- **Time-series** golds express the window via the auto-bucket-count form (`BUCKET(@timestamp, 75, ?_tstart, ?_tend)` / `TBUCKET(75, ?_tstart, ?_tend)`); an extra `@timestamp` WHERE is optional and stripped before equivalence scoring.

This keeps gold and candidate structurally parallel so the equivalence evaluators measure real differences instead of cosmetic ones. The `?_tstart` / `?_tend` bind params substitute to a **now-relative** window (see `src/evaluators/esql_bind_params.ts`), which brackets both `kibana_sample_data_logs` and the synthtrace host-load fixture.

### Host-load fixture

`src/fixtures/host_load_metrics.ts` uses `@kbn/synthtrace` to write Beats `system.load.{1,5,15}` documents into `metrics-system.load-default`. `beforeAll` throws if that stream is missing or empty after seeding.
