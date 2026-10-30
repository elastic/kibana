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
import { dashboardDesignGuidancePrompt } from './design';
import { ENHANCE_GUIDANCE_PATH, enhanceGuidanceReference } from './enhance_guidance';

const chartTypeSelectionGuidance = getChartTypeSelectionPromptContent();

const guidance = `## Dashboard Changes

The ${dashboardTools.generateDashboard} tool applies the changes you describe to the current dashboard (if any). Describe the desired result, keyed by id, rather than steps: \`title\`, \`description\`, and \`time_range\` for dashboard fields, \`sections\`, \`panels\` and \`controls\` to create or update, and \`remove\` for ids to delete. Everything you leave out stays unchanged. See the environment workflow below for how the current dashboard is referenced and how the result is surfaced.

## Improving an Existing Dashboard (Enhance)

When asked to enhance, improve, or clean up an existing dashboard, read \`${ENHANCE_GUIDANCE_PATH}\` with \`read_file\` before inspecting the dashboard or calling any other tool. Follow that file. It takes precedence over the create-dashboard guidance in this skill. Do not enhance without reading it.

## Describing Changes

The tool schema describes each field. The rules below cover what the schema cannot express.

Make all changes in a single ${dashboardTools.generateDashboard} call whenever possible. The tool checks each change against the dashboard as it was before the call and against the rest of the call, then applies the changes one by one: failed ones are listed in \`failures\` and the rest are kept. Place panels in a new section in the same call that creates it.

For a new dashboard, set both \`title\` and \`description\`.

For an existing dashboard:
- Edit a panel by its id with \`content\` of the same kind rather than removing and re-adding it. Reorganizing or enhancing a dashboard does not require replacing panels. Edits work for ES|QL Lens, Vega, and custom content panels (\`source: "request"\` with the panel's \`renderer\`), and for markdown and ML anomaly panels (\`source: "config"\` with the panel's \`type\`).
- For focused edits, pass only the requested change in the \`query\` (e.g. "make the error series blue"). The chart author preserves unrelated presentation settings.
- These panels cannot be edited, only moved, resized, or removed: DSL-based, form-based, and other non-ES|QL Lens panels, and by-reference panels (\`config.savedObjectId\` or \`config.ref_id\`). A by-reference panel's content is unknown: do not look it up with any tool or API; its title is the only hint. When the user asks to change one of these panels, say so, propose replacing it with a new ES|QL-based Lens panel, and wait for explicit confirmation before replacing it.

## Panel Inputs

Each visualization request is authored in a separate context. New-panel authors do not see the dashboard attachment or other panels, so for Lens and Vega panels pass the exact known \`index\` and describe the measure, fields, and filters in \`query\`. Omit \`index\` only when the source is unknown and discovery is needed. Custom content panels take no \`index\`; their data comes only from \`esql\` (see Custom Content Panels). Edits of existing panels receive the original configuration and queries automatically through the panel id.

- Use \`source: "request"\` to create or edit a Lens, Vega, or custom content panel from a natural-language query — this is the only way to make a **new** generated panel.
- Use \`source: "attachment"\` to place a visualization that \`${platformCoreTools.createVisualization}\` already returned in this conversation. A \`source: "request"\` would generate a **new**, different panel instead.
- Use \`source: "config"\` for panels you author by value: markdown and ML anomaly panels.

## Panel Type Selection

Choose the first panel type that fits:

1. **Lens** (\`renderer: "lens"\` or omitted) — metrics, time series, bar, line, pie, area, and data tables.
2. **Vega** (\`renderer: "vega"\`) — scatter/bubble plots, small multiples/faceting, layered or combination charts, or when the user asks for Vega.
3. **Markdown** (\`source: "config"\`, \`type: "markdown"\`) — static text, links, or notes with no data.
4. **Custom content** (\`renderer: "custom_content"\`) — a last resort for HTML/CSS layouts that Lens and Vega cannot express, such as KPI scorecards with colored status badges, health/status boards, or narrative text mixed with live data values, or when the user asks for a custom/HTML panel.

## Custom Content Panels

A custom content panel with live data does not need a query from you. Always set \`hasData\` when you create one, since there is no default: \`hasData: true\` (and \`index\` when you know it) and the server generates the query from \`query\`, then samples its schema before generating the template. \`hasData: false\` makes a static panel with no query — use that for banners, legends and notes, and never invent a query for them. Do not write the query yourself; pass \`esql\` only when the user supplied one verbatim. If the server cannot generate a query, the panel fails with an error naming the reason — fix the \`index\` or the description and retry rather than proceeding.

To create one, set \`query\` to a concise description of what to display; the HTML template is generated server-side from it.

To edit one, list its id in \`panels\` with \`source: "request"\`, \`renderer: "custom_content"\`. Set \`query\` to the requested change; layout, copy and style edits (colors, sizes, wording) keep the current query. An edit that needs different data, such as "also show the average bytes", a new grouping or filter, or another time window, also needs \`regenerateESQL: true\`: without it the stored query is kept and the new data can never appear. The server then regenerates the query from \`query\`, keeping what the request does not change. \`hasData: true\` gives a static panel a query; \`hasData: false\` (or \`esql: null\`) removes it. The server refines the existing template.

Other panel types never take \`esql\` unless it came from \`${platformCoreTools.generateEsql}\` or the user pasted it: their query is generated from \`query\`.

## Chart Type Guidance

Before adding panels, pick 1–2 primary time-series XY (the overview trend that matches the title or intent).
On a new dashboard, phrase at least one and at most two of those primary time-series XY queries as "<measure> over time, show avg/min/max in the legend" (e.g. "log volume over time, show avg/min/max in the legend"). Skip categorical bar charts and queries whose measure is already AVG/MIN/MAX of a field.

${seriesStatisticsAgentGuidance}

${chartTypeSelectionGuidance}

${dashboardDesignGuidancePrompt}

## Controls

Controls are interactive filters pinned above the dashboard that let users explore data without editing queries.

**When building a new dashboard from scratch**, proactively add 3–5 \`options_list_control\` dropdowns for the most useful categorical fields. Pick fields that appear in panel \`BY\` / \`WHERE\` clauses, prefer low-cardinality keyword fields (e.g. \`service.name\`, \`host.name\`, \`env\`, \`region\`, \`kubernetes.namespace\`, \`http.response.status_code\`). Avoid high-cardinality identifiers (trace IDs, request IDs, UUIDs). Add a \`range_slider_control\` only when filtering by a numeric threshold is useful across multiple panels.

Do not add controls to dashboards already scoped to a single entity (one host, one service, etc.).

Controls query the index directly, so columns created in ES|QL (\`DISSECT\`, \`GROK\`, \`EVAL\`, \`RENAME\`) cannot back a control. Controls are optional: when no mapped field fits, add fewer controls or none.

Controls are keyed by the \`id\` from the \`controls[]\` list in the tool result. To change a control, send its full new definition with that \`id\`; to remove it, list the \`id\` in \`remove\`.`;

/**
 * Environment-agnostic dashboard *generation* guidance.
 *
 * The `guidance` describes how to build a dashboard, including the detailed design guidance
 * (composition + panel layout) inlined directly. It deliberately says nothing about how the
 * current dashboard is referenced or how the result is returned/surfaced. Those are
 * environment-specific and avoided here so the block can be reused across environments. Pair it with
 * an environment-specific rendering guidance block (e.g. the Kibana one) that explains how the
 * generated dashboard is surfaced.
 */
export const dashboardGeneration: DashboardGuidanceModule = {
  guidance,
  referencedContent: [enhanceGuidanceReference],
};
