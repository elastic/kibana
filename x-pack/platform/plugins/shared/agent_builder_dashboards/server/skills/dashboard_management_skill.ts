/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { generateDashboardTool, reviewDashboardTool } from '../tools';
import { dashboardGeneration } from './generation_guidance';
import { kibanaRendering } from './rendering_guidance';
import { dashboardTools } from '../../common';

export const createDashboardManagementSkill = (getCustomContentEnabled: () => Promise<boolean>) =>
  defineSkillType({
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

${dashboardGeneration.guidance}

${kibanaRendering.guidance}

## Dashboard Review Workflow

After any ${dashboardTools.generateDashboard} call that created or edited panel content (operations: \`add_panels\`, \`edit_panels\`, \`add_section\` with inline panels), call ${dashboardTools.reviewDashboard} in a **separate turn** — never in the same response as \`generate_dashboard\`.

Handle the findings as follows:
- Apply \`critical\` findings automatically via a follow-up \`generate_dashboard\` call — these mean the dashboard is broken or misleading.
- Do **not** apply \`warning\` or \`suggestion\` findings on your own. Summarise them briefly to the user and ask whether they want any of the improvements applied.

Call \`review_dashboard\` at most **once** per user request. Do not re-review after applying fixes — report what you fixed and move on. Only review again if the user explicitly asks for another review.

Do **not** call \`review_dashboard\` after operations that only change layout or metadata (\`set_metadata\`, \`move_panels\`, \`update_panel_layouts\`, \`remove_panels\`, control add/remove).
`,
    referencedContent: [
      ...(dashboardGeneration.referencedContent ?? []),
      ...(kibanaRendering.referencedContent ?? []),
    ],
    getInlineTools: async () => {
      const customContentEnabled = await getCustomContentEnabled();
      return [generateDashboardTool({ customContentEnabled }), reviewDashboardTool()];
    },
  });
