/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const gridLayoutPrompt = `## Panel Layout

Panels are placed on the 48-column grid described by each panel's \`grid\` field. On a 16:9 screen roughly 20–24 rows are visible, so the first 8–12 panels are what a reader sees before scrolling — put the panels that answer the question there.

### Grid sizes by chart type

Use these sizes — **do not make metric or gauge panels full-width**:

- **Metric** → \`w: 6, 8, or 12, h: 5–6\`. These are single-number panels — keep them **small**. Fit 4–8 per row.
  - 8 metrics in a row: each \`w: 6, h: 5\`
  - 6 metrics in a row: each \`w: 8, h: 5\`
  - 4 metrics in a row: each \`w: 12, h: 5\`
- **Gauge** → \`w: 12, h: 8\`. Fit up to 4 per row.
- **XY (line / area / bar)** → \`w: 24, h: 10\`. Use full-width (\`w: 48\`) for the primary time series.
- **Heatmap** → \`w: 24, h: 10\`. Needs height for the color matrix.
- **Tagcloud** → \`w: 24, h: 10\`.
- **Pie** → \`w: 12, h: 10\`.
- **Treemap / Waffle / Mosaic** → \`w: 24, h: 10\`.
- **Markdown** → \`w: 24–48, h: 4–9\`. Size based on content length and layout needs — not always full-width.
- **Datatable** → \`w: 24–48, h: 12–16\`. Prefer full-width so columns are readable.

Prefer \`w\` values that divide 48 evenly: **6, 8, 12, 24, 48**.

These sizes bind on \`update_panel_layouts\` too: moving a panel changes \`x\` and \`y\`, never \`w\` and \`h\`, unless the user asked for a resize.

**Grid Packing Rules:**

- **Eliminate Dead Space:** Always calculate the bottom edge (\`y + h\`) of every panel. When starting a new row or
  placing panels below a row, set the new row's \`y\` to **previous row's \`y + max(h)\`** across all panels in that row — do not use only one neighbor's \`y + h\`.
- **Align Row Heights:** If multiple panels are placed side-by-side in a row (e.g., sharing the same \`y\` coordinate),
  they should generally have the exact same height (\`h\`). If they do not, you must fill the resulting empty vertical
  space before placing the next full-width panel.

### Positioning rules

Panels should tile with no gaps:

1. **Fill rows left to right.** Start at \`x: 0\`. The next panel's \`x\` = previous panel's \`x + w\`. When a panel would exceed column 48, start a new row.
2. **New row \`y\`** = previous row's \`y + max(h)\` of all panels in that row.
3. **Same \`h\` per row** when possible, so rows align cleanly.
4. **When updating a dashboard**, inspect the existing panels' \`grid\` from the previous tool result. If there is empty space — a gap where a panel was removed, or unused columns beside a tall panel — place the new panel there instead of appending below, at whichever size from the list above fits.

### After removing a panel

Vertical gaps close by themselves, horizontal ones do not. So when \`remove_panels\` takes out a panel that had row-mates, include an \`update_panel_layouts\` in the same call that slides the rest of that row left, without being asked. Keep every panel at the size its chart type calls for: a row ending before column 48 is fine — better than stretching a panel to fill it.

### Sections and the outer grid

- When mixing top-level panels and sections, walk the outer grid in order: a top-level panel advances the next \`y\` by its own \`h\`, a section advances it by 1.
- **Inserting above an existing section:** top-level panels and sections share the outer grid coordinates, so a new panel at a \`y\` that a section already occupies collides with it and gets pushed below. To make room, \`remove_section\` (with \`panelAction: "promote"\` to keep its panels, or \`"delete"\` to discard them), re-add it with \`add_section\` at a higher \`y\`, then add the new panel at the freed \`y\`.`;
