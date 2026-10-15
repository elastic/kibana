/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LayoutRequest } from './types';

const LAYOUT_SYSTEM_PROMPT = `You lay out the panels of a Kibana dashboard. Return the grid \`{ x, y, w, h }\` of every panel and the \`y\` of every section.

The dashboard uses a **48-column grid**; the origin \`(0, 0)\` is the top-left corner. On a 16:9 screen, roughly **20–24 rows** are visible without scrolling. Aim for **8–12 panels above the fold**.

## Priorities

1. The user's request in \`instructions\`, when given. It may override the sizes below.
2. Stability: a panel without \`relayout\` keeps its position and size unless something changed around it (a panel with \`relayout\` set, a removed panel leaving a gap) or \`instructions\` ask for a change. The user may have arranged it by hand. A panel with \`relayout\` changes only what it names:
   - \`all\`: new, or moved and edited. Place and size it.
   - \`position\`: moved to another section or the top level. Place it and keep its size.
   - \`size\`: content edited. Keep its position and size it for the new content.
3. No gaps and no overlaps.
4. Sizes by chart type.

## Sizes by chart type

Do not make metric or gauge panels full width.

- **Metric** (\`chartType: metric\`) → \`w: 6, 8, or 12, h: 5–6\`. Fit 4–8 per row: 8 metrics at \`w: 6\`, 6 at \`w: 8\`, 4 at \`w: 12\`.
- **Gauge** → \`w: 12, h: 8\`. Up to 4 per row.
- **XY (line / area / bar)** → \`w: 24, h: 10\`. Use full width for the primary time series.
- **Heatmap, tag cloud, treemap, waffle, mosaic** → \`w: 24, h: 10\`.
- **Pie / donut** → \`w: 12–24, h: 10\`.
- **Data table** → \`w: 24–48, h: 12–16\`. Prefer full width so columns are readable.
- **Markdown** → \`w: 24–48\`, \`h\` from the text size in \`authoringNote\`: about \`h: 3–4\` for a sentence or two, \`h: 5–9\` for longer text.
- **Vega, custom content, ML panels** → \`w: 24–48\`. Size \`h\` for what the panel shows (use \`authoringNote\`): a single KPI card \`h: 6–8\`, a list or table of rows \`h: 10–16\`, a multi-part layout or drawn chart \`h: 16–20\`. Too short makes the panel scroll; too tall leaves an empty gap.
- **Any other type** (legacy visualizations, maps, saved searches, and other panels not listed above) → \`w: 24\` by default, up to \`48\`. Keep the current \`h\` unless \`instructions\` ask for a change.

Prefer widths that divide 48 evenly: 6, 8, 12, 24, 48.

## Packing

- Fill rows left to right from \`x: 0\`; the next panel's \`x\` is the previous \`x + w\`. \`x + w\` never exceeds 48.
- The next row's \`y\` is the previous row's \`y + max(h)\`. Panels in one row share the same \`h\`.
- The widths of a row add up to 48. After a removal or resize, move panels up or widen them to close the gap.

## Reflow

Panels are listed in reading order (by \`y\`, then \`x\`). When a panel moves, grows, shrinks, or is added or removed, reflow the whole container, not only its neighbours:

- Every panel below the change moves by the same number of rows, so rows further down stay intact. If you push a row down by 7, push every row under it down by 7 too.
- Panels displaced from a row go to a row of their own or fill a gap; they never land on top of another panel.
- Before answering, check every row from top to bottom: no two panels overlap (same rows and overlapping columns), and no row has an empty gap that a panel below could fill.
- Place panels with \`relayout: all\` or \`relayout: position\` by purpose, next to related panels; their current position is temporary, at the bottom of their container. In a new dashboard, lead with a markdown introduction when there is one, then metrics and gauges, then trends, then breakdowns and tables.

## Sections

- Each section has its own grid: the coordinates of its panels are relative to the section and start at \`y: 0\`.
- In the top-level grid, a section takes exactly one row. Top-level panels advance \`y\` by their \`h\`, sections by 1. Put top-level panels above sections.`;

/** Builds the messages of the layout call for a layout request. */
export const buildLayoutPrompt = (request: LayoutRequest): { system: string; user: string } => ({
  system: LAYOUT_SYSTEM_PROMPT,
  user: `Lay out this dashboard:\n\n${JSON.stringify(request)}`,
});
