/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { gridLayoutPrompt } from './grid_layout_prompt';
import { dashboardCompositionPrompt } from './dashboard_composition_prompt';

export const dashboardManagementSkill = defineSkillType({
  id: 'dashboard-management',
  name: 'dashboard-management',
  basePath: 'skills/platform/dashboard',
  description:
    'Compose and update Kibana dashboards, involving panel creation, layout, and inline visualization editing.',
  content: `## When to Use This Skill

Use this skill when:
- A user asks to find, list, inspect, or modify existing Kibana dashboards.
- A user asks to create a dashboard from one or more visualizations.
- A user asks to update a dashboard created earlier in the conversation.
- A request involves dashboard metadata, markdown, panel, or section changes.

Do **not** use this skill when:
- The user asks for a standalone visualization and does not mention a dashboard context.
- The user needs help exploring data, fields, or query logic.

## Core Instructions

Every dashboard MUST have a non-empty \`title\`. If the working dashboard's title is empty, missing, or \`"User Dashboard"\`, your first operation MUST be \`set_metadata\` with a title you invent from its contents.

For dashboard discovery:
- When a user asks what dashboards are available, search for existing saved dashboards with \`platform.core.sml_search\`.
- Use specific keywords from the user's request. For a broad listing of available dashboards, you may use \`keywords: ["*"]\`.
- Summarize matches in plain language by title and description, and include lightweight structure when available such as panel and section counts.
- Do **not** attach dashboards by default when only listing or comparing available dashboards.
- When the user wants to inspect or modify a saved dashboard, attach it with \`platform.core.sml_attach\` using the exact \`chunk_id\` from the search result.
- After attaching a saved dashboard, treat the returned dashboard attachment as the editable working copy. Use its \`attachment_id\` in conversation context for later dashboard updates.

## Calling the manage_dashboard API

Compose and update dashboards by calling the manage_dashboard REST API with curl:

\`\`\`bash
curl -s -X POST 'http://localhost:5601/boh/api/agent_builder_dashboards/manage_dashboard' \\
  -H 'Content-Type: application/json' \\
  -H 'kbn-xsrf: true' \\
  -H 'elastic-api-version: 2023-10-31' \\
  -u elastic:changeme \\
  -d '{"dashboardData": <from previous response, or omit for new dashboard>, "operations": [...]}'
\`\`\`

Request body:
- \`operations\`: an ordered array of operations to apply. Operations run in order, so earlier operations should set up state needed by later ones.
- \`dashboardData\`: the dashboard to modify. Omit it to create a new dashboard. To update a dashboard, pass the exact \`dashboardData\` object returned by your previous response.

The response body is:

\`\`\`json
{ "dashboardData": { "title": "...", "description": "...", "panels": [...] }, "failures": [...] }
\`\`\`

State management: there is no server-side session. You carry the dashboard state yourself — take the \`dashboardData\` object from each response and pass it back as the \`dashboardData\` input on your next call. Omit \`dashboardData\` only when creating a brand-new dashboard.

When a dashboard needs sections, prefer a single batched call:
1. Use \`add_section\` with its optional \`panels\` array when you already know the inline visualizations that belong in the new section.
2. Use a follow-up \`add_panels\` with per-item \`sectionId\` only when you need to target an existing section returned by an earlier response.

Do **not** make one manage_dashboard call per section unless a later step truly depends on the result of an earlier section-specific change.

For a new dashboard:
- Start with \`set_metadata\` and provide both \`title\` and \`description\`.
- Use \`add_panels\` to add panels in one batched operation. Each item declares a \`kind\`: \`markdown\` for a summary or context panel, \`visualization\` for a Lens visualization created inline from natural language, or \`attachment\` for a panel sourced from an existing visualization attachment by \`attachmentId\`.
- Use \`add_section\` when panels naturally group into distinct topics or the dashboard is large enough that sections improve scanability. Include \`panels\` on the section when you can create that section's initial panels immediately.

For an existing dashboard:
- Pass the \`dashboardData\` object from the latest response back as the \`dashboardData\` input.
- Use \`remove_panels\` to remove existing panels by \`id\`.
- Use \`add_panels\` to add markdown, attached visualization, or inline Lens visualization panels.
- Use \`edit_panels\` to change existing panel content in place by \`panelId\`. Each item declares \`kind: "visualization"\` for ES|QL-backed Lens panels or \`kind: "markdown"\` for markdown panels.
- If a requested change targets a DSL, form-based, or other non-ES|QL Lens visualization panel, explicitly tell the user direct editing is not supported and ask for confirmation before replacing that panel with a newly created ES|QL-based Lens panel.
- Use \`update_panel_layouts\` to resize, reposition, or move existing panels between top-level and sections without changing panel content.
- Use \`add_section\` or \`remove_section\` for section changes.
- Use \`set_metadata\` to update the dashboard title/description, \`edit_panels\` with \`kind: "markdown"\` to replace an existing markdown panel's content, or \`add_panels\` with \`kind: "markdown"\` to add a new markdown panel.

Supported operations:
- \`set_metadata\`: set or update dashboard title and description.
- \`add_panels\`: add panels in one batched operation. Each item declares \`kind: "markdown"\`, \`kind: "visualization"\`, or \`kind: "attachment"\`.
- Combine markdown summary, attached visualizations, and inline ES|QL visualizations in one \`add_panels\` operation when they belong to the same dashboard layout, even when items target different \`sectionId\` values.
- \`edit_panels\`: update existing panel content in place by \`panelId\`. Each item declares \`kind: "visualization"\` for ES|QL-backed Lens visualization panels or \`kind: "markdown"\` for markdown panels. Placement (grid and sectionId) is preserved.
- \`update_panel_layouts\`: resize, reposition, or move existing panels by \`panelId\` by updating \`grid\` and optionally changing \`sectionId\`.
- \`add_section\`: create a new section with its own \`grid.y\`, and optionally create that section's initial panels (markdown, attachment, or inline visualization) with \`panels\`. Those nested panel grids are section-relative and do not need a \`sectionId\`.
- \`remove_section\`: remove a section by \`id\` with \`panelAction: "promote" | "delete"\`.
- \`remove_panels\`: remove existing panels by \`id\`.

After a successful call:
- Carry the returned \`dashboardData\` object forward as the \`dashboardData\` input for any follow-up updates.
- Use \`id\` values from \`dashboardData.panels\` for future panel removals.
- Use section \`id\` values for future section-targeted changes.
- If \`failures\` is present in the response, explain which panel creations failed and report each returned \`type\`, \`identifier\`, and \`error\`.

## Operations payload schema

Every request sends \`{ "dashboardData"?: <object>, "operations": [ ... ] }\`. Each entry in \`operations\` is one object discriminated by its \`operation\` field; they run in array order. Fields marked \`?\` are optional.

**Shared building blocks**

- \`grid\` — panel position/size: \`{ "x": number, "y": number, "w": integer 1–48, "h": integer ≥1 }\`.
- **panelInput** — one of three shapes, discriminated by \`kind\`:
  - \`{ "kind": "markdown", "markdownContent": string, "grid": grid }\`
  - \`{ "kind": "attachment", "attachmentId": string, "grid": grid }\`
  - \`{ "kind": "visualization", "query": string, "index"?: string, "chartType"?: chartType, "esql"?: string, "grid": grid }\`
    - \`query\` (required): natural-language description of the visualization.
    - \`index\`?: index/alias/datastream to target; omit to auto-discover.
    - \`chartType\`?: one of \`metric | gauge | tagcloud | xy | region_map | heatmap | datatable | pie | treemap | waffle | mosaic\`.
    - \`esql\`?: an ES|QL query. Only pass ES|QL that came from the user or another tool — never invent one.

**The 7 operations**

1. \`set_metadata\` — \`{ "operation": "set_metadata", "title"?: string, "description"?: string }\`. \`title\` must be non-empty when provided.
2. \`add_panels\` — \`{ "operation": "add_panels", "panels": [ <panelInput + optional "sectionId": string>, ... ] }\` (≥1 panel). \`sectionId\` places the panel in an existing section (create it first with \`add_section\`); omit for top level.
3. \`edit_panels\` — \`{ "operation": "edit_panels", "panels": [ <editItem>, ... ] }\` (≥1 panel). \`editItem\` is discriminated by \`kind\`:
   - \`{ "kind": "visualization", "panelId": string, "query": string, "chartType"?: chartType, "esql"?: string }\` — note: **no \`grid\`, no \`index\`** (placement is preserved).
   - \`{ "kind": "markdown", "panelId": string, "markdownContent": string }\`
   - Only ES|QL-backed Lens and markdown panels are editable; edit each \`panelId\` at most once per operation.
4. \`update_panel_layouts\` — \`{ "operation": "update_panel_layouts", "panels": [ { "panelId": string, "grid"?: grid, "sectionId"?: string | null }, ... ] }\` (≥1 panel). \`grid\` omitted = keep current size/position; \`sectionId\` string = move into that existing section, \`null\` = promote to top level, omitted = keep current location.
5. \`add_section\` — \`{ "operation": "add_section", "title": string, "grid": { "y": integer ≥0 }, "panels"?: [ <panelInput>, ... ] }\`. The section \`grid\` has **only \`y\`**. Inline \`panels\` use the panelInput shapes **without \`sectionId\`**, and their grids are section-relative (each section starts at \`y: 0\`).
6. \`remove_section\` — \`{ "operation": "remove_section", "id": string, "panelAction": "promote" | "delete" }\`. \`promote\` keeps the section's panels at top level; \`delete\` discards them.
7. \`remove_panels\` — \`{ "operation": "remove_panels", "panelIds": [ string, ... ] }\` (≥1 id).

### Worked example — create a new dashboard

Omit \`dashboardData\` to create. This sets metadata, adds three KPI metrics and a full-width time-series at the top level, then a section containing a breakdown chart:

\`\`\`json
{
  "operations": [
    {
      "operation": "set_metadata",
      "title": "HTTP Traffic Overview",
      "description": "Request volume and latency for the web tier."
    },
    {
      "operation": "add_panels",
      "panels": [
        { "kind": "visualization", "query": "total request count", "chartType": "metric", "grid": { "x": 0, "y": 0, "w": 16, "h": 6 } },
        { "kind": "visualization", "query": "average response time in ms", "chartType": "metric", "grid": { "x": 16, "y": 0, "w": 16, "h": 6 } },
        { "kind": "visualization", "query": "error rate percentage", "chartType": "metric", "grid": { "x": 32, "y": 0, "w": 16, "h": 6 } },
        { "kind": "visualization", "query": "request count over time", "chartType": "xy", "grid": { "x": 0, "y": 6, "w": 48, "h": 14 } }
      ]
    },
    {
      "operation": "add_section",
      "title": "Breakdowns",
      "grid": { "y": 20 },
      "panels": [
        { "kind": "visualization", "query": "top 10 URLs by request count", "chartType": "xy", "grid": { "x": 0, "y": 0, "w": 24, "h": 12 } }
      ]
    }
  ]
}
\`\`\`

To update afterwards, pass the response's \`dashboardData\` back alongside a new \`operations\` array (for example \`edit_panels\`, \`add_panels\`, or \`update_panel_layouts\`), reusing the \`id\` values from \`dashboardData.panels\`.

## Attachments

- A visualization attachment is a previously created visualization artifact identified by \`attachmentId\`.
- \`add_panels\` with \`kind: "attachment"\` consumes those visualization attachment IDs and turns them into dashboard panels.
- \`add_panels\` with \`kind: "visualization"\` and \`edit_panels\` with \`kind: "visualization"\` work directly on dashboard panels and do not create standalone visualization attachments.
- A successful manage_dashboard call returns the full \`dashboardData\` object. Carry it forward as the \`dashboardData\` input when updating that dashboard later.
- Never invent panel \`id\` or section \`id\` values. Reuse the values returned in the prior response's \`dashboardData\`.

${dashboardCompositionPrompt}

${gridLayoutPrompt}

## Edge Cases

- If a visualization attachment is missing or cannot be resolved, do not invent a replacement attachment ID. Call the API only with valid attachment IDs and report unresolved attachments clearly.
- If the user asks to update a dashboard but you do not have the latest \`dashboardData\` for it, ask which dashboard they mean or offer to create a new one.
- Use \`update_panel_layouts\` when the user wants to resize, reposition, or move panels without changing panel content.
- If a user wants to change a dashboard panel's content, prefer \`edit_panels\` over removing and re-adding the panel. \`edit_panels\` works for ES|QL-backed Lens visualization panels (\`kind: "visualization"\`) and markdown panels (\`kind: "markdown"\`).
- Attached dashboards can include DSL-based, form-based, or other non-ES|QL Lens panels. Do not attempt to edit those panels directly.
- If the user asks to modify a DSL visualization or any other non-ES|QL panel, explicitly explain that direct editing is not supported, propose recreating and replacing it as a new ES|QL-based Lens chart, and ask for confirmation before you remove or replace the existing panel.
- Never silently follow a remove-and-recreate flow for a non-ES|QL panel. Wait for explicit user confirmation before calling \`remove_panels\`, \`add_panels\`, or any other replacement operations.
- If the response includes partial \`failures\`, explain which panel creations failed and include the reported \`type\`, \`identifier\`, and \`error\` for each one.
`,
});
