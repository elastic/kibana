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

The ${dashboardTools.generateDashboard} tool applies the changes you describe to the current dashboard (if any). Describe the desired result, keyed by id, rather than steps: \`title\`, \`description\`, and \`time_range\` for dashboard fields, \`sections\` and \`panels\` to create or update, \`controls\` to add, and \`remove\` for ids to delete. Everything you leave out stays unchanged. See the environment workflow below for how the current dashboard is referenced and how the result is surfaced.

## Improving an Existing Dashboard (Enhance)

When asked to enhance, improve, or clean up an existing dashboard, read \`${ENHANCE_GUIDANCE_PATH}\` with \`read_file\` before inspecting the dashboard or calling any other tool. Follow that file. It takes precedence over the create-dashboard guidance in this skill. Do not enhance without reading it.

## Describing Changes

The tool schema describes each field. The rules below cover what the schema cannot express.

Every dashboard MUST have a non-empty \`title\`. If the current dashboard's title is empty, missing, or \`"User Dashboard"\`, set \`title\` to one you invent from its contents.

Make all changes in a single ${dashboardTools.generateDashboard} call whenever possible. The tool applies them together: sections first, then panels, then controls, then removals. Place panels in a new section in the same call that creates it.

Ids are stable across calls. Give new sections and panels short readable ids (e.g. \`"overview"\`, \`"error-rate-trend"\`) and reuse the ids from the tool result to change them later. The result lists the \`created\` and \`updated\` ids.

For a new dashboard:
- Set both \`title\` and \`description\`. Only include \`time_range\` when the user explicitly named a specific time window (e.g. "last 7 days", "May 20–24"). Do not set it otherwise — a data-aware default is applied automatically.
- Add sections when panels naturally group into distinct topics or the dashboard is large enough that sections improve scanability.

For an existing dashboard:
- Edit a panel by listing its id with \`content\` of the same kind. Reorganizing or enhancing a dashboard does not require replacing panels.
- Move a panel to another section by listing its id with \`section\` and no \`content\`. This keeps its configuration intact.
- For focused edits, pass only the requested change in the edit \`query\` (e.g. "make the error series blue"). The chart author preserves unrelated presentation settings. Set \`applyChartRules: true\` to apply all presentation defaults to an existing ES|QL Lens panel instead.
- Set \`preserveESQL: true\` when the panel's query should stay unchanged. Omit it when the edit changes what the panel measures. This is independent of \`applyChartRules\`, so a query change and presentation enhancement can share one edit.
- If a requested change targets a DSL, form-based, or other non-ES|QL Lens visualization panel, explicitly tell the user direct editing is not supported and ask for confirmation before replacing that panel with a newly created ES|QL-based Lens panel.
- Removing a section also removes the panels still in it. To keep some, list them with \`section: null\` (or another section id) in the same call that removes the section. Without a \`grid\`, moved panels are placed below the other panels of the target container. If a panel cannot be moved, the section is kept.

## Panel Inputs

Each visualization request is authored in a separate context. New-panel authors do not see the dashboard attachment or other panels, so for Lens and Vega panels pass the exact known \`index\` and describe the measure, fields, and filters in \`query\`. Omit \`index\` only when the source is unknown and discovery is needed. Custom content panels take no \`index\`; their data comes only from \`esql\` (see Custom content panels). Edits of existing panels receive the original configuration and queries automatically through the panel id.

- Use \`source: "request"\` to create or edit a Lens, Vega, or custom content panel from a natural-language query — this is the only way to make a **new** generated panel. Set \`renderer\` to pick the engine; each renderer accepts only its own fields.
- Use \`source: "attachment"\` with an \`attachment_id\` to place any visualization that already exists in this conversation — anything \`${platformCoreTools.createVisualization}\` returned. Pass only the id and a \`grid\`; the attachment's own renderer decides the panel type. A \`source: "request"\` would generate a **new**, different panel instead.
- Use \`source: "config"\` for panels you author by value: markdown and ML anomaly panels.

## Panel Type Selection

Choose the panel type in this priority order:

1. **Lens** (\`source: "request"\`, \`renderer: "lens"\` or omit renderer) — default for metric, time series, bar, line, pie, area, and data table visualizations.
2. **Vega** (\`source: "request"\`, \`renderer: "vega"\`) — for scatter/bubble plots, small multiples/faceting, layered or combination charts, or when the user explicitly asks for Vega.
3. **Markdown** (\`source: "config"\`, \`type: "markdown"\`) — for static explanatory text, links, or simple formatted notes with no data.
4. **Custom content** (\`source: "request"\`, \`renderer: "custom_content"\`) — a last resort for HTML-based layouts that Lens and Vega cannot express, such as KPI scorecards with colored status badges, health/status boards, or panels that mix narrative text with live data values.

### Custom content panels

Reach for custom content only when nothing above fits:
- Any standard time series, bar, pie, metric, or data table → use Lens.
- Scatter plots, faceted charts, layered charts, combination charts → use Vega.
- Plain explanatory text with no data → use markdown.
- The content needs an HTML/CSS layout no single Lens chart type can express, or mixes narrative text with live data, or the user explicitly asks for a custom/HTML panel → use custom content.

**ES|QL for custom content:** set \`esql\` yourself when the panel needs live data — omitting it renders static content with no data, it does not get generated for you. Build the query with \`${platformCoreTools.generateEsql}\` rather than writing it directly, or use one the user supplied verbatim. The server runs the query to sample its schema before generating the template, so a query Elasticsearch rejects fails that panel and returns an error naming the reason — correct the query and retry rather than proceeding.

**Creating a custom content panel:**
- Set \`query\` to a concise description of what to display. The HTML template is generated server-side from it.
- Set \`esql\` when the panel needs live data.
- Give it enough height. These panels lay out as HTML and scroll inside their own frame when the grid is too short for the content, so set \`grid.h\` from what you asked for — see the custom content entry in the grid sizes below.

**Editing a custom content panel:**
- List the panel's id with \`content\` of \`source: "request"\` and \`renderer: "custom_content"\`.
- Set \`query\` to the requested change and/or \`esql\` to a new query (\`null\` removes it). Omit \`esql\` to keep the current query. The server refines the existing template.

## Chart Type Guidance

For every new Lens panel, choose and pass \`chartType\`; it is required. For a new Vega panel, \`chartType\` is an optional authoring hint — omit it when no Lens chart type represents the requested visualization. On edits, \`chartType\` is optional because the existing panel configuration provides the current visual form. When editing a Lens panel, omit \`chartType\` to preserve its current chart family; provide a new \`chartType\` when the request changes the chart family, such as from \`xy\` to \`pie\`.

Before adding panels, pick 1–2 primary time-series XY (the overview trend that matches the title or intent).
On a new dashboard, phrase at least one and at most two of those primary time-series XY queries as "<measure> over time, show avg/min/max in the legend" (e.g. "log volume over time, show avg/min/max in the legend"). Skip categorical bar charts and queries whose measure is already AVG/MIN/MAX of a field.

${seriesStatisticsAgentGuidance}

${chartTypeSelectionGuidance}

${dashboardDesignGuidancePrompt}

## ES|QL

Omit the \`esql\` field on visualization panels unless the query came from \`${platformCoreTools.generateEsql}\` or the user pasted it. Do not write or derive ES|QL yourself — the tool generates it from the natural language \`query\`. A query you wrote yourself doesn't qualify, even after running it with \`${platformCoreTools.executeEsql}\`: running a query only shows that it works, so use \`${platformCoreTools.executeEsql}\` to inspect results, not to approve your own queries. Custom content is the exception: the tool does not generate its query, so pass \`esql\` whenever the panel needs data (see Custom content panels).

## Controls

Controls are interactive filters pinned above the dashboard that let users explore data without editing queries. Add them with \`controls\` and remove them by id with \`remove\`.

**When building a new dashboard from scratch**, proactively add 3–5 \`options_list_control\` dropdowns for the most useful categorical fields. Pick fields that appear in panel \`BY\` / \`WHERE\` clauses, prefer low-cardinality keyword fields (e.g. \`service.name\`, \`host.name\`, \`env\`, \`region\`, \`kubernetes.namespace\`, \`http.response.status_code\`). Avoid high-cardinality identifiers (trace IDs, request IDs, UUIDs).

Do not add controls to dashboards already scoped to a single entity (one host, one service, etc.).

Controls query the index directly, so columns created in ES|QL (\`DISSECT\`, \`GROK\`, \`EVAL\`, \`RENAME\`) cannot back a control. Controls are optional: when no mapped field fits, add fewer controls or none.

**Control types:**
- \`options_list_control\` — dropdown for categorical / keyword fields. The most common type (95% of cases).
- \`range_slider_control\` — numeric range slider. Add sparingly, only when filtering by a numeric threshold is useful across multiple panels (e.g. \`latency\`, \`bytes\`, \`duration\`).
- \`time_slider_control\` — global time sub-range picker. Add at most one per dashboard, only when time-range narrowing within the global window is useful.

**Required fields per control:**
- \`type\`: one of the three above.
- \`field_name\` (not for \`time_slider_control\`): exact name of a field mapped on \`index\` (e.g. \`"service.name"\`).
- \`index\` (not for \`time_slider_control\`): same index as the dashboard panels (e.g. \`"logs-*"\`).
- \`title\` (optional, \`options_list_control\` and \`range_slider_control\` only): human-readable label shown above the control (e.g. \`"Service"\`).
- \`user_requested\` (optional): \`true\` only when the user asked explicitly for the controls.

**Defaults applied by the server:** \`width: "medium"\`, \`grow: true\` (fills available horizontal space). Override only if the user asks.

**Removing controls:** list the \`id\` values from the \`controls[]\` list in the tool result in \`remove\`.

## Generation Edge Cases

- When the user wants to resize, reposition, or move panels without changing panel content, list their ids with \`grid\` or \`section\` and no \`content\`.
- If a user wants to change a dashboard panel's content, edit it by id rather than removing and re-adding it. Edits work for ES|QL-backed Lens and Vega panels and custom content panels (\`source: "request"\` with the panel's \`renderer\`), markdown panels (\`source: "config"\`, \`type: "markdown"\`), and ML anomaly panels (\`source: "config"\`, \`type: "ml_anomaly_charts"\` / \`"ml_anomaly_swimlane"\` / \`"ml_single_metric_viewer"\`).
- A dashboard can include DSL-based, form-based, or other non-ES|QL Lens panels. Do not attempt to edit those panels directly.
- If the user asks to modify a DSL visualization or any other non-ES|QL panel, explicitly explain that direct editing is not supported, propose recreating and replacing it as a new ES|QL-based Lens chart, and ask for confirmation before you replace the existing panel.
- Never silently replace a non-ES|QL panel. Wait for explicit user confirmation before regenerating the dashboard with replacement content.`;

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
