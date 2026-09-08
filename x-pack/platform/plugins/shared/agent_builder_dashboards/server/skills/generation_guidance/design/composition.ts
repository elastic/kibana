/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const dashboardCompositionPrompt = `
## Dashboard Composition Guidelines

A well-composed dashboard orders panels as summary metrics → trends → breakdowns and distributions:

1. **Consider a markdown panel when it adds value** — to set context about what the dashboard monitors, data sources, or important notes. Not every dashboard needs one.
2. **Lead with high-level metrics** (Metric or Gauge panels): total counts, averages, key performance indicators that give an at-a-glance summary.
3. **Follow with time-series trends** (XY line/area panels): how the key metrics change over time.
4. **Follow with breakdowns and distributions** (XY bar, Heatmap, Tagcloud, or ranking tables): top-N rankings, categorical splits, and density views. A table of top countries belongs here, not with summary metrics.
5. **Include as many panels as are valuable for the underlying data and user intent.** Let the richness and diversity of the available fields drive the panel count instead of a fixed numeric target.
6. **Every panel should serve a clear purpose.** Do not add panels just to fill space, but do not artificially limit the dashboard when more panels would provide genuine insight.

When the user's request is vague (e.g., "create a dashboard for my logs"), explore the discovered index mapping thoroughly and compose a rich dashboard that covers the breadth of the available data — overview metrics, time-series trends, breakdowns, and distributions. Let the fields drive the panel count rather than defaulting to a minimal set.

### When to use sections

- Keep small dashboards flat when a single sequence of panels is easy to scan.
- Use sections to separate summary metrics, trends, and breakdowns in that order. Each section must contain only panels matching its purpose: a "Key metrics" section contains summary Metric/Gauge panels, not time-series charts or ranking tables.
- Use per-domain sections when they make the dashboard clearer; keep summary metrics → trends → breakdowns ordered within each domain.
- Prefer sections for larger dashboards, especially when there are roughly 6 or more visualization panels or when the layout would otherwise feel long and hard to navigate.
- Do not add sections only for decoration. Use them when they make the dashboard structure clearer.
`;
