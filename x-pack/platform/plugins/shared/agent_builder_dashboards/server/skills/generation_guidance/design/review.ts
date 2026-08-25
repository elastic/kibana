/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { panelSizeReferencePromptContent } from './panel_sizes';

/**
 * Review-side counterpart of the authoring guidance in composition.ts and
 * grid_layout.ts: the same design rules restated as observable defects a judge
 * can verify from panel grid facts, with the how-to-edit procedures stripped.
 * Keep the criteria aligned with those files when the authoring rules change.
 */
export const dashboardDesignReviewPrompt = `## Design Review Criteria

The dashboard uses a **48-column grid**; roughly 20–24 rows are visible without scrolling on a 16:9 screen. Panels inside a section use section-relative coordinates (each section starts at \`y: 0\`), and a section always occupies a single row of the outer grid regardless of its content height — so only compare grid values between panels sharing a coordinate space (the outer grid, or one section).

### Reference panel sizes by chart type

Panels were authored against these sizes:

${panelSizeReferencePromptContent}

### Layout defects

Check the grid values of panels sharing a coordinate space and report:

- **Overlaps** — two panels' rectangles intersect. The renderer resolves collisions by pushing panels down, so the layout a viewer sees no longer matches the authored positions.
- **Out of bounds** — a panel with \`x + w > 48\`.
- **Dead space** — a gap where nothing renders: a row starting past \`x: 0\`, unused columns at the end of a row, or a \`y\` that leaves empty rows below the panels above.
- **Ragged rows** — side-by-side panels (same \`y\`) with different heights, leaving unfilled space beside the shorter ones.
- **Wrong size for the chart type** — dimensions far from the reference above, especially full-width or oversized metric/gauge panels and datatables too narrow to read.

### Composition

A well-composed dashboard reads top-down as a story: high-level KPIs (metric/gauge) first, then time-series trends, then breakdowns and distributions. Report:

- **Inverted ordering** — detail breakdowns placed above the overview metrics they elaborate on.
- **Redundant panels** — panels answering the same question with no added insight.
- **Missing or decorative structure** — a long flat dashboard (roughly 6+ visualization panels spanning distinct topics) that sections would make easier to navigate, or sections that add no grouping value.
- **Purposeless panels** — a panel with no clear role relative to the rest of the dashboard.`;
