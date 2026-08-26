# Pack the whole canvas, not two widgets

The outer agent must judge packing, sections, chart-type mix, and missing filters at dashboard scope. Per-panel size nits that resize two widgets and leave the rest of the grid untouched were a Prettify failure mode.

Layout should carry a complete packed grid (and section moves). Incomplete packs leave holes. Visual changes stay on panel edits.
