# @kbn/evals-suite-agent-builder-visualizations

Offline LLM evals for **standalone visualization generation** in Agent Builder — the `visualization-creation` skill and the `platform.core.create_visualization` tool.

It drives the full `/api/agent_builder/converse` flow, extracts the ES|QL backing each generated visualization from the `create_visualization` tool result, and scores it.

## What it evaluates

Per [issue #277136](https://github.com/elastic/kibana/issues/277136), "correct" for visualization ES|QL is not the same as for analytical ES|QL. The suite covers:

- **ES|QL Execution Validity** (`CODE`) — AST parse + execute against real sample data and return rows. This is the tier that surfaces the fast-model regressions that motivated the suite.
- **ES|QL Functional Equivalence** (`LLM` calibrated judge) — three-point rubric (`equivalent` / `equivalent_with_caveats` / `not_equivalent`) for *logical* equivalence. Column alias wording is never scored (including `1-minute` vs `1-Minute Load`).
- **Chart Type vs Intent** (`LLM` judge) — does the produced chart *form* (Lens `chart_type`, xy layer series types, Vega mark) satisfy the user's request? The gold `config.type` / `layers[].type` / `spec.mark` is handed to the judge as a reference for intent, not an exact target, so `bar_stacked` satisfies "a bar chart" and a `circle` mark satisfies a scatter.
- **Renderer vs Intent** (`CODE`) — `renderer` matches when the example declares `lens` or `vega` (skipped otherwise).
- **Visualization Config Validity** (`CODE`) — Lens configs parse against the chart-type ESQL schema; Vega-Lite specs parse as JSON with a visual root.
- **Visualization Config vs Intent** (`CODE`) — generated Lens/Vega config matches the gold partial Config API: column roles (alias-tolerant), Vega encoding fields, and any plain values the gold spells out. Scored as the fraction of gold leaf assertions that hold, with each mismatch listed in metadata, so one wrong field does not zero the example. `type` and `mark` are left to the Chart Type vs Intent judge; column alias wording is always ignored.
- **Chart Compatible Result** (`CODE`) — executed ES|QL column shape fits the chart type (e.g. `xy` needs a dimension + numeric measure).
- **Trajectory** — the agent routed the request to `load_skill` → `platform.core.create_visualization`.
- **Trace-based** — tokens / latency / tool-call counts from OTel spans.

Evaluators that have nothing to check for an example (no gold renderer, chart form, or structural config) return `score: null` with label `skipped`, so they drop out of averages instead of inflating them.

A standalone ES|QL Validity evaluator also exists in this suite (`createEsqlValidityEvaluator`) but is not in the default set — execution already covers AST validation.

Not yet covered (tracked as follow-up increments in the issue): renderer-vs-intent examples, negative/recovery cases, iterative edits, and an MLLM visual-fidelity judge.

## Running

```bash
node scripts/evals start --suite agent-builder-visualizations --model <connector> --judge <connector>
# or, when a stack is already running:
node scripts/evals run --suite agent-builder-visualizations
```

## Dataset

Seed examples live in `evals/visualization_creation/datasets/`, one file per data source, concatenated by `datasets/index.ts` (~17 prompts):

- **logs** (`kibana_sample_data_logs`): xy (bar/line/horizontal/multi-series), metric, gauge, pie, tag_cloud, data_table, heatmap, treemap, plus one Vega-Lite scatter
- **ecommerce** (`kibana_sample_data_ecommerce`): metric / pie / xy over `order_date` + numeric revenue/quantity fields
- **host metrics** (synthtrace Beats load fixture): multi-series load averages on `metrics-system.load-default`

Each positive example carries a partial Lens Config API gold (`config`): chart `type`, layer type / column roles, and ground-truth ES|QL nested in `data_source.query`. Examples are built with the factories in `datasets/factories.ts` (`xyExample`, `metricExample`, `partitionExample`, …) over the query builders `categoricalQuery`, `timeSeriesQuery`, and `totalsQuery`, so adding an example is one call and every gold query follows the same idiom by construction.|QL nested in `data_source.query`. Negatives / recovery / multi-turn edits are still follow-ups.

### What a gold `config` can assert

The gold is split between two evaluators. Chart Type vs Intent (LLM) reads `type`, `layers[].type`, and `spec.mark` and asks a judge whether the produced chart form satisfies the prompt, with the gold as a reference for intent. Config vs Intent (code) walks every other leaf and turns it into one deterministic assertion. Keys the gold does not mention are never checked, so the gold only needs to spell out what the prompt actually pins down.

| Gold leaf | Evaluator | How it is compared | Example |
| --- | --- | --- | --- |
| `type` / `mark` | Chart Type vs Intent (LLM) | judge decides whether the produced form is the kind of chart the user asked for; `['a', 'b']` lists acceptable alternatives | `type: 'xy'`, `layers[0].type: ['bar', 'bar_horizontal']`, Vega `mark: 'point'` |
| `{ column }` / `{ field }` | Config vs Intent | resolved through the ES\|QL alias map, so wording differs freely | gold `y: [{ column: 'Request Count' }]` matches actual `y: [{ column: 'count' }]` when both alias `COUNT(*)` |
| any other string | Config vs Intent | strict equality, case-sensitive | `title: 'Total Requests'` |
| number / boolean / null | Config vs Intent | strict equality | `sampling: 1`, `ignore_global_filters: false` |
| array of objects | Config vs Intent | each gold item is paired with the best-fitting unused actual item; extra actual items are fine | gold `y: [{ column: 'Request Count' }]` passes against actual `y: [count, bytes]` |
| `data_source` | ES\|QL evaluators | skipped by both of the above | — |

Worked examples against the bar-chart gold above (Config vs Intent sees `x` + `y[0]` = 2 leaves; the judge sees `xy` + `bar | bar_horizontal`):

- Actual is a `bar` layer with `x: response` and `y: count` over `STATS count = COUNT(*) BY response` → Config 2/2. `response` vs `response.keyword` and `count` vs `Request Count` are alias-tolerant. Judge: satisfies.
- Actual is a `bar_stacked` layer with the same columns → Config 2/2. Judge: satisfies, since the prompt only said "bar chart".
- Actual is a `line` layer with the same columns → Config 2/2. Judge: does not satisfy, the prompt asked for bars.
- Actual is `xy` with no `layers` at all → Config 0/2, both column leaves reported as missing. Judge sees an empty layer list.
- Actual `y: [{ column: 'total' }]` over `STATS total = SUM(bytes) BY response.keyword` → Config 1/2, `y[0]` fails because `total` resolves to `SUM(bytes)`, not `COUNT(*)`.
- Gold is only `{ type: 'metric', data_source }` → Config vs Intent skips (nothing left to check); only the judge scores.

Column resolution follows one alias hop inside `STATS` and `EVAL`, tolerates `.keyword` twins, `COUNT()` / `COUNT(*)`, `HOUR()` / `DATE_EXTRACT("HOUR_OF_DAY", …)`, and treats any `BUCKET` / `TBUCKET` as the same time axis. It does not follow `RENAME` or chained aliases (`EVAL a = … | STATS b = AVG(a)`).

**Gold queries follow the agent's idiom** (see `agent-builder-visualizations-server/shared/esql_instructions.ts`):

- **Categorical / metric** golds include the raw-`@timestamp` time filter (`WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend`).
- **Time-series** golds express the window via the auto-bucket-count form (`BUCKET(@timestamp, 75, ?_tstart, ?_tend)` / `TBUCKET(75, ?_tstart, ?_tend)`); an extra `@timestamp` WHERE is optional and stripped before equivalence scoring.

This keeps gold and candidate structurally parallel so the equivalence evaluators measure real differences instead of cosmetic ones. The `?_tstart` / `?_tend` bind params substitute to a **now-relative** window (see `src/evaluators/esql_bind_params.ts`), which brackets both `kibana_sample_data_logs` and the synthtrace host-load fixture.

### Host-load fixture

`src/fixtures/host_load_metrics.ts` uses `@kbn/synthtrace` to write Beats `system.load.{1,5,15}` documents for host `viz-eval-host` into `metrics-system.load-default`. `beforeAll` throws if that stream is missing or empty after seeding.

Cleanup only removes what the fixture wrote. If the data stream did not exist before seeding, `afterAll` deletes it; if it already existed (a cluster with real Metricbeat data), `afterAll` deletes only the `viz-eval-host` documents and leaves the rest untouched. Seeding into a pre-existing stream logs a warning, since the load averages the agent computes will include the pre-existing documents.
