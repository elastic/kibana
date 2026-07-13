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

- **Metric** → \`w: 8–16, h: 5–6\`. These are single-number panels — keep them **small**. Fit 3–6 per row.
  - 6 metrics in a row: each \`w: 8, h: 5\`
  - 4 metrics in a row: each \`w: 12, h: 5\`
  - 3 metrics in a row: each \`w: 16, h: 6\`
- **Gauge** → \`w: 12–16, h: 9–12\`. Gauges need extra vertical space for the dial, but should still stay compact. Fit 3–4 per row.
  - 4 gauges in a row: each \`w: 12, h: 9\`
  - 3 gauges in a row: each \`w: 16, h: 10–12\`
- **XY (line / area / bar)** → \`w: 24, h: 10–12\`.
- **Heatmap** → \`w: 24–48, h: 10–12\`. Needs height for the color matrix.
- **Tagcloud** → \`w: 24, h: 8–10\`.
- **Pie / Treemap / Waffle / Mosaic** → \`w: 24, h: 10–12\`.
- **Markdown** → \`w: 24–48, h: 4–9\`. Size based on content length and layout needs — not always full-width.
- **Datatable** → \`w: 48, h: 12–16\`. Full-width so columns are readable.

Prefer \`w\` values that divide 48 evenly: **8, 12, 16, 24, 48**.

**Grid Packing Rules:**

- **Compose in full-width horizontal bands.** A band is one row of panels of the same kind that all share the same \`y\` and the same \`h\` (a KPI band of metrics, a trends band of XY charts, a full-width table band). Finish one band, then start the next directly below it.
- **Eliminate Dead Space between bands:** the next band's \`y\` = previous band's \`y + h\`. Never leave a full-width empty strip between bands.
- **Keep bands homogeneous.** Never mix panel kinds of different heights in one band — in particular, never place a taller chart beside KPI metrics to fill out their row. The two-column "masonry" look (independent left/right stacks with different heights) is wrong; bands must span the layout horizontally.
- **Trailing space inside a band is fine.** If a band's panels do not fill all 48 columns, leave the remaining columns empty. Prefer adding one more genuinely useful panel of the same kind (e.g. another KPI metric) when the data supports it — but NEVER stretch panels beyond their recommended width, and NEVER fill the remainder with a different panel kind.

### Positioning rules

Always set \`x\` and \`y\` so bands stack with **no vertical gaps**:

1. **Fill bands left to right.** Start at \`x: 0\`. The next panel's \`x\` = previous panel's \`x + w\`. When a panel would exceed column 48, start a new band.
2. **New band \`y\`** = previous band's \`y + h\`.
3. **Same \`h\` for every panel in a band**, so bands align cleanly.
4. Panels' \`x + w\` must never exceed 48.
5. **When updating a dashboard**, inspect the existing panels' \`grid\` from the previous tool result. If a removal left a hole in a band, place a new panel of the same kind there instead of appending below. Do not slot an unrelated panel kind into a hole just to fill it.
6. **Markdown panels** use agent-specified \`grid\` like any other panel. Size based on content length (\`w: 24–48, h: 4–9\`). Account for their height when positioning subsequent bands.

### Reflow after removals

- If removing a panel leaves a gap in a row, shift the affected neighboring panels left by re-adding them with updated \`x\` values.
- If removing a panel leaves later rows with unnecessary empty space above them, re-add the affected panels with updated \`y\` values.

### Section grid rules

- When using \`add_section\`, each section has its own coordinate space.
- Panels nested under \`add_section.panels\` use that same section-relative coordinate space.
- Panel coordinates inside a section are section-relative: each section starts at \`y: 0\`. The same 48-column grid and sizing guidance apply within each section.
- A section occupies exactly one row (\`h: 1\`) in the outer dashboard grid. When placing widgets after a section, compute the next outer \`y\` as \`section.grid.y + 1\` (not by summing internal panel heights).
- Internal section panel heights affect layout inside the section only; they do not increase the section's outer-grid height.
- When mixing top-level panels and sections, compute outer \`y\` sequentially: top-level panels advance by \`y + h\`, sections advance by \`y + 1\`.
- **Inserting above existing sections:** Top-level panels and sections share the same outer grid coordinates. If a section occupies \`y: 0\`, a new top-level panel at \`y: 0\` will collide and be pushed **below** the section. To place a panel above an existing section, first \`remove_section\` (with \`panelAction: "promote"\` or \`"delete"\`) and re-add it via \`add_section\` at a higher \`y\` to make room, then add the panel at the freed \`y\`.

### Example: 4 KPI metrics + 2 time-series charts + 1 breakdown bar chart

\`\`\`
metric  (x:0,  y:0,  w:12, h:5)
metric  (x:12, y:0,  w:12, h:5)
metric  (x:24, y:0,  w:12, h:5)
metric  (x:36, y:0,  w:12, h:5)
xy-line (x:0,  y:5,  w:24, h:10)
xy-line (x:24, y:5,  w:24, h:10)
xy-bar  (x:0,  y:15, w:48, h:10)
\`\`\`

### Example: only 2 KPI metrics available — leave the band's remainder empty

\`\`\`
metric  (x:0,  y:0,  w:12, h:5)
metric  (x:12, y:0,  w:12, h:5)
(columns 24–48 of the KPI band stay empty — do NOT stretch the metrics and do NOT
place a chart beside them)
xy-line (x:0,  y:5,  w:24, h:10)
xy-line (x:24, y:5,  w:24, h:10)
\`\`\``;
