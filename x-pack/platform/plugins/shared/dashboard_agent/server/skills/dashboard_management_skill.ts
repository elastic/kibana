/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { manageDashboardTool } from '../tools';
import { dashboardTools } from '../../common';
import { gridLayoutPrompt } from './grid_layout_prompt';
import { dashboardCompositionPrompt } from './dashboard_composition_prompt';

export const dashboardManagementSkill = defineSkillType({
  id: 'dashboard-management',
  name: 'dashboard-management',
  basePath: 'skills/platform/dashboard',
  description:
    'Compose and update in-memory Kibana dashboards using ordered operations and visualization attachment IDs.',
  content: `## When to Use This Skill

Use this skill when:
- A user asks to create a dashboard from one or more visualizations.
- A user asks to update an in-memory dashboard created earlier in the conversation.
- A request involves dashboard metadata, markdown, panel, or section changes.

Do **not** use this skill when:
- The user asks for a standalone visualization rather than a dashboard.
- The user needs help exploring data, fields, or query logic.

## Core Instructions

Build the request for ${dashboardTools.manageDashboard} as an ordered \
\`operations\` array. Operations run in order, so earlier operations should set up state needed by later ones.

For a new dashboard:
- Start with \`set_metadata\` and provide both \`title\` and \`description\`.
- Use \`upsert_markdown\` when a summary panel is useful.
- Add visualization panels with \`add_panels_from_attachments\`.
- Use \`add_section\` when panels naturally group into distinct topics or the dashboard is large enough that sections improve scanability.

For an existing dashboard:
- Reuse \`data.dashboardAttachment.id\` from the latest dashboard tool result as \`dashboardAttachmentId\`.
- Use \`remove_panels\` to remove existing panels by \`uid\`.
- Use \`add_panels_from_attachments\` to add new visualization attachments.
- Use \`update_panels_from_attachments\` to refresh existing dashboard panels after their source visualization attachments have been updated.
- Use \`add_section\` or \`remove_section\` for section changes.
- Use \`set_metadata\` or \`upsert_markdown\` to update dashboard text.

Supported operations:
- \`set_metadata\`: set or update dashboard title and description.
- \`upsert_markdown\`: create or replace the markdown summary panel.
- \`add_panels_from_attachments\`: add panels from visualization attachments, each with explicit \`grid\` coordinates and an optional \`sectionId\`.
- \`update_panels_from_attachments\`: refresh existing panels that were created from the specified visualization attachment IDs while preserving their current \`uid\` and \`grid\`.
- \`add_section\`: create a new section with its own \`grid.y\` and section-relative panel coordinates.
- \`remove_section\`: remove a section by \`uid\` with \`panelAction: "promote" | "delete"\`.
- \`remove_panels\`: remove existing panels by \`uid\`.

After a successful call:
- Render the dashboard attachment inline so the user can see and interact with the dashboard card. Do NOT render individual visualization attachments inline during dashboard composition - only the final dashboard attachment should be rendered.
- Remember \`data.dashboardAttachment.id\` for follow-up updates.
- Use returned \`uid\` values for future panel removals.
- Use returned \`sectionId\` values for future section-targeted changes.
- If \`data.failures\` is present, explain which attachments failed and why.

## Attachments

- A visualization attachment is a previously created visualization artifact identified by \`attachmentId\`.
- \`add_panels_from_attachments\` consumes those visualization attachment IDs and turns them into dashboard panels.
- \`update_panels_from_attachments\` uses visualization attachment IDs to re-resolve and refresh existing dashboard panels that already reference those attachments.
- A successful dashboard call returns a dashboard attachment in \`data.dashboardAttachment\`.
- Use \`data.dashboardAttachment.id\` as \`dashboardAttachmentId\` when updating that dashboard later.
- Never invent \`dashboardAttachmentId\`, \`uid\`, or \`sectionId\`. Reuse the values returned by prior tool results.

${dashboardCompositionPrompt}

${gridLayoutPrompt}

## Edge Cases

- If a visualization attachment is missing or cannot be resolved, do not invent a replacement attachment ID. Call the tool only with valid attachment IDs and report unresolved attachments clearly.
- If the user asks to update a dashboard but the latest \`dashboardAttachmentId\` is not available in conversation context, ask which dashboard they mean or offer to create a new one.
- There is no move operation. To reposition panels or fix gaps after removals, remove the affected panels and add them again with updated \`grid\` coordinates.
- If a user updates an existing visualization and wants matching dashboard panels to reflect the latest visualization state, use \`update_panels_from_attachments\` instead of removing and re-adding those panels.
- If the tool returns partial failures, explain which attachments failed and include the reported error for each one.
`,
  getInlineTools: () => [manageDashboardTool()],
});
