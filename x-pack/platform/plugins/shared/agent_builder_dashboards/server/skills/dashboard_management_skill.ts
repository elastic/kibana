/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { generateDashboardTool } from '../tools';
import { getDashboardPrettifyPromptContent } from './generation_guidance/prettify_guidance';
import { dashboardGeneration } from './generation_guidance';
import { kibanaRendering } from './rendering_guidance';

export const DASHBOARD_PRETTIFY_REFERENCE = {
  name: 'dashboard-prettify',
  relativePath: './prettify',
  content: getDashboardPrettifyPromptContent(),
} as const;

export const DASHBOARD_PRETTIFY_FILE_PATH =
  '/skills/platform/dashboard/dashboard-management/prettify/dashboard-prettify.md';

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

When the user asks to prettify or enhance the attached dashboard, read \`${DASHBOARD_PRETTIFY_FILE_PATH}\` with \`read_file\` and follow that file. The tool updates the attachment in place. Do not create a new dashboard.

${dashboardGeneration.guidance}

${kibanaRendering.guidance}
`,
  referencedContent: [
    DASHBOARD_PRETTIFY_REFERENCE,
    ...(dashboardGeneration.referencedContent ?? []),
    ...(kibanaRendering.referencedContent ?? []),
  ],
  getInlineTools: () => [generateDashboardTool()],
});
