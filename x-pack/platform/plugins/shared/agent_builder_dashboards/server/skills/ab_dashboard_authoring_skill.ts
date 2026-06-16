/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { attachDashboardDataTool } from '../tools';
import { dashboardTools } from '../../common';

export const abDashboardAuthoringSkill = defineSkillType({
  id: 'ab-dashboard-authoring',
  name: 'ab-dashboard-authoring',
  basePath: 'skills/platform/dashboard',
  description:
    'Render a composed dashboard inline in Agent Builder by creating a dashboard attachment from manage_dashboard API output.',
  content: `## When to Use This Skill

Use this skill immediately after the manage_dashboard API returns a \`dashboardData\` object and you want to render the dashboard inline for the user in Agent Builder.

## Creating the in-UI preview

Call the \`${dashboardTools.attachDashboardData}\` tool with:
- \`dashboardData\`: the exact \`dashboardData\` object returned by the manage_dashboard API response.
- \`dashboardAttachmentId\` (optional): the \`id\` of the dashboard attachment returned by a previous \`${dashboardTools.attachDashboardData}\` call. Provide it to update that attachment in place; omit it the first time to create a new attachment.

After the tool succeeds:
- Render the returned dashboard attachment inline, as the last part of your response, after any text. Never render individual visualization attachments.
- Remember the returned attachment \`id\` so you can pass it as \`dashboardAttachmentId\` the next time you preview an update to the same dashboard.
`,
  getInlineTools: () => [attachDashboardDataTool()],
});
