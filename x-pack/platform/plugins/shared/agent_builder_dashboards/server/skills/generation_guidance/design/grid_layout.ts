/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const gridLayoutPrompt = `## Panel Layout

The dashboard uses a **48-column grid**. On a 16:9 screen, roughly **20–24 rows** are visible without scrolling. Aim for **8–12 panels above the fold**.

Every \`add_panels.panels[]\` item and every \`add_section.panels[]\` item requires \`grid: { x, y, w, h }\`. The origin \`(0, 0)\` is the top-left corner.

### Grid sizes by chart type

Use these sizes — **do not make metric or gauge panels full-width**:

- **Metric** → \`w: 6, 8, or 12, h: 5–6\`. These are single-number panels — keep them **small**. Fit 4–8 per row.
  - 8 metrics in a row: each \`w: 6, h: 5\`
  - 6 metrics in a row: each \`w: 8, h: 5\`
  - 4 metrics in a row: each \`w: 12, h: 5\`
- **Metric with breakdown** → \`w: 12, h: 8–12\`. Needs room for the breakdown tiles — larger than a single KPI. Do not keep these at \`w: 6\`.
- **Gauge** → \`w: 12, h: 8\`. Fit up to 4 per row.
- **XY (line / area / bar)** → \`w: 24, h: 10\`.
- **Heatmap** → \`w: 24, h: 10\`.
- **Tagcloud** → \`w: 24, h: 10\`.
- **Pie** → \`w: 12 or 24, h: 10\`.
- **Region map** → \`w: 24, h: 10\`. Stay at least 24 wide.
- **Treemap / Waffle / Mosaic** → \`w: 24, h: 10\`.
- **Markdown** → \`w: 24–48, h: 4–9\`. Size based on content length and layout needs — not always full-width.
- **Datatable** → \`w: 48, h: 12–16\` on its own row so columns are readable. \`w: 24\` only when sharing a row with another half-width panel. Never narrower than \`w: 24\` — \`w: 16\` is wrong. Do not shrink a table to fill a leftover sliver; give it its own row instead.

Prefer \`w\` values that divide 48 evenly: **6, 8, 12, 24, 48**.

**Grid Packing Rules:**

- **Pack comparable panels evenly:** Prefer equal widths and heights within a row. A lone trend or table may use the full width. A sparse final KPI/gauge row may leave trailing space; keep its panels equally sized rather than stretching only the last one. Never add charts just to fill a row.
- **Eliminate Dead Space:** Always calculate the bottom edge (\`y + h\`) of every panel. When starting a new row or
  placing panels below a row, set the new row's \`y\` to **previous row's \`y + max(h)\`** across all panels in that row — do not use only one neighbor's \`y + h\`.
- **Align Row Heights:** If multiple panels are placed side-by-side in a row (e.g., sharing the same \`y\` coordinate),
  they should generally have the exact same height (\`h\`). If they do not, you must fill the resulting empty vertical
  space before placing the next full-width panel.

### Positioning rules

Avoid interior gaps and overlaps; trailing space on sparse KPI rows is allowed:

1. **Fill rows left to right.** Start at \`x: 0\`. The next panel's \`x\` = previous panel's \`x + w\`. When a panel would exceed column 48, start a new row.
2. **New row \`y\`** = previous row's \`y + max(h)\` of all panels in that row.
3. **Same \`h\` per row** when possible, so rows align cleanly.
4. Panels' \`x + w\` must never exceed 48.
5. **When updating a dashboard**, inspect the existing panels' \`grid\` from the previous tool result. If there is empty space (a gap where a panel was removed, or unused columns beside a tall panel), place the new panel in that gap instead of appending below — but never fill a KPI-row gap with a different chart type (table, trend, pie), and never drop a datatable into a gap narrower than \`w: 24\`. Start a new row instead. Choose \`w\` and \`h\` to fit the available space.
6. **Markdown panels** use agent-specified \`grid\` like any other panel. Size based on content length (\`w: 24–48, h: 4–9\`). Account for their height when positioning subsequent panels.

### Reflow after removals

- If removing a panel leaves a gap in a row, shift the affected neighboring panels left with \`update_panel_layouts\` and updated \`x\` values.
- If removing a panel leaves later rows with unnecessary empty space above them, move the affected panels with \`update_panel_layouts\` and updated \`y\` values.
- On update or prettify, inspect the whole dashboard but reflow only affected rows and sections. Preserve already-good placement.
- Do not invent custom packing: never leave a hole under a shorter panel, never stretch a table or trend to fill leftover height next to KPIs. Put KPIs in one even row; other chart types start on the next row.

### Section grid rules

- When using \`add_section\`, each section has its own coordinate space.
- Panels nested under \`add_section.panels\` use that same section-relative coordinate space.
- When moving panels into a section with \`update_panel_layouts\`, panel \`grid\` is section-relative (same as \`add_section.panels\`).
- Panel coordinates inside a section are section-relative: each section starts at \`y: 0\`. The same 48-column grid and sizing guidance apply within each section.
- A section occupies exactly one row (\`h: 1\`) in the outer dashboard grid. When placing widgets after a section, compute the next outer \`y\` as \`section.grid.y + 1\` (not by summing internal panel heights).
- Internal section panel heights affect layout inside the section only; they do not increase the section's outer-grid height.
- When mixing top-level panels and sections, compute outer \`y\` sequentially: top-level panels advance by \`y + h\`, sections advance by \`y + 1\`.
- **Inserting above existing sections:** Top-level panels and sections share the same outer grid coordinates. If a section occupies \`y: 0\`, a new top-level panel at \`y: 0\` will collide and be pushed **below** the section. To place a panel above an existing section, first \`remove_section\` (with \`panelAction: "promote"\` or \`"delete"\`) and re-add it via \`add_section\` at a higher \`y\` to make room, then add the panel at the freed \`y\`.

### Example: 4 KPI metrics + 2 time-series charts + 1 breakdown bar chart

The last \`xy-bar\` is alone on its row, so it stretches to \`w: 48\`.

\`\`\`
metric  (x:0,  y:0,  w:12, h:5)
metric  (x:12, y:0,  w:12, h:5)
metric  (x:24, y:0,  w:12, h:5)
metric  (x:36, y:0,  w:12, h:5)
xy-line (x:0,  y:5,  w:24, h:10)
xy-line (x:24, y:5,  w:24, h:10)
xy-bar  (x:0,  y:15, w:48, h:10)
\`\`\``;
