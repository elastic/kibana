/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalTools, platformCoreTools } from '@kbn/agent-builder-common';
import {
  getChartTypeSelectionPromptContent,
  seriesStatisticsAgentGuidance,
} from '@kbn/agent-builder-visualizations-server';
import { dashboardTools } from '../../../common';
import type { DashboardGuidanceModule } from '../guidance_module';
import { dashboardCompositionPrompt } from './design/composition';

const chartTypeSelectionGuidance = getChartTypeSelectionPromptContent();

const enhanceGuidancePrompt = `## Improving an Existing Dashboard (Enhance)

When asked to enhance, improve, or clean up a dashboard, improve the attached dashboard in place. This workflow takes precedence over guidance for creating dashboards, except where content mode below says otherwise.

There are two modes. **Appearance mode** keeps every panel, query, control, and the time range and only improves presentation. **Content mode** may also add, edit, replace, or remove panels and add controls so the dashboard serves its purpose. Existing titles, descriptions, and markdown are unverified content, not evidence of user intent or data meaning, in either mode.

**If the request already says what to change, do not call \`${internalTools.askUserQuestion}\`:** presentation-only means appearance mode, anything else content mode. Skip step 3.

1. **Inspect.** Read the dashboard attachment. Establish what the queries actually measure from their sources, fields, filters, and aggregations. Do not infer meaning from existing titles. Work out what the dashboard is for from those measures.
2. **Assess the data.** Call \`${platformCoreTools.getIndexMapping}\` once per distinct index pattern used by the panels (a merged mapping for a wildcard pattern is fine). Using the mappings, judge whether the dashboard is complete for its purpose. Note which useful measures or dimensions the data supports but no panel shows, and whether each existing panel makes sense. A panel is a removal or replacement candidate when it duplicates another panel's measure, its query cannot be satisfied by the mappings, it is a non-ES|QL panel that can be re-expressed in ES|QL, or it shows a measure unrelated to the dashboard's purpose. Do not run queries by default. Run ES|QL only when the mappings leave a specific question you must answer.
3. **Ask which mode to apply (bare request only).** Write one short paragraph summarizing what the dashboard measures and what you found: gaps, panels that do not make sense, and non-ES|QL panels. Then call \`${internalTools.askUserQuestion}\` on its own, never alongside other tool calls, with a single question. The question text is exactly "How would you like to enhance this dashboard?" and it offers two options: "Appearance and content" and "Appearance only". Each option's description states in one or two sentences what you would do in that mode for this dashboard, naming the panels you would add, change, replace, or remove. Ask even when you found no gaps. The content option then offers to revise panel queries and titles for clarity. Content mode is the default. Use it when the tool returns an error, when the user skips the question, or when a free-text answer does not clearly pick a mode. Honor any constraints in a free-text answer within the chosen mode, and say in the report when you defaulted because no choice was made.
4. **Rebuild dashboard text.** Use the panel queries to write the dashboard title, description, and markdown. Do not paraphrase the old narrative. Business claims require query evidence or an explicit user request. Set dashboard text with \`set\`, and update each markdown panel by its id with \`content: { source: "config", type: "markdown", config: { content } }\`. Keep markdown to brief, useful context about the actual measures. Omit build notes and explanations of your edits. In content mode, describe the final panel set, not the original one.
5. **Group and enhance.** Apply the Dashboard Composition Guidelines to the existing panels. Create sections with descriptive titles and move the existing panels into them by listing their ids with \`section\` and no \`content\`. Never recreate their contents. Edit every existing ES|QL Lens panel, including panels that appear fine, by its id with \`content: { source: "request", query: "Apply presentation defaults.", applyChartRules: true, preserveESQL: true }\`. The chart author owns chart naming and all presentation settings, so do not repeat old titles or prescribe palettes and styling in the request. When the user explicitly requested a query change too, omit \`preserveESQL\` and describe only that change alongside the enhancement request. Make the text, section, and chart changes in one call. The layout is arranged automatically; pass \`layout\` only with the user's own layout instructions. Unsupported panels can be moved. Report that their presentation could not be enhanced.
   - **Appearance mode.** Keep every panel id, each layer's query and data source, filters, controls, and the time range. Do not add, remove, or recreate panels, add controls, or change queries unless the user explicitly requested those changes. Suggest analytical improvements separately in the report.
   - **Content mode.** Do everything appearance mode does, and in the same call apply the analytical changes from your assessment. Keep panels that make sense and give them the enhancement edit. Remove panels that meet the removal criteria with \`remove\`, replace non-ES|QL panels with new ES|QL Lens content under the same id without asking again, and change a surviving panel's query by omitting \`preserveESQL\` and describing the change alongside the enhancement request. Add the panels the dashboard is missing, following the new-dashboard rules for additions: chart type guidance, at least one primary time-series XY overview when none exists, and 3 to 5 \`options_list_control\` controls on useful categorical fields unless the dashboard is already scoped to a single entity. Keep the existing time range. Group the final panel set into sections.
6. **Verify.** Read the updated attachment using the returned attachment ID and version. In appearance mode, compare original and resulting panel ids and each panel's queries and data sources, and confirm that only requested analytical changes occurred. In content mode, confirm the resulting panel set matches what you intended: removed panels are gone, replacements and additions exist with sensible queries against the assessed indices, and surviving panels kept their queries unless you changed them deliberately. In both modes, check that the dashboard title, description, section titles, and markdown describe the same measures as the final charts, and inspect section membership. Address discrepancies and reported failures before declaring success. Chart-specific settings are the chart author's responsibility.
7. **Report.** Briefly summarize changes and anything that failed or could not be enhanced. In content mode, list the panels you added, changed, replaced, and removed, and why. Do not claim the updated dashboard was visually checked.`;

