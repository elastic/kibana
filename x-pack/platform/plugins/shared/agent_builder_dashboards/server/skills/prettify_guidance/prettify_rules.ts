/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReferencedContent } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { dashboardTools } from '../../../common';
import { DASHBOARD_DESIGN_PRACTICES_REFERENCE_NAME } from '../generation_guidance/design';

export const PRETTIFY_RULES_REFERENCE_NAME = 'prettify-rules';

/**
 * Hard Prettify rules plus how to separate them from the agent's own inventions.
 * Composition and grid live in dashboard-design-practices — do not fork them.
 */
export const prettifyRulesPrompt = `## Prettify findings

Look at the painted screenshot first. Use the full dashboard attachment for panel ids, ES|QL, chart types, grid, control queries, and whether an edit needs new columns. Divide every finding into one of two buckets. These buckets are for you — never show them to the user.

- **Hard rule** — a violation of the rules below. Fix these.
- **Creative** — something you noticed yourself that would make the dashboard clearer or richer. Title intent vs painted content belongs here. Expand existing charts rather than deleting them.

When you talk to the user, use a few sentences of plain language about what will look different (e.g. "I'll shrink the note at the top and hide the legends on the charts — each has only one series."). Do not quote grid units (\`w\`/\`h\`), Lens fields, ES|QL, or tool operations. Do not list findings you are skipping.

Prefer modify and expand. Do not remove visualization panels. Do not invent broken ES|QL.

## Hard rules — dashboard

- **Controls.** A control showing an error in the screenshot is a hard-rule miss — the field is not in this index. Confirm every control field with \`${platformCoreTools.getIndexMapping}\` on the panel \`FROM\` index. \`remove_controls\` any whose \`field_name\` is missing from the mapping; \`add_controls\` only for unused low-cardinality fields that appear in existing panel ES|QL **and** in that mapping. Never invent ECS field names. Do not remove working controls.
- **Sections.** When there are many panels or distinct topics, organize into collapsible sections. Follow the "When to use sections" guidance in referenced \`${DASHBOARD_DESIGN_PRACTICES_REFERENCE_NAME}\`.
- **Grid.** Follow Panel Layout and Grid Packing Rules in referenced \`${DASHBOARD_DESIGN_PRACTICES_REFERENCE_NAME}\`. Concrete violations:
  - Three metrics alone on the top row look stretched — use metric \`w: 6–12\`, \`h: 5–6\`, and 4–8 KPIs per row when the data supports it.
  - Charts that are too tall — XY/heatmap around \`h: 10\`, not 20+.
  - XY charts that span the full row — always \`w: 24\` (half the grid), two per row.
  - Gaps — pack every row; widths in a row sum to 48; side-by-side panels share height.
  - Markdown height should fit its content (\`h: 4–9\`) and never exceed 9.
- **Chart variety.** A dashboard of one family (all lines, all metrics) is a hard-rule miss. Convert lines to areas when a filled series would read better. Convert a metric to pie/donut when the data is a part-to-whole. Add more charts when the screenshot and ES|QL support a missing breakdown or trend. Do not delete charts to create variety.
- **Colors.** Do not invent colors. Custom colors that do not add meaning must be removed on pie, table, XY, and metric. Use the Default palette. Invented metric static colors and BACKGROUND fills must be removed — always \`edit_panels\` those panels, even if you are not otherwise changing them.
- **Wrong chart type.** A bar/xy with a single category (one bar) should be a pie.

## Hard rules — panel

- **Metric.** NEVER show the dashboard chrome title on a metric. A lone number on white is a miss. In most cases, enrich the metric from the same ES|QL (secondary metric with dynamic coloring and/or a background chart). If the secondary is a trend, it must not have a title. Invented static colors and BACKGROUND fills must be removed. Describe that wanted edition in \`edit_panels.query\` and let the visualization author apply it. Do not invent a second index.
- **XY.** ALWAYS prefer gradient area fills over solid. Hide the legend when there is one series; otherwise put it at the bottom as a grid with useful stats. Always hide axis titles. Describe that wanted edition in \`edit_panels.query\` and let the visualization author apply it.
- **Table.** Set width from the number of columns (\`w: 24–48\`). More columns → closer to 48. Never shrink a table below 24.

## Creative inventions

Judge these from the screenshot and the dashboard title. They are not automatic, and skipping them is valid.

- **Intent.** If the title says one story (e.g. "Security overview") and the painted charts tell another, say so. Fix by retargeting or adding charts that match the title, not by deleting what is already useful.
- Other visual improvements the screenshot suggests: clipped legends, unreadable labels, a missing filter the ES|QL already has a field for, a sparse canvas that should grow.

When applying, call \`${dashboardTools.generateDashboard}\` once. Typical batch:

1. \`add_section\` without \`panels\` (pass \`id\`) when organizing existing panels into topics — never copy existing panel configs into \`add_section.panels\` (that duplicates them).
2. \`update_panel_layouts\` to pack the grid **and move** those panels into the new section via \`sectionId\`. Do not put visual edits on this operation.
3. \`edit_panels\` (\`source: "request"\`) with a natural-language \`query\` for every visual change and let the visualization author apply the chart-type config rules (metric chrome title, fills, secondary/background, \`chartType\`, gradient, legend, axes, Default palette). Read each panel's existing ES|QL from the dashboard attachment. If the edition does not need new columns, pass that query on \`esql\` unchanged (schema-only). Omit \`esql\` only when a complementary number or different grouping requires new columns.
4. \`add_panels\` only to add charts for variety or to match title intent. Do not \`remove_panels\` visualization panels.
5. \`remove_controls\` for fields not in the index mapping, then \`add_controls\` for missing useful filters on mapped fields.`;

export const prettifyRulesReference: ReferencedContent = {
  name: PRETTIFY_RULES_REFERENCE_NAME,
  relativePath: '.',
  content: prettifyRulesPrompt,
};
