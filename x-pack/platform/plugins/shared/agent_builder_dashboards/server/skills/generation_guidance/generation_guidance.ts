/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getChartTypeSelectionPromptContent } from '@kbn/agent-builder-visualizations-server';
import { dashboardTools } from '../../../common';
import type { DashboardGuidanceModule } from '../guidance_module';
import { dashboardDesignGuidancePrompt } from './design';

const chartTypeSelectionGuidance = getChartTypeSelectionPromptContent();

const guidance = `## Building a Dashboard

The ${dashboardTools.generateDashboard} tool builds the resulting dashboard from the current dashboard (if any) plus an ordered \`operations\` array. This section describes the \`operations\` vocabulary; see the environment workflow below for how the current dashboard is referenced and how the result is surfaced.

Every dashboard MUST have a non-empty \`title\`. If the current dashboard's title is empty, missing, or \`"User Dashboard"\`, your first operation MUST be \`set_metadata\` with a title you invent from its contents.

Operations run in order, so earlier operations should set up state needed by later ones. Batch all operations into a single ${dashboardTools.generateDashboard} call whenever possible.

When a dashboard needs sections, prefer a single batched call:
1. Use \`add_section\` with its optional \`panels\` array when you already know the panels that belong in the new section.
2. Use a follow-up \`add_panels\` with per-item \`sectionId\` only when you need to target an existing section returned by an earlier tool result.

For a new dashboard:
- Start with \`set_metadata\` and provide both \`title\` and \`description\`. Only include \`time_range\` when the user explicitly named a specific time window (e.g. "last 7 days", "May 20–24"). Do not set it otherwise — a data-aware default is applied automatically.
- Use \`add_panels\` to add panels in one batched operation. A single \`add_panels\` call may mix panel kinds and target different \`sectionId\` values, so batch related panels together.
- Use \`add_section\` when panels naturally group into distinct topics or the dashboard is large enough that sections improve scanability. Include \`panels\` on the section when you can create that section's initial panels immediately.

For an existing dashboard:
- Prefer \`edit_panels\` to change existing panel content in place rather than removing and re-adding a panel.
- If a requested change targets a DSL, form-based, or other non-ES|QL Lens visualization panel, explicitly tell the user direct editing is not supported and ask for confirmation before replacing that panel with a newly created ES|QL-based Lens panel.
- Use \`update_panel_layouts\` to resize, reposition, or move existing panels between top-level and sections without changing panel content.

## Panel Inputs

- Use \`source: "request"\` to create or edit a Lens or Vega panel from a natural-language / ES|QL query — this is the only correct way to make a **new** visualization. Never hand-build a visualization \`config\` for a new visualization.
- Use \`source: "config"\` only for content you have already resolved (an existing visualization's config, or markdown). The generation tool never reads an attachment or saved-object store, so the config must be supplied directly.

## Chart Type Guidance

For every new Lens panel, choose and pass \`chartType\`; it is required. For a new Vega panel, \`chartType\` is an optional authoring hint — omit it when no Lens chart type represents the requested visualization. On edits, \`chartType\` is optional because the existing panel configuration provides the current visual form. When editing a Lens panel, omit \`chartType\` to preserve its current chart family; provide a new \`chartType\` when the request changes the chart family, such as from \`xy\` to \`pie\`.

${chartTypeSelectionGuidance}

${dashboardDesignGuidancePrompt}

## ES|QL

Omit the \`esql\` field on visualization panels unless you received a validated query from a prior tool result or the user pasted one explicitly. Do not write or derive ES|QL yourself — the tool generates it from the natural language \`query\`.

## Controls

Controls are interactive filters pinned above the dashboard that let users explore data without editing queries. Add them with \`add_controls\` and remove them by id with \`remove_controls\`.

**When building a new dashboard from scratch**, proactively add 3–5 \`options_list_control\` dropdowns for the most useful categorical fields. Pick fields that appear in panel \`BY\` / \`WHERE\` clauses, prefer low-cardinality keyword fields (e.g. \`service.name\`, \`host.name\`, \`env\`, \`region\`, \`kubernetes.namespace\`, \`http.response.status_code\`). Avoid high-cardinality identifiers (trace IDs, request IDs, UUIDs).

Do not add controls to dashboards already scoped to a single entity (one host, one service, etc.).

**Control types:**
- \`options_list_control\` — dropdown for categorical / keyword fields. The most common type (95% of cases).
- \`range_slider_control\` — numeric range slider. Add sparingly, only when filtering by a numeric threshold is useful across multiple panels (e.g. \`latency\`, \`bytes\`, \`duration\`).
- \`time_slider_control\` — global time sub-range picker. Add at most one per dashboard, only when time-range narrowing within the global window is useful.

**Required fields per control:**
- \`type\`: one of the three above.
- \`field_name\` (not for \`time_slider_control\`): exact field name as it appears in the panel queries (e.g. \`"service.name"\`).
- \`index\` (not for \`time_slider_control\`): same index as the dashboard panels (e.g. \`"logs-*"\`).
- \`title\` (optional, \`options_list_control\` and \`range_slider_control\` only): human-readable label shown above the control (e.g. \`"Service"\`).

**Defaults applied by the server:** \`width: "medium"\`, \`grow: true\` (fills available horizontal space). Override only if the user asks.

**Removing controls:** use \`remove_controls\` with the \`id\` values from the \`controls[]\` list in the tool result.

## Generation Edge Cases

- Never invent a \`source: "config"\` payload for content you have not actually resolved. If you cannot obtain a panel's configuration, report it clearly instead of fabricating one.
- Use \`update_panel_layouts\` when the user wants to resize, reposition, or move panels without changing panel content.
- If a user wants to change a dashboard panel's content, prefer \`edit_panels\` over removing and re-adding the panel. \`edit_panels\` works for ES|QL-backed Lens visualization panels (\`source: "request"\`) and markdown panels (\`source: "config"\`, \`type: "markdown"\`).
- A dashboard can include DSL-based, form-based, or other non-ES|QL Lens panels. Do not attempt to edit those panels directly.
- If the user asks to modify a DSL visualization or any other non-ES|QL panel, explicitly explain that direct editing is not supported, propose recreating and replacing it as a new ES|QL-based Lens chart, and ask for confirmation before you remove or replace the existing panel.
- Never silently follow a remove-and-recreate flow for a non-ES|QL panel. Wait for explicit user confirmation before regenerating the dashboard with replacement operations.`;

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
};
