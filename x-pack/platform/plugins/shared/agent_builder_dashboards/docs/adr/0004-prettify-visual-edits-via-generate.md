# Prettify visual edits go through Generate, not layout flags

The single mutate in a Prettify session may pack the grid (`update_panel_layouts`: grid + section moves only), add sections and move existing panels into them, `edit_panels` with a natural-language query for every visual change (the visualization author decides how to apply it), add charts for variety or title intent, and add controls whose field and index already appear in panel ES|QL.

It must not put visual edits on layout, must not remove visualization panels, must not rebuild existing sections, and must not remove controls. Whether to keep a panel's ES|QL is the model's call (`edit_panels.esql`); the server does not guess.

Layout flags (`hide_title`, `clear_metric_fill`, `metric_trendline`) and a structured findings catalog were tried; they forked Generate and still needed the vis author for real Lens edits.
