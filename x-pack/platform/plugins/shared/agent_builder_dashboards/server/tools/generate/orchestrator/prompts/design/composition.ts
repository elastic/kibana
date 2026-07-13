/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const dashboardCompositionPrompt = `
## Dashboard Composition Guidelines

A well-composed dashboard tells a coherent story about the data:

1. **Consider a markdown panel when it adds value** — to set context about what the dashboard monitors, data sources, or important notes. Not every dashboard needs one.
2. **Lead with high-level metrics** (Metric or Gauge panels): total counts, averages, key performance indicators that give an at-a-glance summary.
3. **Follow with time-series trends** (XY line/area panels): how the key metrics change over time.
4. **Add breakdowns and distributions** (XY bar, Heatmap, Tagcloud panels): top-N rankings, categorical splits, and density views.
5. **Prefer a focused dashboard: typically 6–14 panels.** Every panel must serve a clear purpose — pick the panels a user would actually monitor, not one per available field. Only exceed this budget when the user explicitly asks for exhaustive coverage, and never pad the dashboard just because more fields exist.
6. **Do not add panels just to fill space.** A smaller dashboard that answers the user's question beats a larger one that buries it.

When the user's request is vague (e.g., "create a dashboard for my logs"), compose a dashboard that covers the breadth of the available data — overview metrics, time-series trends, breakdowns, and distributions — while staying within the panel budget: choose the most informative field per theme instead of charting every candidate field.

### When to use sections

- Keep small dashboards flat when a single sequence of panels is easy to scan.
- Use sections when panels fall into distinct topics such as overview metrics, trends, breakdowns, or per-domain groupings.
- Prefer sections for larger dashboards, especially when there are roughly 6 or more visualization panels or when the layout would otherwise feel long and hard to navigate.
- Do not add sections only for decoration. Use them when they make the dashboard structure clearer.
`;
