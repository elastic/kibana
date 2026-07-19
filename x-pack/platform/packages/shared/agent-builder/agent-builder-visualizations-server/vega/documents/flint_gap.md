# Flint vs Agent Builder Vega — gap analysis

Reference: [microsoft/flint-chart](https://github.com/microsoft/flint-chart) (MIT).  
Compared against Agent Builder Vega (`chart_type_registry` / `chart_types/*`) and Lens (`lens/chart_type_registry.ts`).

## What Flint is

Flint is an **intermediate chart language**: agents emit a compact `ChartAssemblyInput` (`chartType` + encodings + optional `semantic_types`), then a compiler (`assembleVegaLite` / ECharts / Chart.js) produces a polished native spec.

Main gains:

1. **Smaller agent surface** — model picks type + encodings, not a full Vega-Lite tree.
2. **Compiler-owned polish** — layout, label budgets, cardinality truncation, defaults live in code.
3. **Semantic typing** — field meaning drives scale/format/color more stably than column-name guessing.
4. **Closed template catalog** — every supported chart is a compile target.

Flint is **not** Kibana-aware: no ES|QL `%type%: esql` binding, no Kibana theme/panel autosize, no Raw Vega assembler.

## Catalog sizes (different jobs)

| Surface | Closed set | Role |
|--------|------------|------|
| Flint Vega-Lite | ~34 templates | Every chart an agent may pick → deterministic VL |
| Agent Builder Vega VL | 6 structural skeletons | Hard shapes only; basics often freeform VL |
| Agent Builder Vega Raw | 3 (`sunburst`, `radar`, `sankey`) | Allowlisted Raw diagrams |
| Lens (Agent Builder) | metric, gauge, tag_cloud, xy, region_map, heatmap, data_table, pie, treemap, waffle, mosaic | Default path for most standard charts |

## Our Vega closed templates today

**Vega-Lite reference skeletons**

- `layered_combo_dual_axis`
- `faceted_small_multiples`
- `scatter_bubble`
- `heatmap`
- `timeline_gantt`
- `calendar_heatmap`

**Raw Vega allowlist**

- `sunburst`
- `radar`
- `sankey`

## Flint Vega-Lite templates (~34)

From `packages/flint-js/src/vegalite/templates/` (grouped by their registry categories):

| Category | Charts |
|----------|--------|
| Points | Scatter Plot, Regression, Connected Scatter Plot, Ranged Dot Plot, Strip Plot |
| Bars | Bar Chart, Grouped Bar Chart, Stacked Bar Chart, Lollipop Chart, Waterfall Chart, Gantt Chart, Bullet Chart |
| Distributions | Histogram, Density Plot, ECDF Plot, Violin Plot, Boxplot, Pyramid Chart, Candlestick Chart |
| Lines & Areas | Line Chart, Sparkline, Bump Chart, Slope Chart, Area Chart, Streamgraph, Range Area Chart |
| Circular | Pie Chart, Rose Chart, Radar Chart |
| Tables & Maps | Heatmap, Bar Table, KPI Card, Map, Choropleth |

Faceting in Flint is typically a **channel on many templates**, not a separate “faceted small multiples” type.

## Flint has (VL), we don’t (as Vega templates)

Specialty / statistical / unusual marks:

| Cluster | Examples |
|---------|----------|
| Distributions | Histogram, Density, ECDF, Violin, Boxplot, Pyramid |
| Ranking / change | Bump, Slope, Waterfall, Lollipop, Bullet |
| Financial / range | Candlestick, Range area, Ranged dot |
| Circular extras | Rose, Pie, Radar *(their VL radar, not our Raw radar)* |
| Compact / KPI | Sparkline, KPI card, Bar table |
| Geo | Map, Choropleth |
| Variants of basics | Grouped/stacked bar, Area, Streamgraph, Regression, Connected scatter, Strip plot |

Many of these are already covered product-wise by **Lens** (XY, pie, heatmap, metric/KPI, maps, etc.) when the agent chooses `renderer: "lens"`.

## We have (or cover) that Flint VL doesn’t

| Ours | Notes |
|------|--------|
| `layered_combo_dual_axis` | Dual-axis combo — not in Flint VL list |
| `calendar_heatmap` | Week × weekday grid — Flint VL has heatmap, not this calendar form |
| `faceted_small_multiples` | Explicit skeleton; Flint folds facet into encodings |
| Raw `sunburst` / `sankey` | Flint has these on **ECharts**, not VL — not usable for Kibana Vega as-is |
| Raw `radar` | Kibana-tuned Raw path; Flint VL radar is a different product |

## Kibana integration constraints (if using the package)

| Concern | Reality |
|---------|---------|
| Data binding | Must post-process: replace Flint `data` with Kibana ES\|QL url, then `normalizeVegaSpec` / validate |
| Layout | Flint uses `baseSize` / `canvasSize`; Kibana wants fit-to-panel — strip fixed width/height |
| Theme | Flint color schemes ≠ Elastic theme |
| Raw Vega | No `assembleVega` — does not replace Dialect gate / Raw allowlist |
| Edits | Stored artifact is a Vega spec; round-tripping Flint IR vs patching VL is an open product choice |
| Process | New MIT npm dep → OSS/legal + security review; pin VL schema vs Kibana |

## Structural gap (more important than chart names)

Flint’s unique bit is not “more chart names” — it is that **every type is a compile target** (IR → deterministic VL).

Our Vega path only closes hard cases; bar/line/etc. still rely on the model writing Vega-Lite JSON (optionally nudged by reference examples). Lens already owns most standard chart types for Agent Builder.

## Recommendation

- **Do not adopt Flint wholesale** unless a spike proves the layout/semantic compiler is worth the dependency and Kibana post-processing cost.
- **Steal ideas in-house** where useful:
  - compact IR (`chartType` + encodings) → template assemblers
  - map ES\|QL column types → encoding `type` / format
  - deterministic post-passes (sizing, cardinality, labelLimit)
- Grow closed Vega templates only for charts that are **product goals beyond Lens** (e.g. waterfall, streamgraph, bump, dual-axis, calendar) — do not chase Flint’s full VL list by default.
- Keep Raw Vega registry work for sunburst / radar / sankey; Flint ECharts templates do not help that path.

## Suggested next step (optional)

Short spike, throwaway branch: sample ES|QL rows → `assembleVegaLite` for a few types → bind ES|QL + normalize + validate in Kibana. Go/no-go on dependency vs ideas-only IR assemblers.
