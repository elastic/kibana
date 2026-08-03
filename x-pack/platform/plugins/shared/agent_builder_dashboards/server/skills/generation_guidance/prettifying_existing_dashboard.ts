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

Do **not** reason about chart configuration details yourself — colors, palettes, axis titles, legend placement, metric formatting, and similar Lens styling choices live in the inner visualization agent. Set \`prettifyPanelConfigs: true\` and let the tool refresh configs; do not emit \`edit_panels\` solely to hand-tune chart configs.

When panels in the tool result's \`data.dashboard\` carry an \`authoring_note\`, briefly mention those improvements in your reply. Use the returned notes as-is; do not invent additional chart-config details.

If the user's request does not make the scope clear, call \`ask_user_question\` alone before \`generate_dashboard\` and ask **How should I enhance this dashboard?** with two options: **Improve existing charts and layout and add useful new panels** and **Improve existing charts and layout without adding panels**. Do not ask when the user already specified either scope.

## Layout pass (both scopes)

Check the existing layout against the panel layout rules (grid packing and chart-type sizes) and the panel ordering from the dashboard composition guidelines. If any panel violates them, use \`update_panel_layouts\` to emit a corrected grid for the affected panels, recomputing neighboring \`x\` and downstream \`y\` positions rather than patching one panel in isolation. Reordering existing panels is a layout change: apply it in both scopes, including when the user disallows new panels.

If the layout already conforms, do not emit layout operations — \`prettifyPanelConfigs: true\` with empty \`operations\` is the correct call for a config-only prettify. When the user chooses the existing-panels-only option, do not add or remove panels or restructure sections.

## Composition pass (only when new panels are allowed)

When the user requests or selects **Improve existing charts and layout and add useful new panels**, evaluate the dashboard against a **regeneration-quality** bar — not a local cleanup mindset. Compare it to the dashboard you would create from scratch for the same purpose. Only change composition when the existing inventory is sparse, unbalanced, redundant, or missing high-value questions for its purpose.

When a redesign is warranted:

1. Infer the dashboard's purpose and intended audience from its title, description, panel titles, \`config.type\` values, and ES|QL queries. Determine the important questions this dashboard should answer.
2. Design the ideal dashboard from that purpose as if starting from scratch: choose the valuable overview metrics, trends, breakdowns/distributions, contextual markdown, controls, ordering, and sections called for by the generation guidance. Do not anchor on the existing number or mix of panels, and do not accept a sparse dashboard just because the input is sparse.
3. Compare the ideal design with the existing inventory. Preserve useful panels, proactively add every missing high-value visualization with \`add_panels\`, and remove panels that are clearly redundant or unrelated with \`remove_panels\`. Every addition must answer a distinct purpose-relevant question, and uncertain removals should remain recommendations.
4. Give new panels their final \`grid\` in \`add_panels\`, then re-check the full grid (surviving plus new panels) against the layout rules and fix any violations with \`update_panel_layouts\`.

Set \`prettifyPanelConfigs: true\` in the same batched call so surviving pre-existing ES|QL Lens configs are refreshed by the inner visualization agent.
`,
};
