# Prettify mutates only findings and layout

The single mutate in a Prettify session may:

- pack every panel via `update_panel_layouts` from a complete `pack_layout` finding
- hide a panel chrome title (`hide_title`) when it duplicates the visualization's inner title
- strip an invented metric background (`clear_metric_fill`) and add a sparkline on a sparse KPI (`metric_trendline`)
- add sections on a **flat** dashboard (`add_section` with a client `id`) and move existing panels into them
- `edit_panels` only for invert (`wrong_chart_type`), one-category charts (`one_category_chart` → metric or pie), and at most three variety changes (`monotone_chart_types`)
- `add_controls` for missing dropdowns whose field and index already appear in catalog ES|QL

It must not restyle every Lens panel through the inner visualization agent, must not add or remove visualization panels unless the user already agreed to adds, must not rebuild existing sections, and must not remove controls.

An inner planner chooses how to batch those payload suggestions into `operations[]`. The generate core applies them. Findings suggest generate fields; they are not a deterministic mapper.

Blanket restyle, from-scratch redesign, and isolated per-panel size nits were tried; they cost inner LLM calls and left holes in the grid.
