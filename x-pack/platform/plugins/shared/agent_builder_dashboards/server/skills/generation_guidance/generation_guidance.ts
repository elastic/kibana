/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dashboardTools } from '../../../common';
import { dashboardDesignGuidancePrompt } from './design';

/**
 * Environment-agnostic dashboard *generation* guidance.
 *
 * This block describes how to build a dashboard. It deliberately says nothing about how the current
 * dashboard is referenced or how the result is returned/surfaced. Those are
 * environment-specific and avoided here so the block can be reused across
 * environments. Pair it with an environment-specific rendering guidance block
 * (e.g. the Kibana one) that explains how the generated dashboard is surfaced.
 */
export const dashboardGenerationGuidance = `## Building a Dashboard

The ${dashboardTools.generateDashboard} tool builds the resulting dashboard from the current dashboard (if any) plus an ordered \`operations\` array. This section describes the \`operations\` vocabulary; see the environment workflow below for how the current dashboard is referenced and how the result is surfaced.

Every dashboard MUST have a non-empty \`title\`. If the current dashboard's title is empty, missing, or \`"User Dashboard"\`, your first operation MUST be \`set_metadata\` with a title you invent from its contents.

Operations run in order, so earlier operations should set up state needed by later ones. Batch all operations into a single ${dashboardTools.generateDashboard} call whenever possible.

When a dashboard needs sections, prefer a single batched call:
1. Use \`add_section\` with its optional \`panels\` array when you already know the panels that belong in the new section.
2. Use a follow-up \`add_panels\` with per-item \`sectionId\` only when you need to target an existing section returned by an earlier tool result.

For a new dashboard:
- Start with \`set_metadata\` and provide both \`title\` and \`description\`.
- Use \`add_panels\` to add panels in one batched operation. Each item declares a \`kind\`: \`markdown\` for a summary or context panel, \`panelRequest\` for a Lens visualization created inline from natural language, or \`panelConfig\` for a panel built from an already-resolved panel configuration (e.g. an existing visualization's config).
- Use \`add_section\` when panels naturally group into distinct topics or the dashboard is large enough that sections improve scanability. Include \`panels\` on the section when you can create that section's initial panels immediately.

For an existing dashboard:
- Use \`remove_panels\` to remove existing panels by \`id\`.
- Use \`add_panels\` to add markdown, resolved-config, or inline Lens visualization panels.
- Use \`edit_panels\` to change existing panel content in place by \`panelId\`. Each item declares \`kind: "panelRequest"\` for ES|QL-backed Lens panels or \`kind: "markdown"\` for markdown panels.
- If a requested change targets a DSL, form-based, or other non-ES|QL Lens visualization panel, explicitly tell the user direct editing is not supported and ask for confirmation before replacing that panel with a newly created ES|QL-based Lens panel.
- Use \`update_panel_layouts\` to resize, reposition, or move existing panels between top-level and sections without changing panel content.
- Use \`add_section\` or \`remove_section\` for section changes.
- Use \`set_metadata\` to update the dashboard title/description, \`edit_panels\` with \`kind: "markdown"\` to replace an existing markdown panel's content, or \`add_panels\` with \`kind: "markdown"\` to add a new markdown panel.

Supported operations:
- \`set_metadata\`: set or update dashboard title and description.
- \`add_panels\`: add panels in one batched operation. Each item declares \`kind: "markdown"\`, \`kind: "panelRequest"\`, or \`kind: "panelConfig"\`.
- Combine markdown summary, resolved-config panels, and inline ES|QL visualizations in one \`add_panels\` operation when they belong to the same dashboard layout, even when items target different \`sectionId\` values.
- \`edit_panels\`: update existing panel content in place by \`panelId\`. Each item declares \`kind: "panelRequest"\` for ES|QL-backed Lens visualization panels or \`kind: "markdown"\` for markdown panels. Placement (grid and sectionId) is preserved.
- \`update_panel_layouts\`: resize, reposition, or move existing panels by \`panelId\` by updating \`grid\` and optionally changing \`sectionId\`.
- \`add_section\`: create a new section with its own \`grid.y\`, and optionally create that section's initial panels (markdown, resolved-config, or inline visualization) with \`panels\`. Those nested panel grids are section-relative and do not need a \`sectionId\`.
- \`remove_section\`: remove a section by \`id\` with \`panelAction: "promote" | "delete"\`.
- \`remove_panels\`: remove existing panels by \`id\`.

## Panel Inputs

- \`kind: "panelRequest"\` (in \`add_panels\`/\`add_section\`) and \`edit_panels\` with \`kind: "panelRequest"\` create or edit Lens panels inline from natural language / ES|QL. This is the correct way to create a new visualization from a query — supply \`query\` (and optionally \`esql\`), and the tool resolves it into a valid Lens panel for you.
- \`kind: "panelConfig"\` adds a panel from an already-resolved configuration. Supply the panel \`type\` (\`"vis"\` for a Lens visualization, \`"markdown"\` for a markdown panel) and \`config\` directly (for example, the visualization config you obtained from an existing visualization). The generation tool never reads an attachment or saved-object store, so all external content must already be resolved into \`config\` before you call it. Do **not** hand-build a Lens \`config\` for a new visualization here — use \`kind: "panelRequest"\` instead.

${dashboardDesignGuidancePrompt}

## Generation Edge Cases

- Never invent a \`panelConfig\` payload for content you have not actually resolved. If you cannot obtain a panel's configuration, report it clearly instead of fabricating one.
- Use \`update_panel_layouts\` when the user wants to resize, reposition, or move panels without changing panel content.
- If a user wants to change a dashboard panel's content, prefer \`edit_panels\` over removing and re-adding the panel. \`edit_panels\` works for ES|QL-backed Lens visualization panels (\`kind: "panelRequest"\`) and markdown panels (\`kind: "markdown"\`).
- A dashboard can include DSL-based, form-based, or other non-ES|QL Lens panels. Do not attempt to edit those panels directly.
- If the user asks to modify a DSL visualization or any other non-ES|QL panel, explicitly explain that direct editing is not supported, propose recreating and replacing it as a new ES|QL-based Lens chart, and ask for confirmation before you remove or replace the existing panel.
- Never silently follow a remove-and-recreate flow for a non-ES|QL panel. Wait for explicit user confirmation before regenerating the dashboard with replacement operations.`;
