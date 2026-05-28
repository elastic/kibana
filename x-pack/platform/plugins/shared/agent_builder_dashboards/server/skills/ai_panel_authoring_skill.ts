/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { manageDashboardTool } from '../tools';
import { dashboardTools } from '../../common';

export const aiPanelAuthoringSkill = defineSkillType({
  id: 'ai-panel-authoring',
  name: 'ai-panel-authoring',
  basePath: 'skills/platform/ai_panel',
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

Do **not** use this skill for standard Lens chart types (line, bar, area, pie, histogram, data table) — use the dashboard-management skill instead.

## How AI Panels Work

An \`ai_panel\` stores a \`prompt\` and an optional \`esqlQuery\`. On every dashboard load, the panel:
1. Runs the ES|QL query (if provided) to fetch live data
2. Sends the prompt + data to an LLM
3. Renders the LLM response as self-contained HTML in a sandboxed iframe

The result can be anything HTML can express — the LLM decides the best visual form for the data.

## Core Instructions

### Step 1 — Decide if live data is needed

If the panel should reflect real index data, use \`${platformCoreTools.generateEsql}\` to produce the ES|QL query. Describe what you want in natural language; include the index name if known. Then pass the generated query as \`esqlQuery\` on the \`ai_panel\` item.

If the panel is static (no index data needed — e.g. a status board with hardcoded values, a welcome card, a layout), skip the query step entirely.

### Step 2 — Build the dashboard

Call \`${dashboardTools.manageDashboard}\` with:
- A \`set_metadata\` operation first (title + description)
- An \`add_panels\` operation containing \`kind: "ai_panel"\` items

For \`kind: "ai_panel"\`:
- \`prompt\`: describe exactly what to render — chart type, data shape, visual style, color scheme, annotations. The more specific, the better.
- \`esqlQuery\` (optional): the ES|QL query generated in step 1.
- \`grid\`: placement and size on the dashboard.

The connector is resolved automatically — do not ask the user for a connector ID.

### Prompt writing tips

A good \`prompt\` tells the LLM what to render, not just what data to show:
- Bad: "show error counts"
- Good: "A horizontal bar chart of the top 10 services by error count. Bars colored red (#D36086). Service name on the Y axis, count on the X axis. No chart title — the dashboard panel title already has one."

You may mix \`kind: "ai_panel"\` with \`kind: "visualization"\` (Lens) and \`kind: "markdown"\` in the same \`add_panels\` call when a dashboard benefits from both.
`,
  getInlineTools: () => [manageDashboardTool()],
  getRegistryTools: () => [platformCoreTools.generateEsql, platformCoreTools.executeEsql],
});
