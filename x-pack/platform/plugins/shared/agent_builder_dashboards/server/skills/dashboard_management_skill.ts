/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { generateDashboardTool, reviewPanelsTool, type GetImageBytes } from '../tools';
import { dashboardGeneration } from './generation_guidance';
import { kibanaRendering } from './rendering_guidance';

const PRETTIFY_PLAYBOOK = `
## Prettify

When the user asked to prettify this dashboard and an image is attached:

1. Call \`platform.dashboard.review_panels\` once. It inspects the image and returns panel findings. Do not describe the screenshot yourself.

2. Apply only findings you can fix without rebuilding charts. False positives are expensive.
   - \`disproportionate_size\` → \`update_panel_layouts\` only. Use the finding's \`fix\` grid. Do not edit panel content. Never shrink a data table — tables stay full-width (w: 24–48, prefer 48) so columns stay readable. Skip size findings on tables.
   - \`wrong_chart_type\` only when the type inverts meaning (e.g. pie for a time series) → one \`edit_panels\` item whose \`query\` is the finding's \`fix\` and says to keep the existing query, metrics, and colors. Pass \`chartType\` if the finding names one.
   - Skip everything else: title phrasing, generic vs technical titles, Kibana chrome (hover actions, toolbars, edit handles), color restyles, "could be nicer". \`edit_panels\` with a query that restates the metric **rebuilds the visualization** (new ES|QL, new colors) — never do that on Prettify.
   - Do not add or remove panels unless the user already agreed. If composition looks thin, ask *before* generating.

3. If every finding was skipped, or there are no findings, do not call generate_dashboard. Tell the user no layout or chart-type defects needed a change.

4. Otherwise call \`platform.dashboard.generate_dashboard\` at most once with only the kept operations. Do not restyle Lens panels through the inner visualization agent.

5. Do not call review_panels again after generate — the image is stale.

Without an image, this is a normal dashboard edit, not Prettify.
`;

export const createDashboardManagementSkill = ({
  getCustomContentEnabled,
  getImageBytes,
}: {
  getCustomContentEnabled: () => Promise<boolean>;
  getImageBytes: GetImageBytes;
}) =>
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
${PRETTIFY_PLAYBOOK}
${dashboardGeneration.guidance}

${kibanaRendering.guidance}
`,
    referencedContent: [
      ...(dashboardGeneration.referencedContent ?? []),
      ...(kibanaRendering.referencedContent ?? []),
    ],
    getInlineTools: async () => {
      const customContentEnabled = await getCustomContentEnabled();
      return [
        generateDashboardTool({ customContentEnabled }),
        reviewPanelsTool({ getImageBytes }),
      ];
    },
  });
