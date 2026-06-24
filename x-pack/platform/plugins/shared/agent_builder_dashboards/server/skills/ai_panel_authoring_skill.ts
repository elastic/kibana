/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { generateDashboardTool } from '../tools';
import { dashboardTools } from '../../common';

export const aiPanelAuthoringSkill = defineSkillType({
  id: 'ai-panel-authoring',
  name: 'ai-panel-authoring',
  basePath: 'skills/platform/dashboard',
  description:
    'Creates AI-generated dashboard panels that render anything: KPI cards, status boards, custom chart types Lens does not support, mixed layouts, rich HTML — all driven by a prompt and optional live ES|QL data.',
  content: `## When to Use This Skill

Use this skill when the user asks for a dashboard panel that Lens cannot produce:
- KPI cards or metric summaries with custom styling
- Status boards with color-coded health indicators
- Chart types Lens does not support: sankey, treemap, radar, word cloud, funnel, calendar heatmap, network graph, bubble chart, gauge
- Mixed layouts combining text, numbers, and charts in one panel
- Any panel the user describes that does not map to a standard Lens chart type
- Any panel explicitly described as "AI-generated" or "custom"
- **Dashboard summary**: when the user asks to summarise the dashboard or highlight what to focus on — use \`type: "ai_dashboard_summary"\`

Do **not** use this skill for standard Lens chart types (line, bar, area, pie, histogram, data table) — use the dashboard-management skill instead.

## Panel Schema

All panels in \`add_panels\` use \`source: "config"\` with a \`type\` discriminator and a \`config\` object.

### \`type: "ai_panel"\` — Custom visualisation

\`\`\`json
{
  "source": "config",
  "type": "ai_panel",
  "config": {
    "prompt": "Describe exactly what to render — chart type, data shape, visual style, color scheme.",
    "esqlQuery": "FROM index | STATS ... | LIMIT 10"
  },
  "grid": { "x": 0, "y": 0, "w": 24, "h": 8 }
}
\`\`\`

- \`config.prompt\` (required): the more specific, the better. Bad: "show error counts". Good: "A horizontal bar chart of the top 10 services by error count. Bars colored red (#D36086)."
- \`config.esqlQuery\` (optional): live data context. Generate with \`${platformCoreTools.generateEsql}\` when the panel should reflect real index data.

### \`type: "ai_dashboard_summary"\` — Dashboard summary

Use when the user asks to summarise the dashboard, highlight key metrics, or say what to focus on.

The panel **automatically discovers** all ES|QL panels on the dashboard and generates a concise narrative. No query needed.

\`\`\`json
{
  "source": "config",
  "type": "ai_dashboard_summary",
  "config": {
    "customInstructions": "Focus on anomalies and flag anything below target."
  },
  "grid": { "x": 0, "y": 0, "w": 48, "h": 8 }
}
\`\`\`

Place it at the top of the dashboard, full width (\`w: 48\`). \`config.customInstructions\` is optional.

## Core Instructions

### Step 1 — Decide if live data is needed (ai_panel only)

If the panel should reflect real index data, use \`${platformCoreTools.generateEsql}\` to produce the ES|QL query, then pass it as \`config.esqlQuery\`.

If the panel is static (hardcoded values, welcome card, layout), omit \`esqlQuery\`.

### Step 2 — Build the dashboard

Call \`${dashboardTools.generateDashboard}\` with:
- A \`set_metadata\` operation first (title + description)
- An \`add_panels\` operation with the panel items

You may mix \`type: "ai_panel"\`, \`type: "ai_dashboard_summary"\`, \`type: "vis"\` (Lens), and \`type: "markdown"\` in the same \`add_panels\` call.

The connector is resolved automatically — do not ask the user for a connector ID.
`,
  getInlineTools: () => [generateDashboardTool()],
  getRegistryTools: () => [platformCoreTools.generateEsql, platformCoreTools.executeEsql],
});
