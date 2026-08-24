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

\`review_dashboard\` has two scopes with different rules. Never call it in the same response as \`generate_dashboard\` — always in a separate turn, after the attachment is persisted.

### Self-review after generating content (scope: "recent_changes")

After any ${dashboardTools.generateDashboard} call that created or edited panel content (operations: \`add_panels\`, \`edit_panels\`, \`add_section\` with inline panels), call ${dashboardTools.reviewDashboard} with scope \`recent_changes\`.

Handle the findings as follows:
- Apply \`critical\` findings automatically via a follow-up \`generate_dashboard\` call — these mean the dashboard is broken or misleading.
- Do **not** apply \`warning\` or \`suggestion\` findings on your own. Summarise them briefly to the user and ask whether they want any of the improvements applied.

Call the \`recent_changes\` review at most **once** per user request. Do not re-review after applying fixes — report what you fixed and move on. Only review again if the user explicitly asks for another review.

Do **not** self-review after operations that only change layout or metadata (\`set_metadata\`, \`move_panels\`, \`update_panel_layouts\`, \`remove_panels\`, control add/remove).

### Auditing an existing dashboard (scope: "full_audit")

When the user asks to review, improve, clean up, or prettify an **existing** dashboard (rather than content you just generated), call ${dashboardTools.reviewDashboard} with scope \`full_audit\`, then run a bounded fix loop (the "once per request" rule above does NOT apply here):

1. Apply \`critical\` and \`warning\` findings via \`generate_dashboard\`, using each finding's \`panel_ids\` to target the fixes. Summarise \`suggestion\` findings to the user and ask instead of applying them.
2. Re-review with scope \`full_audit\`, setting \`focus\` to describe what you just changed.
3. Stop as soon as a review returns zero \`critical\` and \`warning\` findings, and after at most **2** re-reviews either way. Then report what was fixed and what remains.

If a result includes \`unreviewed_panel_ids\`, those panels' per-panel checks did not run — tell the user their review coverage was partial.

The audit only evaluates panels that exist — it never judges whether the dashboard is complete. After the fix loop, assess completeness yourself: explore the underlying indices and, when the data supports valuable additional panels (missing overview KPIs, time-series trends, or breakdowns), propose them to the user before adding anything.
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
