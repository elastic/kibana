/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import {
  getChartTypeSelectionPromptContent,
  seriesStatisticsAgentGuidance,
} from '@kbn/agent-builder-visualizations-server';
import { dashboardTools } from '../../../common';
import type { DashboardGuidanceModule } from '../guidance_module';
import { ENHANCE_GUIDANCE_PATH, enhanceGuidanceReference } from './enhance_guidance';

const chartTypeSelectionGuidance = getChartTypeSelectionPromptContent();

const guidance = `## Dashboard Changes

The ${dashboardTools.generateDashboard} tool applies the changes you describe to the current dashboard (if any). Its tool and field descriptions say what each field means and how to compose a dashboard: which content to cover, when to use sections, which panel kind to pick, which controls to add, and how to edit panels. This skill adds how to use the tool in Agent Builder. See the environment workflow below for how the current dashboard is referenced and how the result is surfaced.

## Improving an Existing Dashboard (Enhance)

When asked to enhance, improve, or clean up an existing dashboard, read \`${ENHANCE_GUIDANCE_PATH}\` with \`read_file\` before inspecting the dashboard or calling any other tool. Follow that file. It takes precedence over the create-dashboard guidance in this skill. Do not enhance without reading it.

## Panels in Agent Builder

- Use \`source: "attachment"\` to place a visualization that \`${platformCoreTools.createVisualization}\` already returned in this conversation. A \`source: "request"\` would generate a **new**, different panel instead.
- DSL-based, form-based, and other non-ES|QL Lens panels, and by-reference panels (\`config.savedObjectId\` or \`config.ref_id\`), cannot be edited. A by-reference panel's content is unknown: do not look it up with any tool or API. When the user asks to change one of these panels, say so, propose replacing it with a new ES|QL-based Lens panel, and wait for explicit confirmation before replacing it.

## Custom Content Panels

A custom content panel with live data does not need a query from you. Always set \`hasData\` when you create one, since there is no default: \`hasData: true\` (and \`index\` when you know it) and the server generates the query from \`query\`, then samples its schema before generating the template. \`hasData: false\` makes a static panel with no query — use that for banners, legends and notes, and never invent a query for them. Do not write the query yourself; pass \`esql\` only when the user supplied one verbatim. If the server cannot generate a query, the panel fails with an error naming the reason — fix the \`index\` or the description and retry rather than proceeding.

To create one, set \`query\` to a concise description of what to display; the HTML template is generated server-side from it.

To edit one, list its id in \`panels\` with \`source: "request"\`, \`renderer: "custom_content"\`. Set \`query\` to the requested change; layout, copy and style edits (colors, sizes, wording) keep the current query. An edit that needs different data, such as "also show the average bytes", a new grouping or filter, or another time window, also needs \`regenerateESQL: true\`: without it the stored query is kept and the new data can never appear. The server then regenerates the query from \`query\`, keeping what the request does not change. \`hasData: true\` gives a static panel a query; \`hasData: false\` (or \`esql: null\`) removes it. The server refines the existing template.

Other panel types never take \`esql\` unless it came from \`${platformCoreTools.generateEsql}\` or the user pasted it: their query is generated from \`query\`.

## Chart Type Guidance

Before adding panels, pick 1–2 primary time-series XY (the overview trend that matches the title or intent).
On a new dashboard, phrase at least one and at most two of those primary time-series XY queries as "<measure> over time, show avg/min/max in the legend" (e.g. "log volume over time, show avg/min/max in the legend"). Skip categorical bar charts and queries whose measure is already AVG/MIN/MAX of a field.

${seriesStatisticsAgentGuidance}

${chartTypeSelectionGuidance}`;

/**
 * Environment-agnostic dashboard *generation* guidance.
 *
 * The `guidance` adds what the generation tool's own descriptions do not carry: the enhance
 * workflow, reuse of existing visualizations, confirmation before replacing a panel, custom content
 * panel data, and chart type selection. It deliberately says nothing about how the
 * current dashboard is referenced or how the result is returned/surfaced. Those are
 * environment-specific and avoided here so the block can be reused across environments. Pair it with
 * an environment-specific rendering guidance block (e.g. the Kibana one) that explains how the
 * generated dashboard is surfaced.
 */
export const dashboardGeneration: DashboardGuidanceModule = {
  guidance,
  referencedContent: [enhanceGuidanceReference],
};