const guidance = `## Dashboard Changes

The ${dashboardTools.generateDashboard} tool applies the changes you describe to the current dashboard (if any). Describe the desired result, keyed by id, rather than steps: \`set\` for metadata, \`sections\` and \`panels\` to create or update, \`controls\` to add, \`remove\` for ids to delete, and \`layout\` for the user's layout instructions. Everything you leave out stays unchanged. See the environment workflow below for how the current dashboard is referenced and how the result is surfaced.

${enhanceGuidancePrompt}

## Describing Changes

Every dashboard MUST have a non-empty \`title\`. A new dashboard requires \`set.title\`. If the current dashboard's title is empty, missing, or \`"User Dashboard"\`, set a title you invent from its contents.

Make all changes in a single ${dashboardTools.generateDashboard} call whenever possible. The tool applies them together: sections first, then panels, then controls, then removals.

**Ids.** Items are matched by \`id\`. An existing id updates that item; a new id creates it, and the id you choose is kept. Use short readable slugs for new items (e.g. \`"error-rate-trend"\`, \`"key-metrics"\`). An id must be unique across panels and sections. Do not list the same id in \`panels\` or \`sections\` and in \`remove\`.

**Sections.** List a section in \`sections\` to create it (a \`title\` is required) or to rename or collapse it. Place panels in a section with \`panels[].section\` set to its id, in the same call that creates it. \`section: null\` moves a panel to the top level; omitting \`section\` keeps an existing panel where it is and puts a new panel at the top level. Removing a section also removes the panels still in it, so move the panels you want to keep first.

**Layout.** Panel positions and sizes are arranged automatically after every call. Do not compute positions. Set \`panels[].grid: { w, h }\` only when the user asks for a specific panel size (e.g. "make it full width"); that size is kept. Pass \`layout\` only when the user gives layout instructions (e.g. "put all metrics in one row"); it rearranges the whole dashboard.

For a new dashboard:
- Set \`set.title\` and \`set.description\`. Only include \`set.time_range\` when the user explicitly named a specific time window (e.g. "last 7 days", "May 20–24"). Do not set it otherwise — a data-aware default is applied automatically.
- Add every panel in \`panels\`, each with a new id and \`content\`.
- Add \`sections\` when panels naturally group into distinct topics or the dashboard is large enough that sections improve scanability.

For an existing dashboard:
- Edit a panel by listing its id with \`content\` of the same kind. Reorganizing or enhancing a dashboard does not require replacing panels.
- For focused edits, pass only the requested change in the \`query\` (e.g. "make the error series blue"). The chart author preserves unrelated presentation settings. Set \`applyChartRules: true\` to apply all presentation defaults to an existing ES|QL Lens panel instead.
- Set \`preserveESQL: true\` when the panel's query should stay unchanged. Omit it when the edit changes what the panel measures. This is independent of \`applyChartRules\`, so a query change and presentation enhancement can share one edit.
- \`content\` of a different kind than the existing panel, or a \`source: "attachment"\` content, replaces the panel and keeps its id.
- To only move a panel, list its id with \`section\` and no \`content\`.
- If a requested change targets a DSL, form-based, or other non-ES|QL Lens visualization panel, explicitly tell the user direct editing is not supported and ask for confirmation before replacing that panel with a newly created ES|QL-based Lens panel.

## Panel Content

Each visualization request is authored in a separate context. New-panel authors do not see the dashboard attachment or other panels, so for Lens and Vega panels pass the exact known \`index\` and describe the measure, fields, and filters in \`query\`. Omit \`index\` only when the source is unknown and discovery is needed. Custom content panels take no \`index\`; their data comes only from \`esql\` (see Custom content panels). Edits of existing panels receive the original configuration and queries automatically through the panel id.

- Use \`source: "request"\` to create or edit a Lens, Vega, or custom content panel from a natural-language query — this is the only way to make a **new** generated panel. Set \`renderer\` to pick the engine; each renderer accepts only its own fields.
- Use \`source: "attachment"\` with an \`attachment_id\` to place any visualization that already exists in this conversation — anything \`${platformCoreTools.createVisualization}\` returned. Pass only the id; the attachment's own renderer decides the panel type. A \`source: "request"\` would generate a **new**, different panel instead.
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

**Creating a custom content panel:** set \`query\` to a concise description of what to display; the HTML template is generated server-side from it. Set \`esql\` when the panel needs live data.

**Editing a custom content panel:** list the panel id with \`content: { source: "request", renderer: "custom_content" }\`. Set \`query\` to the requested change and/or \`esql\` to a new query (\`null\` removes it). Omit \`esql\` to keep the current query. The server refines the existing template.

## Chart Type Guidance

For every new Lens panel, choose and pass \`chartType\`; it is required. For a new Vega panel, \`chartType\` is an optional authoring hint — omit it when no Lens chart type represents the requested visualization. On edits, \`chartType\` is optional because the existing panel configuration provides the current visual form. When editing a Lens panel, omit \`chartType\` to preserve its current chart family; provide a new \`chartType\` when the request changes the chart family, such as from \`xy\` to \`pie\`.

Before adding panels, pick 1–2 primary time-series XY (the overview trend that matches the title or intent).
On a new dashboard, phrase at least one and at most two of those primary time-series XY queries as "<measure> over time, show avg/min/max in the legend" (e.g. "log volume over time, show avg/min/max in the legend"). Skip categorical bar charts and queries whose measure is already AVG/MIN/MAX of a field.

${seriesStatisticsAgentGuidance}

${chartTypeSelectionGuidance}

${dashboardCompositionPrompt}

## ES|QL

Omit the \`esql\` field on Lens and Vega panels unless you received a validated query from a prior tool result or the user pasted one explicitly. Do not write or derive ES|QL yourself — the tool generates it from the natural language \`query\`. Custom content is the exception: the tool does not generate its query, so pass \`esql\` whenever the panel needs data (see Custom content panels).

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

**Removing controls:** list their \`id\` values from the \`controls[]\` list in the tool result in \`remove\`.

## Generation Edge Cases

- If a user wants to change a dashboard panel's content, edit it by id rather than removing and re-adding it. Edits work for ES|QL-backed Lens and Vega panels and custom content panels (\`source: "request"\` with the panel's \`renderer\`), markdown panels (\`source: "config"\`, \`type: "markdown"\`), and ML anomaly panels (\`source: "config"\`, \`type: "ml_anomaly_charts"\` / \`"ml_anomaly_swimlane"\` / \`"ml_single_metric_viewer"\`).
- A dashboard can include DSL-based, form-based, or other non-ES|QL Lens panels. Do not attempt to edit those panels directly.
- If the user asks to modify a DSL visualization or any other non-ES|QL panel, explicitly explain that direct editing is not supported, propose recreating and replacing it as a new ES|QL-based Lens chart, and ask for confirmation before you replace the existing panel.
- Never silently replace a non-ES|QL panel. Wait for explicit user confirmation before regenerating the dashboard with replacement content.`;

/**
 * Dashboard generation guidance for the upsert shape of the generate dashboard tool. Like the
 * operations guidance, it says nothing about how the current dashboard is referenced or how
 * the result is surfaced. Grid rules are left to the tool's layout step.
 */
export const dashboardUpsertGeneration: DashboardGuidanceModule = {
  guidance,
};
