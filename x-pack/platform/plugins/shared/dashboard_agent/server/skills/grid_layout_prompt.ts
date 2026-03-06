/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const gridLayoutPrompt = `## Panel Layout

The dashboard uses a **48-column grid**. On a 16:9 screen, roughly **20–24 rows** are visible without scrolling. Aim for **8–12 panels above the fold**.

Every \`add_panels_from_attachments\` item requires \`grid: { x, y, w, h }\`. The origin \`(0, 0)\` is the top-left corner.

### Grid sizes by chart type

Use these sizes — **do not make metric or gauge panels full-width**:

- **Metric / Gauge** → \`w: 8–16, h: 5–6\`. These are single-number panels — keep them **small**. Fit 3–6 per row.
  - 6 metrics in a row: each \`w: 8, h: 5\`
  - 4 metrics in a row: each \`w: 12, h: 5\`
  - 3 metrics in a row: each \`w: 16, h: 6\`
- **XY (line / area / bar)** → \`w: 24, h: 10–12\` (half-width) or \`w: 48, h: 14–16\` (full-width for primary time series).
- **Heatmap** → \`w: 24–48, h: 10–12\`. Needs height for the color matrix.
- **Tagcloud** → \`w: 24, h: 8–10\`.
- **Pie / Treemap / Waffle / Mosaic** → \`w: 24, h: 10–12\`.
- **Datatable** → \`w: 48, h: 12–16\`. Full-width so columns are readable.

Prefer \`w\` values that divide 48 evenly: **8, 12, 16, 24, 48**.

### Positioning rules

Always set \`x\` and \`y\` so panels tile with **no gaps**:

1. **Fill rows left to right.** Start at \`x: 0\`. The next panel's \`x\` = previous panel's \`x + w\`. When a panel would exceed column 48, start a new row.
2. **New row \`y\`** = previous row's \`y + max(h)\` of all panels in that row.
3. **Same \`h\` per row** when possible, so rows align cleanly.
4. Panels' \`x + w\` must never exceed 48.
5. **When updating a dashboard**, inspect the existing panels' \`grid\` from the previous tool result. If there is empty space (a gap where a panel was removed, or unused columns beside a tall panel), place the new panel in that gap instead of appending below. Choose \`w\` and \`h\` to fit the available space.
6. **Markdown panels** are auto-sized by \`upsert_markdown\` to \`w: 48, h: 4–9\` (based on content length). Account for this height when positioning the first row of visualization panels below the markdown.

### Example: 4 KPI metrics + 2 time-series charts + 1 breakdown bar chart

\`\`\`
metric  (x:0,  y:0,  w:12, h:5)
metric  (x:12, y:0,  w:12, h:5)
metric  (x:24, y:0,  w:12, h:5)
metric  (x:36, y:0,  w:12, h:5)
xy-line (x:0,  y:5,  w:24, h:10)
xy-line (x:24, y:5,  w:24, h:10)
xy-bar  (x:0,  y:15, w:48, h:10)
\`\`\``;
