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
import { gridLayoutPrompt } from './grid_layout_prompt';
import { dashboardCompositionPrompt } from './dashboard_composition_prompt';

export const dashboardManagementSkill = defineSkillType({
  id: 'dashboard-management',
  name: 'dashboard-management',
  basePath: 'skills/platform/dashboard',
  description:
    'Compose and update in-memory Kibana dashboards using ordered operations, visualization attachments, and inline visualization editing.',
  content: `## When to Use This Skill

Use this skill when:
- A user asks to find, list, inspect, or modify existing Kibana dashboards.
- A user asks to create a dashboard from one or more visualizations.
- A user asks to update an in-memory dashboard created earlier in the conversation.
- A request involves dashboard metadata, markdown, panel, or section changes.
- The user clicks a suggested action to "Create new dashboard" or "Add to existing dashboard" after an A2UI surface.

Do **not** use this skill when:
- The user asks for a standalone visualization rather than a dashboard.
- The user needs help exploring data, fields, or query logic.

## Creating a Dashboard from a Prior A2UI Summary

When the user asks to create a dashboard from an A2UI summary rendered earlier in the conversation, the dashboard should **mirror the summary's structure and data** rather than re-interpreting the data from scratch. Follow these rules:

1. **Match the summary 1:1.** Every A2UI component that displays data should have a corresponding dashboard panel:
   - Each **Stat** component becomes a \`metric\` chart type panel in \`create_visualization_panels\`.
   - Each **Table** component becomes a \`datatable\` chart type panel in \`create_visualization_panels\`.
   - Each **VisualizationRef** component is added via \`add_panels_from_attachments\` using its \`attachment_id\`.
2. **Do not add panels** that were not present in the summary unless the user explicitly requests a richer dashboard.
3. **Do not omit panels** that appeared in the summary.
4. **Reuse ES|QL queries.** If the A2UI surface \`data_model\` contains a \`_queries\` metadata key, or if prior \`${platformCoreTools.executeEsql}\` / \`${platformCoreTools.generateEsql}\` tool results are in context, pass those queries via the \`esql\` parameter on each panel in \`create_visualization_panels\`. Also pass the \`index\` from the same source. This prevents independent query regeneration and keeps the dashboard data consistent with the summary.
5. **Preserve panel ordering.** Follow the visual hierarchy from the summary: headline KPIs first, then trend charts, then breakdowns and detail tables.
6. **Use the summary's sections** as dashboard sections when the summary groups components into distinct Card containers or labeled groups.

## Core Instructions

For dashboard discovery:
- When a user asks what dashboards are available, search for existing saved dashboards with \`platform.core.sml_search\`.
- Use specific keywords from the user's request. For a broad listing of available dashboards, you may use \`keywords: ["*"]\`.
- Summarize matches in plain language by title and description, and include lightweight structure when available such as panel and section counts.
- Do **not** attach dashboards by default when only listing or comparing available dashboards.
- When the user wants to inspect or modify a saved dashboard, attach it with \`platform.core.sml_attach\` using the exact \`chunk_id\` from the search result.
- After attaching a saved dashboard, treat the returned dashboard attachment as the editable working copy. Use its \`attachment_id\` in conversation context for later dashboard updates.

Build the request for ${dashboardTools.manageDashboard} as an ordered \
\`operations\` array. Operations run in order, so earlier operations should set up state needed by later ones.

When a dashboard needs sections, prefer a single batched call:
1. Use \`add_section\` with its optional \`panels\` array when you already know the inline visualizations that belong in the new section.
2. Use follow-up \`create_visualization_panels\` or \`add_panels_from_attachments\` with \`sectionId\` only when you need to target an existing section returned by an earlier tool result.

Do **not** make one ${dashboardTools.manageDashboard} call per section unless a later step truly depends on the result of an earlier section-specific change.

For a new dashboard:
- Start with \`set_metadata\` and provide both \`title\` and \`description\`.
- Use \`add_markdown\` when a summary panel is useful.
- Use \`create_visualization_panels\` to create Lens visualization panels inline from natural language.
- Use \`add_panels_from_attachments\` when the user already has standalone visualization attachments they want to place on the dashboard.
- Use \`add_section\` when panels naturally group into distinct topics or the dashboard is large enough that sections improve scanability. Include \`panels\` on the section when you can create that section's inline visualizations immediately.

For an existing dashboard:
- Reuse \`data.dashboardAttachment.id\` from the latest dashboard tool result as \`dashboardAttachmentId\`.
- Use \`remove_panels\` to remove existing panels by \`id\`.
- Use \`create_visualization_panels\` to add new Lens visualization panels inline.
- Use \`edit_visualization_panels\` only to change existing ES|QL-backed Lens visualization panels in place by \`panelId\`.
- If a requested change targets a DSL, form-based, or other non-ES|QL panel, explicitly tell the user direct editing is not supported and ask for confirmation before replacing that panel with a newly created ES|QL-based Lens panel.
- Use \`update_panel_layouts\` to resize, reposition, or move existing panels between top-level and sections without changing panel content.
- Use \`add_panels_from_attachments\` to add existing standalone visualization attachments.
- Use \`add_section\` or \`remove_section\` for section changes.
- Use \`set_metadata\` or \`add_markdown\` to update dashboard text.

Supported operations:
- \`set_metadata\`: set or update dashboard title and description.
- \`add_markdown\`: add a markdown summary panel.
- \`add_panels_from_attachments\`: add panels from visualization attachments, each with explicit \`grid\` coordinates and an optional \`sectionId\`.
- \`create_visualization_panels\`: create Lens visualization panels inline from natural language, with optional \`chartType\`, \`index\`, and \`esql\`.
- Batch multiple panel creations into the same \`create_visualization_panels\` operation whenever they can be planned together, even when they target different \`sectionId\` values.
- \`edit_visualization_panels\`: update existing ES|QL-backed Lens visualization panels by \`panelId\`, preserving their current placement.
- \`update_panel_layouts\`: resize, reposition, or move existing panels by \`panelId\` by updating \`grid\` and optionally changing \`sectionId\`.
- \`add_section\`: create a new section with its own \`grid.y\`, and optionally create that section's initial inline Lens visualization panels with \`panels\`. Those nested panel grids are section-relative and do not need a \`sectionId\`.
- \`remove_section\`: remove a section by \`id\` with \`panelAction: "promote" | "delete"\`.
- \`remove_panels\`: remove existing panels by \`id\`.

After a successful call:
- Render the dashboard attachment inline so the user can see and interact with the dashboard card. Do NOT render individual visualization attachments inline during dashboard composition - only the final dashboard attachment should be rendered.
- Remember \`data.dashboardAttachment.id\` for follow-up updates.
- Use returned \`id\` values for future panel removals.
- Use returned \`sectionId\` values for future section-targeted changes.
- If \`data.failures\` is present, explain which attachments failed and why.
- Call \`${platformCoreTools.suggestFollowUps}\` with relevant next steps. When the dashboard was loaded from a saved object (has a known saved object ID from \`sml_search\` or \`sml_attach\`), include a navigation link: \`{"label": "Open dashboard", "prompt": "Open the dashboard", "url": "/app/dashboards#/view/<savedObjectId>", "icon": "dashboardApp"}\`. For newly created in-memory dashboards, suggest prompt actions instead (e.g. "Add more panels", "Customize layout").

## Attachments

- A visualization attachment is a previously created visualization artifact identified by \`attachmentId\`.
- \`add_panels_from_attachments\` consumes those visualization attachment IDs and turns them into dashboard panels.
- \`create_visualization_panels\` and \`edit_visualization_panels\` work directly on dashboard panels and do not create standalone visualization attachments.
- A successful dashboard call returns a dashboard attachment in \`data.dashboardAttachment\`.
- Use \`data.dashboardAttachment.id\` as \`dashboardAttachmentId\` when updating that dashboard later.
- Never invent \`dashboardAttachmentId\`, \`id\`, or \`sectionId\`. Reuse the values returned by prior tool results.

${dashboardCompositionPrompt}

${gridLayoutPrompt}

## Edge Cases

- If a visualization attachment is missing or cannot be resolved, do not invent a replacement attachment ID. Call the tool only with valid attachment IDs and report unresolved attachments clearly.
- If the user asks to update a dashboard but the latest \`dashboardAttachmentId\` is not available in conversation context, ask which dashboard they mean or offer to create a new one.
- Use \`update_panel_layouts\` when the user wants to resize, reposition, or move panels without changing panel content.
- If a user wants to change a dashboard panel's visualization semantics, prefer \`edit_visualization_panels\` over removing and re-adding the panel, but only for ES|QL-backed Lens panels.
- Attached dashboards can include DSL-based, form-based, or other non-ES|QL panels. Do not attempt to edit those panels directly.
- If the user asks to modify a DSL visualization or any other non-ES|QL panel, explicitly explain that direct editing is not supported, propose recreating and replacing it as a new ES|QL-based Lens chart, and ask for confirmation before you remove or replace the existing panel.
- Never silently follow a remove-and-recreate flow for a non-ES|QL panel. Wait for explicit user confirmation before calling \`remove_panels\`, \`create_visualization_panels\`, or any other replacement operations.
- If the tool returns partial failures, explain which attachments failed and include the reported error for each one.
`,
  getRegistryTools: () => [platformCoreTools.suggestFollowUps],
  getInlineTools: () => [manageDashboardTool()],
});
