# Dashboard Review is canvas-scoped

Dashboard Review must judge packing, sections, chart-type mix, and missing filters at dashboard scope. Per-panel `disproportionate_size` findings made Prettify resize two widgets and leave the rest of the grid untouched.

v1 findings: `pack_layout` (every panel, or drop the finding; shrink too-tall xy / stretched KPIs / oversized pies; widen clipped legends), `weak_sections` (flat dashboards only), `monotone_chart_types` (≤3, majority one family), `wrong_chart_type` (invert), `one_category_chart` (one-bar → metric or pie, ≤3), `weak_controls` (add-only, catalog ES|QL fields), `duplicate_inner_title` (hide panel chrome when it repeats the inner vis title), `metric_fill` (invented metric background only), `thin_metric` (sparse KPI → trendline, ≤4). Incomplete layout plans are dropped on the server; other findings may still apply.

`add_section` accepts an optional `id` so one generate can create sections and move existing panels in the same operations batch.
