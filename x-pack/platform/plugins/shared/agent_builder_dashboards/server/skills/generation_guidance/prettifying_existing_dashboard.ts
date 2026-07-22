/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReferencedContent } from '@kbn/agent-builder-server/skills/type_definition';

/**
 * On-demand guidance for explicit prettify / polish requests. Kept out of the main skill
 * body so routine create/edit flows are not biased toward a full redesign pass.
 */
export const prettifyingExistingDashboardReference: ReferencedContent = {
  name: 'prettifying-existing-dashboard',
  relativePath: './references',
  content: `# Prettifying an Existing Dashboard

Strong default: do not set \`prettifyPanelConfigs\`. Dashboards created or extended through normal generation already follow chart best practices, so refreshing those configs adds cost and can churn good results.

Set \`prettifyPanelConfigs: true\` only when the user explicitly asks to prettify, polish, or clean up an existing dashboard, or to improve its visualization configs. Do not set it for new dashboards, adding panels, pure layout or metadata changes, or routine panel edits without explicit prettify intent.

## What \`prettifyPanelConfigs\` does

\`prettifyPanelConfigs: true\` tells the generation tool to re-run surviving pre-existing ES|QL Lens panels through the **inner visualization agent**, which refreshes their Lens chart configs while preserving analysis intent, chart type, and ES|QL. The flag does not perform composition or layout work. Newly generated panels already go through that same inner agent, so they do not need this flag.

Do **not** reason about chart configuration details yourself — colors, palettes, axis titles, legend placement, metric formatting, and similar Lens styling choices live in the inner visualization agent. Set \`prettifyPanelConfigs: true\` and let the tool refresh configs; do not emit \`edit_panels\` solely to hand-tune chart configs. Only plan composition and layout changes when the dashboard does not already meet the quality bar below.

When the tool result includes \`configGeneratorChanges\`, briefly mention those panel improvements in your reply. Use the returned summaries as-is; do not invent additional chart-config details.

Before any prettify \`generate_dashboard\` call, call \`ask_user_question\` alone and wait for the answer. Ask **How should I prettify this dashboard?** with two options: **Improve existing charts only**, which uses \`prettifyPanelConfigs: true\` with empty \`operations\` and skips the design pass; and **Improve existing charts and add useful new ones**, which follows the design pass below and applies warranted \`add_panels\`, \`remove_panels\`, and layout changes instead of only recommending them. Never call \`ask_user_question\` in parallel with another tool.

## Design pass

When the user chooses **Improve existing charts and add useful new ones**, evaluate the dashboard against a **regeneration-quality** bar — not a local cleanup mindset. Compare it to the dashboard you would create from scratch for the same purpose. If composition, coverage, hierarchy, and layout already meet that bar, do **not** invent panel additions or removals: set \`prettifyPanelConfigs: true\` with empty \`operations\` and stop. Only redesign when the existing inventory is sparse, unbalanced, redundant, or missing high-value questions for its purpose.

When a redesign is warranted:

1. Infer the dashboard's purpose and intended audience from its title, description, panel titles, \`config.type\` values, and ES|QL queries. Determine the important questions this dashboard should answer.
2. Design the ideal dashboard from that purpose as if starting from scratch: choose the valuable overview metrics, trends, breakdowns/distributions, contextual markdown, controls, ordering, and sections called for by the generation guidance. Do not anchor on the existing number or mix of panels, and do not accept a sparse dashboard just because the input is sparse.
3. Compare the ideal design with the existing inventory. Preserve useful panels, proactively add every missing high-value visualization with \`add_panels\`, and remove panels that are clearly redundant or unrelated with \`remove_panels\`. Every addition must answer a distinct purpose-relevant question, and uncertain removals should remain recommendations.
4. Plan the entire final dashboard grid before emitting operations. Classify existing visualizations by summary \`config.type\`, apply the chart-type size table from the generation guidance to both existing and new panels, group panels into coherent rows/sections, and pack the 48-column grid left-to-right and top-to-bottom without gaps, overlaps, or inconsistent row heights.
5. Emit all changes in one batched call: give new panels their final \`grid\` in \`add_panels\`, and use \`update_panel_layouts\` to place and resize surviving panels around them. After any size change or removal, recompute all affected \`x\` and downstream \`y\` positions rather than patching one panel in isolation.
6. Set \`prettifyPanelConfigs: true\` so surviving pre-existing ES|QL Lens configs are refreshed by the inner visualization agent.
`,
};
