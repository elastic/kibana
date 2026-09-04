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
import { getDashboardDesignPromptContent } from './dashboard_guidance';

const chartTypeSelectionGuidance = getChartTypeSelectionPromptContent();

const guidance = `## Building a Dashboard

The ${
  dashboardTools.generateDashboard
} tool builds the resulting dashboard from the current dashboard (if any) plus an ordered \`operations\` array. This section describes the \`operations\` vocabulary; see the environment workflow below for how the current dashboard is referenced and how the result is surfaced.

Every dashboard MUST have a non-empty \`title\`. If the current dashboard's title is empty, missing, or \`"User Dashboard"\`, your first operation MUST be \`set_metadata\` with a title you invent from its contents.

Operations run in order, so earlier operations should set up state needed by later ones. Batch all operations into a single ${
  dashboardTools.generateDashboard
} call whenever possible.

When a dashboard needs sections, prefer a single batched call:
1. Use \`add_section\` with its optional \`panels\` array when you are creating a section's **new** panels immediately. Do not invent a \`sectionId\`.
2. To wrap or regroup **existing** panels, use \`update_panel_layouts\` with \`newSections\` and per-panel \`newSectionKey\`. \`newSectionKey\` is a local alias for that operation only — not a persisted id.
3. Use a follow-up \`add_panels\` with per-item \`sectionId\` only when you need to target an existing section returned by an earlier tool result.

For a new dashboard:
- Start with \`set_metadata\` and provide both \`title\` and \`description\`. Only include \`time_range\` when the user explicitly named a specific time window (e.g. "last 7 days", "May 20–24"). Do not set it otherwise — a data-aware default is applied automatically.
- Use \`add_panels\` to add panels in one batched operation. A single \`add_panels\` call may mix panel kinds and target different \`sectionId\` values, so batch related panels together.
- Use \`add_section\` when panels naturally group into distinct topics or the dashboard is large enough that sections improve scanability. Include \`panels\` on the section when you can create that section's initial panels immediately.

For an existing dashboard:
- Prefer \`edit_panels\` to change existing panel content in place rather than removing and re-adding a panel.
- Form-based Lens API charts support presentation edits. Query/data changes on non-ES|QL panels require explicit permission to replace the panel with an ES|QL chart.
- To wrap existing panels in a new section, use \`update_panel_layouts\` with \`newSections\` and \`newSectionKey\`. Do not recreate those panels on \`add_section.panels\` and \`remove_panels\` the old copies.
- Use \`update_panel_layouts\` to resize or reposition panels, move them into an existing section (\`sectionId\`), or wrap them in a new section (\`newSections\` + \`newSectionKey\`).

## Panel Inputs

- Use \`source: "request"\` to create or edit a Lens or Vega panel from a natural-language / ES|QL query — this is the only correct way to make a **new** visualization, or to change an existing chart's query or chart family. Never hand-build a visualization \`config\` for a new visualization.
- Use \`source: "config"\` for markdown, custom content, or supported Lens presentation changes. For new visualizations, pass only a config obtained from a visualization attachment.

## Panel Type Selection

Choose the panel type in this priority order:

1. **Lens** (\`source: "request"\`, \`renderer: "lens"\` or omit renderer) — default for metric, time series, bar, line, pie, area, and data table visualizations.
2. **Vega** (\`source: "request"\`, \`renderer: "vega"\`) — for scatter/bubble plots, small multiples/faceting, layered or combination charts, or when the user explicitly asks for Vega.
3. **Markdown** (\`source: "config"\`, \`type: "markdown"\`) — for static explanatory text, links, or simple formatted notes with no data.
4. **Custom content** (\`source: "config"\`, \`type: "custom_content"\`) — a last resort for HTML-based layouts that Lens and Vega cannot express, such as KPI scorecards with colored status badges, health/status boards, or panels that mix narrative text with live data values.

### Custom content panels

Reach for custom content only when nothing above fits:
- Any standard time series, bar, pie, metric, or data table → use Lens.
- Scatter plots, faceted charts, layered charts, combination charts → use Vega.
- Plain explanatory text with no data → use markdown.
- The content needs an HTML/CSS layout no single Lens chart type can express, or mixes narrative text with live data, or the user explicitly asks for a custom/HTML panel → use custom content.

**ES|QL for custom content:** set \`config.esqlQuery\` yourself when the panel needs live data — omitting it renders static content with no data, it does not get generated for you. Build the query with \`${
  platformCoreTools.generateEsql
}\` rather than writing it directly, or use one the user supplied verbatim. The server runs the query to sample its schema before generating the template, so a query Elasticsearch rejects fails that panel and returns an error naming the reason — correct the query and retry rather than proceeding.

**Creating a custom content panel:**
- Set \`config.prompt\` to a concise description of what to display. Do not supply \`template\` — it is generated server-side from the prompt.
- Set \`config.esqlQuery\` when the panel needs live data.

**Editing a custom content panel:**
- Use \`edit_panels\` (\`source: "config"\`, \`type: "custom_content"\`) and set \`panelId\` to the target panel.
- Supply only \`prompt\` and/or \`esqlQuery\` — omit fields that should stay unchanged. The server regenerates the template from the merged prompt and query. Do not supply \`template\`.

**Editing a visualization panel:**
- Use \`source: "request"\` to change what the chart shows (query or chart family).
- Use \`source: "config"\`, \`type: "vis"\`, and \`config: { changes: [...] }\` for presentation only. Changes use \`{ operation: "set", path, value }\` or \`{ operation: "remove", path }\` against Lens API fields. Never change queries, data sources, filters, aggregations, chart families, or layer membership through this flow. Preserve column bindings except for optional gauge binding removals required by the chart rules. Line-to-area restyling follows the shared XY guidance. Vega supports only title, description, and hide_title changes.
- Emit individual field changes, not data-bearing objects/arrays, a whole visualization attachment, or a Vega spec. Read the Prettify reference for shared chart guidance and edit syntax.

## Chart Type Guidance

For every new Lens panel, choose and pass \`chartType\`; it is required. For a new Vega panel, \`chartType\` is an optional authoring hint — omit it when no Lens chart type represents the requested visualization. On edits, \`chartType\` is optional because the existing panel configuration provides the current visual form. When editing a Lens panel, omit \`chartType\` to preserve its current chart family; provide a new \`chartType\` when the request changes the chart family, such as from \`xy\` to \`pie\`.

Before \`add_panels\`, pick 1–2 primary time-series XY (the overview trend that matches the title or intent).
On a new dashboard, phrase at least one and at most two of those primary time-series XY queries as "<measure> over time, show avg/min/max in the legend" (e.g. "log volume over time, show avg/min/max in the legend"). Skip categorical bar charts and queries whose measure is already AVG/MIN/MAX of a field.

${seriesStatisticsAgentGuidance}

${chartTypeSelectionGuidance}

${getDashboardDesignPromptContent()}

## ES|QL

Omit the \`esql\` field on visualization panels unless you received a validated query from a prior tool result or the user pasted one explicitly. Do not write or derive ES|QL yourself — the tool generates it from the natural language \`query\`.

## Generation Edge Cases

- Never invent a \`source: "config"\` payload for content you have not actually resolved. A title or legend patch on an existing visualization is not a new config. If you cannot obtain a full visualization configuration, report it clearly instead of fabricating one.
- Use \`update_panel_layouts\` when the user wants to resize or reposition panels without changing panel content, or to wrap existing panels in new sections (\`newSections\` + \`newSectionKey\`).
- If a user wants to change a dashboard panel's content, prefer \`edit_panels\` over removing and re-adding the panel. \`edit_panels\` works for ES|QL-backed Lens and Vega panels (\`source: "request"\` for query/chart-family changes, or \`source: "config"\`, \`type: "vis"\` for supported presentation changes), markdown panels (\`source: "config"\`, \`type: "markdown"\`), and custom content panels (\`source: "config"\`, \`type: "custom_content"\`).
- Supported Lens API presentation edits work on both ES|QL and form-based charts. Raw/unconverted Lens state is unsupported; leave it intact and report the limitation.
- If the user asks to change data or chart type on a non-ES|QL panel, explain the limitation and ask before recreating it as an ES|QL chart.
- Never silently follow a remove-and-recreate flow for a non-ES|QL panel. Wait for explicit user confirmation before regenerating the dashboard with replacement operations.`;

/**
 * Environment-agnostic dashboard *generation* guidance.
 *
 * The `guidance` describes how to build a dashboard. Chart-type selection
 * and dashboard design rules (composition, grid, controls) are
 * inlined so they arrive with `load_skill`. Prettify HITL and review compile
 * via `getDashboardPrettifyPromptContent` into referenced content instead.
 * It deliberately says nothing about how the current dashboard
 * is referenced or how the result is returned/surfaced. Those are
 * environment-specific and avoided here so the block can be reused across
 * environments. Pair it with an environment-specific rendering guidance block
 * (e.g. the Kibana one) that explains how the generated dashboard is surfaced.
 */
export const dashboardGeneration: DashboardGuidanceModule = {
  guidance,
};
