/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReferencedContent } from '@kbn/agent-builder-server/skills/type_definition';
import { dashboardTools } from '../../../common';
import { DASHBOARD_DESIGN_PRACTICES_REFERENCE_NAME } from '../generation_guidance/design';

export const PRETTIFY_RULES_REFERENCE_NAME = 'prettify-rules';

/**
 * Hard Prettify rules plus how to separate them from the agent's own inventions.
 * Composition and grid live in dashboard-design-practices — do not fork them.
 */
export const prettifyRulesPrompt = `## Prettify findings

Look at the painted screenshot first. Use the full dashboard attachment for panel ids, ES|QL, chart types, grid, and whether an edit needs new columns. Divide every finding into one of two buckets and say which bucket it is.

- **Hard rule** — a violation of the rules below. Fix these.
- **Creative** — something you noticed yourself that would make the dashboard clearer or richer. Title intent vs painted content belongs here. Expand existing charts rather than deleting them.

Prefer modify and expand. Do not remove visualization panels. Do not invent broken ES|QL.

## Hard rules — dashboard

- **Controls.** Add useful \`options_list_control\` dropdowns when panel ES|QL has unused low-cardinality fields (service, host, env, status). Field and index must appear in existing ES|QL. Do not remove controls.
- **Sections.** When there are many panels or distinct topics, organize into collapsible sections. Follow the "When to use sections" guidance in referenced \`${DASHBOARD_DESIGN_PRACTICES_REFERENCE_NAME}\`.
- **Grid.** Follow Panel Layout and Grid Packing Rules in referenced \`${DASHBOARD_DESIGN_PRACTICES_REFERENCE_NAME}\`. Concrete violations:
  - Three metrics alone on the top row look stretched — use metric \`w: 6–12\`, \`h: 5–6\`, and 4–8 KPIs per row when the data supports it.
  - Charts that are too tall — XY/heatmap around \`h: 10\`, not 20+.
  - Gaps — pack every row; widths in a row sum to 48; side-by-side panels share height.
  - Markdown height should fit its content (\`h: 4–9\`) and never exceed 9.
- **Chart variety.** A dashboard of one family (all lines, all metrics) is a hard-rule miss. Convert lines to areas when a filled series would read better. Convert a metric to pie/donut when the data is a part-to-whole. Add more charts when the screenshot and ES|QL support a missing breakdown or trend. Do not delete charts to create variety.
- **Colors.** Do not invent colors. For bar and pie charts use the Default palette. Invented metric static colors and BACKGROUND fills must be removed — always \`edit_panels\` those metrics, even if you are not otherwise changing them.
- **Wrong chart type.** A bar/xy with a single category (one bar) should be a pie.

## Hard rules — panel

- **Metric.** NEVER show the dashboard chrome title on a metric. The painted title is the primary metric name. A lone number on white is almost always a miss. In most cases, enrich the metric with something interesting from the **same index / existing ES|QL**: a secondary metric with dynamic coloring (compare to the primary or a baseline — e.g. previous period, error rate next to request count, p95 next to avg), and/or a background chart (sparkline, or a bar complementary viz when progress-to-max is meaningful). If the secondary is a trend (period-over-period, delta, or paired with a sparkline), it must not have a title — hide \`styling.secondary.label\`. Describe that wanted edition in \`edit_panels.query\` and let the visualization author apply it. Skip adding a new secondary or sparkline only if the panel already has one, or the query truly has no complementary field — still edit the panel if it has an invented static or background color. Color the value or the secondary compare — do not invent or keep a static BACKGROUND fill. Do not invent a second index.
- **XY.** ALWAYS prefer gradient area fills over solid (\`areas.fill: "gradient"\`). If there is only one series, hide the legend. Otherwise default the legend to the bottom with LIST layout (not grid) and include useful, well-formatted legend stats. Always hide axis titles.
- **Table.** Set width from the number of columns (\`w: 24–48\`). More columns → closer to 48. Never shrink a table below 24.

## Creative inventions

Judge these from the screenshot and the dashboard title. They are not automatic, and skipping them is valid.

- **Intent.** If the title says one story (e.g. "Security overview") and the painted charts tell another, say so. Fix by retargeting or adding charts that match the title, not by deleting what is already useful.
- Other visual improvements the screenshot suggests: clipped legends, unreadable labels, a missing filter the ES|QL already has a field for, a sparse canvas that should grow.

When applying, call \`${dashboardTools.generateDashboard}\` once. Typical batch:

1. \`add_section\` when organizing many panels into topics.
2. \`update_panel_layouts\` only for a packed grid (and section moves). Do not put visual edits on this operation.
3. \`edit_panels\` (\`source: "request"\`) with a natural-language \`query\` for every visual change and let the visualization author decide how to apply it: hide metric chrome titles, strip invented metric fills, add secondary metrics with dynamic coloring and/or a background chart (and hide the secondary title when that secondary is a trend), \`chartType\` changes (line→area, one-bar→pie, metric→pie/donut), gradient area fills, Default palette on bar/pie, hide a one-series legend, bottom LIST legend with useful stats, hide axis titles. Read each panel's existing ES|QL from the dashboard attachment. If the edition does not need new columns, pass that query on \`esql\` unchanged (schema-only). Omit \`esql\` only when a complementary number or different grouping requires new columns.
4. \`add_panels\` only to add charts for variety or to match title intent. Do not \`remove_panels\` visualization panels.
5. \`add_controls\` for missing useful filters.`;

export const prettifyRulesReference: ReferencedContent = {
  name: PRETTIFY_RULES_REFERENCE_NAME,
  relativePath: '.',
  content: prettifyRulesPrompt,
};
