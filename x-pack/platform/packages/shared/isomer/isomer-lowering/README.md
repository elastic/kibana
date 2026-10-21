# @kbn/isomer-lowering

Lowers Kibana dashboards and their panels to Isomer compositions. This package is ported from Alembic's `charts-convert` (`alembic-poc` `packages/convert-kibana` at `cbf8ad6`). Kibana's copy is now the source of truth, and Alembic derives from it.

- **`convertDashboard`** plans a dashboard from its saved objects (`_export` NDJSON) and runs each panel's queries through the caller's `executeEsql` and `search`. It binds every panel to a node, or returns an outcome that says why it couldn't. Panels bind as follows:
  - Lens xy, metric, partition, heatmap and gauge panels become charts pack nodes;
  - data tables become the components pack's `table`;
  - Markdown panels become `markdown`;
  - Vega panels become the Vega pack's `vega`, with their data inlined;
  - Maps panels become the maps pack's `map`.
- **`planDashboard` and `bindChartsDashboard`** are the two steps underneath: plan the queries, then bind their rows. The package never runs a query itself.
- **`engineHintFromLens`** turns the converter's Lens-shaped presentation hints into the Elastic Charts engine's.

Differences from the source:

- The ECharts binder (`bind.ts`) is gone. Its ES|QL response types and Lens value formatting are in `esql_response.ts`.
- Alembic's `Tone` and cross-filter selection types are defined locally.
- `add_vega_panels.ts` and `add_map_panels.ts` have become `vega_panels.ts` and `map_panels.ts`.
- Data tables bind to `table` instead of being refused.
- Tests run on Jest. `plan_snapshot.test.ts` compares against the recorded Vitest file snapshots byte for byte.

Demo lane only (`demo/lowering`). F10 and F11 re-cut this package as PRs.
