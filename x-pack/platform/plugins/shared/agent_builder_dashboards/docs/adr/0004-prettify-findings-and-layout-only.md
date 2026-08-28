# Prettify visual edits go through generate, not layout flags

The single mutate in a Prettify session may:

- pack every panel via `update_panel_layouts` (grid + section moves only)
- add sections on a **flat** dashboard (`add_section` with a client `id`) and move existing panels into them
- `edit_panels` (`source: "request"`) with a natural-language `query` for every visual change; the visualization author decides how to apply it (hide metric chrome titles, strip invented fills, secondary metrics, chartType, palettes, legends)
- `add_panels` to add charts for variety or title intent
- `add_controls` for missing dropdowns whose field and index already appear in panel ES|QL

It must not put visual edits on `update_panel_layouts`, must not remove visualization panels, must not rebuild existing sections, and must not remove controls. Schema-only vis edits should reuse the existing panel ES|QL.

Layout flags (`hide_title`, `clear_metric_fill`, `metric_trendline`) and a structured findings catalog were tried; they forked generate and still needed the vis author for real Lens edits.
