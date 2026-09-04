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

const chartTypeSelectionGuidance = getChartTypeSelectionPromptContent();

const guidance = `## Building a Dashboard

The ${dashboardTools.generateDashboard} tool builds the resulting dashboard from the current dashboard (if any) plus an ordered \`operations\` array. This section describes the \`operations\` vocabulary; see the environment workflow below for how the current dashboard is referenced and how the result is surfaced.

Every dashboard MUST have a non-empty \`title\`. If the current dashboard's title is empty, missing, or \`"User Dashboard"\`, your first operation MUST be \`set_metadata\` with a title you invent from its contents.

Operations run in order, so earlier operations should set up state needed by later ones. Batch all operations into a single ${dashboardTools.generateDashboard} call whenever possible.

When a dashboard needs sections, prefer a single batched call:
1. Use \`add_section\` with its optional \`panels\` array when you are creating a section's **new** panels immediately. Do not invent a \`sectionId\`.
2. To group **existing** panels into a new section, use \`update_panel_layouts\` with \`newSections\` and per-panel \`newSectionKey\` (a local alias for that operation only, not a persisted id). Never recreate existing panels to regroup them.
3. Use a follow-up \`add_panels\` with per-item \`sectionId\` only when you need to target an existing section returned by an earlier tool result.

For a new dashboard:
- Start with \`set_metadata\` and provide both \`title\` and \`description\`. Only include \`time_range\` when the user explicitly named a specific time window (e.g. "last 7 days", "May 20–24"). Do not set it otherwise — a data-aware default is applied automatically.
- Use \`add_panels\` to add panels in one batched operation. A single \`add_panels\` call may mix panel kinds and target different \`sectionId\` values, so batch related panels together.
- Use \`add_section\` when panels naturally group into distinct topics or the dashboard is large enough that sections improve scanability. Include \`panels\` on the section when you can create that section's initial panels immediately.

For an existing dashboard:
- Prefer \`edit_panels\` to change existing panel content in place rather than removing and re-adding a panel. It supports visualization panels (see "Editing a visualization panel" below), markdown panels (\`source: "config"\`, \`type: "markdown"\`), and custom content panels (\`source: "config"\`, \`type: "custom_content"\`).
- Use \`update_panel_layouts\` to resize or reposition panels, move them into an existing section (\`sectionId\`), or group them in a new section (\`newSections\` + \`newSectionKey\`) without changing panel content.
- DSL, form-based, and other non-ES|QL Lens panels accept presentation edits but not query or chart-type changes. If the user asks for such a change, explain the limitation and wait for explicit confirmation before replacing the panel with a new ES|QL chart. Raw, unconverted Lens state cannot be edited at all; leave it intact and report the limitation.

## Panel Inputs

- Use \`source: "request"\` to create a Lens or Vega panel from a natural-language / ES|QL query, or to change an existing chart's query or chart family. This is the only correct way to make a **new** visualization — never hand-build a visualization \`config\`.
- Use \`source: "config"\` for markdown, custom content, a visualization config obtained from a visualization attachment, or presentation-only changes to an existing visualization.

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

**ES|QL for custom content:** set \`config.esqlQuery\` yourself when the panel needs live data — omitting it renders static content with no data, it does not get generated for you. Build the query with \`${platformCoreTools.generateEsql}\` rather than writing it directly, or use one the user supplied verbatim. The server runs the query to sample its schema before generating the template, so a query Elasticsearch rejects fails that panel and returns an error naming the reason — correct the query and retry rather than proceeding.

**Creating a custom content panel:**
- Set \`config.prompt\` to a concise description of what to display. Do not supply \`template\` — it is generated server-side from the prompt.
- Set \`config.esqlQuery\` when the panel needs live data.

**Editing a custom content panel:**
- Use \`edit_panels\` (\`source: "config"\`, \`type: "custom_content"\`) and set \`panelId\` to the target panel.
- Supply only \`prompt\` and/or \`esqlQuery\` — omit fields that should stay unchanged. The server regenerates the template from the merged prompt and query. Do not supply \`template\`.

**Editing a visualization panel:**
- \`source: "request"\` changes what the chart shows (query or chart family) and regenerates it.
- \`source: "config"\`, \`type: "vis"\`, \`config: { changes: [...] }\` changes presentation only, with no regeneration. Each change is \`{ operation: "set", path, value }\` or \`{ operation: "remove", path }\` on a Lens API field; unmentioned settings are preserved. The \`dashboard-prettify.md\` reference file has the chart style rules and the full edit syntax.

## Chart Type Guidance

For every new Lens panel, choose and pass \`chartType\`; it is required. For a new Vega panel, \`chartType\` is an optional authoring hint — omit it when no Lens chart type represents the requested visualization. On edits, \`chartType\` is optional because the existing panel configuration provides the current visual form. When editing a Lens panel, omit \`chartType\` to preserve its current chart family; provide a new \`chartType\` when the request changes the chart family, such as from \`xy\` to \`pie\`.

Before \`add_panels\`, pick 1–2 primary time-series XY (the overview trend that matches the title or intent).
On a new dashboard, phrase at least one and at most two of those primary time-series XY queries as "<measure> over time, show avg/min/max in the legend" (e.g. "log volume over time, show avg/min/max in the legend"). Skip categorical bar charts and queries whose measure is already AVG/MIN/MAX of a field.

${seriesStatisticsAgentGuidance}

${chartTypeSelectionGuidance}

${dashboardDesignGuidancePrompt}

## ES|QL

Omit the \`esql\` field on visualization panels unless you received a validated query from a prior tool result or the user pasted one explicitly. Do not write or derive ES|QL yourself — the tool generates it from the natural language \`query\`.

## Generation Edge Cases

- Never invent a \`source: "config"\` payload for content you have not actually resolved. If you cannot obtain a panel's configuration, report it clearly instead of fabricating one. (Presentation \`changes\` on an existing visualization are not a new config.)
- Never silently follow a remove-and-recreate flow for a non-ES|QL panel. Wait for explicit user confirmation before regenerating the dashboard with replacement operations.`;

/**
 * Environment-agnostic dashboard *generation* guidance: the `operations` vocabulary plus the
 * chart-type selection and dashboard design rules, inlined so they arrive with `load_skill`.
 * The Prettify flow lives in a referenced file instead (see `prettify_guidance.ts`).
 *
 * This block deliberately says nothing about how the current dashboard is referenced or how the
 * result is surfaced. Those are environment-specific; pair it with an environment-specific
 * rendering guidance block (e.g. the Kibana one).
 */
export const dashboardGeneration: DashboardGuidanceModule = {
  guidance,
};
