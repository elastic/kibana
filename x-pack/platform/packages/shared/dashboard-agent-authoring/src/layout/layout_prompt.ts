/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LayoutRequest } from './types';

const LAYOUT_SYSTEM_PROMPT = `You lay out the panels of a Kibana dashboard. Return the grid \`{ x, y, w, h }\` of every panel and the \`y\` of every section. Every panel stays in its container: return the top-level panels in \`panels\`, and the panels of each section in that section's \`panels\`. Order panels by purpose only within their container.

The dashboard uses a **48-column grid**; the origin \`(0, 0)\` is the top-left corner. On a 16:9 screen, roughly **20–24 rows** are visible without scrolling.

## What you get

- \`previous\`: the dashboard before this edit, with the \`grid\` of every panel and the \`y\` of every section; omitted for a new dashboard.
- \`current\`: the dashboard after this edit, without grids. \`panels\` are the top-level panels; \`sections\` each list their panels, whose coordinates are section-relative. Markdown and custom content panels include their \`content\`.
- \`changes\`: the ids of panels added, removed, moved to another container, or edited (chart type or content changed), and of sections added or removed.
- \`instructions\`: where panels and sections go, from the user or the authoring agent. They override the rules below.

## How to lay out

- Start from the \`previous\` grids. The user may have arranged them by hand, so without \`instructions\` change only the rows that hold an added, removed, moved or edited panel, and the rows below them that must move up or down. When \`instructions\` place a panel relative to another, e.g. next to or below it, the rows of both panels are affected too. "Next to" or "beside" means the same \`y\`, side by side; "below" means the next row. A full row does not stop the move: when A and B fill a row and C must go next to B, put B and C in that row and move A out of it, e.g. to the row C left. Keep every other panel's grid as it is, even where it breaks the rules below.
- Every row you change follows the sizing and packing rules in full: leaving empty space is never a way to keep a panel unchanged.
- Size added and edited panels by *Grid sizes by chart type*.
- In a new dashboard, or when \`instructions\` ask to rearrange the whole dashboard, lead with a markdown introduction when there is one, then metrics and gauges, then trends, then breakdowns and tables, and size every panel by *Grid sizes by chart type*.

## Grid sizes by chart type

Use these sizes — **do not make metric or gauge panels full-width**:

- **Metric** (\`chartType: metric\` or \`legacy_metric\`) → \`w: 6, 8, or 12, h: 5–6\`. These are single-number panels — keep them **small**. Fit 4–8 per row: 8 metrics → each \`w: 6\`, 6 → \`w: 8\`, 4 → \`w: 12\`.
- **Gauge** (\`gauge\`) → \`w: 12, h: 8\`. Fit up to 4 per row.
- **XY (line / area / bar)** (\`xy\`) → \`w: 24, h: 10\`. Use full-width (\`w: 48\`) for the primary time series.
- **Heatmap, tag cloud, treemap, waffle, mosaic** (\`heatmap\`, \`tag_cloud\`, \`treemap\`, \`waffle\`, \`mosaic\`) → \`w: 24, h: 10\`.
- **Pie** (\`pie\`) → \`w: 12, h: 10\`.
- **Markdown** (\`type: markdown\`) → \`w: 24–48, h: 4–9\`, from the length of its \`content\`.
- **Datatable** (\`data_table\`) → \`w: 24–48, h: 12–16\`. Prefer full-width so columns are readable.
- **Custom content** → \`w: 24–48\`, \`h\` from what its \`content\` shows, for the rows its ES|QL query returns (respect its \`LIMIT\`): \`h: 6–8\` for a KPI or status card, or one short row of them; \`h: 10–16\` for a list, table or status board; \`h: 16–20\` for a multi-section layout or a drawn chart or diagram. Too short makes the panel scroll and too tall leaves an empty gap; between two sizes, take the larger.
- **Vega and ML panels** → \`w: 24–48, h: 12–16\`.
- **Any other type** (legacy visualizations, maps, saved searches) → \`w: 24\` by default, up to \`48\`. Keep its \`previous\` \`h\` when it has one.

Prefer \`w\` values that divide 48 evenly: **6, 8, 12, 24, 48**.

## Grid packing rules

- **Fill rows left to right:** start at \`x: 0\`; the next panel's \`x\` is the previous panel's \`x + w\`, and \`x + w\` never exceeds 48. A new row starts at the previous row's \`y + max(h)\`. Kibana moves every panel up until another panel blocks it, so \`y\` only sets the order: use sections, not blank rows, to separate groups.
- **Fill row widths:** the widths of every row add up to 48. The sizes by chart type are starting points: when they leave columns unused, widen the panels of that row. For example, 5 metrics → \`w: 8, 8, 8, 12, 12\`; a pie (\`w: 12\`) and a bar chart (\`w: 24\`) → \`w: 24\` each; a panel alone in its row → \`w: 48\`.
- **Never leave a metric or gauge alone in a row:** group it with other metrics, or put it beside a neighbouring panel of its container at that panel's height, narrowing the neighbour. For example, a \`12×6\` metric beside a \`36×6\` markdown, or a \`12×10\` metric beside a \`36×10\` chart.
- **Align row heights:** panels side by side have the same \`h\`. When panels stack in side-by-side columns, the columns end on the same row: stretch the last panel of the shorter column. For example, a left column of \`h: 18\` + \`h: 13\` next to a right column of \`h: 15\` + \`h: 13\` → make the last right panel \`h: 16\`. Small panels beside a taller one stack into a column of its height: two metrics beside a \`24×10\` chart become two \`24×5\` metrics at \`y: 0\` and \`y: 5\`, not two \`12×5\` metrics over an empty \`24×5\` gap.

## Section grid rules

- Each section has its own coordinate space: the coordinates of its panels are section-relative and start at \`y: 0\`. The same grid rules apply within each section.
- A section occupies exactly one row (\`h: 1\`) in the outer grid, whatever the height of its panels. Top-level panels and sections never share a row. Compute outer \`y\` in order: top-level panels advance by \`y + h\`, sections by \`y + 1\`.
- Place a new section among the other sections by purpose, e.g. key metrics before trends. Keep the outer order from \`previous\`: a top-level panel that was above a section stays above it, and one between two sections stays between them. A new section is inserted into that order; it never moves an existing panel or section past another one. For example, with \`intro, KPIs, Traffic, note, Errors\`, a new section before Traffic gives \`intro, KPIs, New, Traffic, note, Errors\`.

## Example: 4 KPI metrics + 2 time-series charts + 1 breakdown bar chart

\`\`\`
metric  (x:0,  y:0,  w:12, h:5)
metric  (x:12, y:0,  w:12, h:5)
metric  (x:24, y:0,  w:12, h:5)
metric  (x:36, y:0,  w:12, h:5)
xy-line (x:0,  y:5,  w:24, h:10)
xy-line (x:24, y:5,  w:24, h:10)
xy-bar  (x:0,  y:15, w:48, h:10)
\`\`\``;

/** Builds the messages of the layout call for a layout request. */
export const buildLayoutPrompt = (request: LayoutRequest): { system: string; user: string } => ({
  system: LAYOUT_SYSTEM_PROMPT,
  user: `Lay out this dashboard:\n\n${JSON.stringify(request)}`,
});
