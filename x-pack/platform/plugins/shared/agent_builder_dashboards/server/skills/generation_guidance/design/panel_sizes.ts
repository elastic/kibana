/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Reference panel sizes per chart type on the 48-column grid. Shared between the
 * authoring guidance (grid_layout.ts) and the review criteria (review.ts) so the
 * generator and the judge never disagree on what a well-sized panel looks like.
 */
export const panelSizeReferencePromptContent = `- **Metric** → \`w: 6, 8, or 12, h: 5–6\`. Single-number panels — keep them **small**; 4–8 fit per row (8 × \`w: 6\`, 6 × \`w: 8\`, 4 × \`w: 12\`).
- **Gauge** → \`w: 12, h: 8\`. Up to 4 per row.
- **XY (line / area / bar)** → \`w: 24, h: 10\`. Full-width (\`w: 48\`) for the primary time series.
- **Heatmap** → \`w: 24, h: 10\`. Needs height for the color matrix.
- **Tagcloud** → \`w: 24, h: 10\`.
- **Pie** → \`w: 12, h: 10\`.
- **Treemap / Waffle / Mosaic** → \`w: 24, h: 10\`.
- **Markdown** → \`w: 24–48, h: 4–9\`, sized to content length — not always full-width.
- **Datatable** → \`w: 24–48, h: 12–16\`. Prefer full-width so columns are readable.

Prefer \`w\` values that divide 48 evenly: **6, 8, 12, 24, 48**.`;
