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

Let the data decide how many panels that comes to. A rich set of fields deserves a rich dashboard, and a vague request such as "create a dashboard for my logs" is a reason to explore the index mapping and cover the breadth of what is there rather than to ship a minimal set. A panel that tells the reader nothing is still noise, however, so every one should earn its space.

### When to use sections

- Keep small dashboards flat when a single sequence of panels is easy to scan.
- Use sections when panels fall into distinct topics such as overview metrics, trends, breakdowns, or per-domain groupings.
- Prefer sections for larger dashboards, especially when there are roughly 6 or more visualization panels or when the layout would otherwise feel long and hard to navigate.
- Do not add sections only for decoration. Use them when they make the dashboard structure clearer.
`;
