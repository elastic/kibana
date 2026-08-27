/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  defineSkillType,
  type ReferencedContent,
} from '@kbn/agent-builder-server/skills/type_definition';
import { generateDashboardTool, reviewDashboardTool, type GetImageBytes } from '../tools';
import { dashboardGeneration } from './generation_guidance';
import { kibanaRendering } from './rendering_guidance';

export const PRETTIFY_PLAYBOOK_REFERENCE_NAME = 'prettify-playbook';

const PRETTIFY_PLAYBOOK = `## Prettify

When the user asked to prettify this dashboard and an image is attached:

1. Call \`platform.dashboard.review_dashboard\` once. It inspects the image against the same design practices as generate (referenced content \`dashboard-design-practices\`) and returns findings. Do not describe the screenshot yourself.

2. Apply only findings you can fix without rebuilding charts, except the chart-type rules below. False positives are expensive.
   - \`pack_layout\` → one \`update_panel_layouts\` with EVERY panel in the finding's \`fix.panels\` (grid + \`sectionId\` when set). Do not apply a subset. Never shrink a data table — tables stay full-width (w: 24–48, prefer 48) so columns stay readable. If this finding is absent, do not invent a partial layout.
   - \`weak_sections\` → only on a flat dashboard. For each \`fix.sections\` item, \`add_section\` with that \`id\`, \`title\`, and outer \`grid\` (stack \`y\` as 0, 1, 2…). Then \`pack_layout\` moves existing panels in (\`sectionId\` = those ids). Do not create new charts. Do not \`remove_section\`. Keep existing section titles when the catalog already has sections.
   - \`wrong_chart_type\` (invert) → one \`edit_panels\` item whose \`query\` says to switch to \`fix.chartType\` and keep the existing query, metrics, and colors. Pass \`chartType\`.
   - \`one_category_chart\` → one \`edit_panels\` item whose \`query\` says to switch to \`fix.chartType\` (\`metric\` or \`pie\`) and keep the existing query. Pass \`chartType\`. Invert wins on the same panel.
   - \`monotone_chart_types\` → at most 3 \`edit_panels\` from \`fix.changes\`. Keep the primary time series. Same query, metrics, and colors. Pass \`chartType\`. Skip metrics, gauges, data tables, and panels already inverted or converted by one_category_chart.
   - \`weak_controls\` → \`add_controls\` with \`fix.add\` only (\`options_list_control\`, catalog \`field_name\` + \`index\`). Do not \`remove_controls\`. At most 3.
   - \`duplicate_inner_title\` → \`update_panel_layouts\` with \`hide_title: true\` on that panel id. Do not \`edit_panels\`. If \`pack_layout\` is also present, set \`hide_title\` on those same panel entries in that one \`update_panel_layouts\`.
   - \`metric_fill\` → \`update_panel_layouts\` with \`clear_metric_fill: true\` on that panel id. Do not \`edit_panels\`. Merge onto the pack \`update_panel_layouts\` when both are present.
   - \`thin_metric\` → \`update_panel_layouts\` with \`metric_trendline: true\` on that panel id. Do not \`edit_panels\` and do not invent a secondary ES|QL column. Merge onto the pack \`update_panel_layouts\` when both are present.
   - Skip everything else: title phrasing, generic vs technical titles, Kibana chrome (hover actions, toolbars, edit handles), bar/pie color restyles, "could be nicer". \`edit_panels\` with a query that restates the metric **rebuilds the visualization** (new ES|QL, new colors) — never do that on Prettify.
   - Do not add or remove panels unless the user already agreed. If composition looks thin, ask *before* generating.

3. If every finding was skipped, or there are no findings, do not call generate_dashboard. Tell the user no layout or chart-type defects needed a change.

4. Otherwise call \`platform.dashboard.generate_dashboard\` at most once with only the kept operations, in this order: \`add_section\` (ids from weak_sections), \`update_panel_layouts\` (full pack, plus hide_title / clear_metric_fill / metric_trendline on those panel entries), \`edit_panels\` (invert, then one_category_chart, then variety), \`add_controls\`. Do not restyle Lens panels through the inner visualization agent.

5. Do not call review_dashboard again after generate — the image is stale.

Without an image, this is a normal dashboard edit, not Prettify.
`;

const prettifyPlaybookReference: ReferencedContent = {
  name: PRETTIFY_PLAYBOOK_REFERENCE_NAME,
  relativePath: '.',
  content: PRETTIFY_PLAYBOOK,
};

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

## Prettify

When the user asked to prettify this dashboard and an image is attached, read referenced content \`${PRETTIFY_PLAYBOOK_REFERENCE_NAME}\` and follow it. Call \`platform.dashboard.review_dashboard\` once; do not describe the screenshot yourself. Without an image, this is a normal dashboard edit — do not follow that playbook.

${dashboardGeneration.guidance}

${kibanaRendering.guidance}
`,
    referencedContent: [
      prettifyPlaybookReference,
      ...(dashboardGeneration.referencedContent ?? []),
      ...(kibanaRendering.referencedContent ?? []),
    ],
    getInlineTools: async () => {
      const customContentEnabled = await getCustomContentEnabled();
      return [
        generateDashboardTool({ customContentEnabled }),
        reviewDashboardTool({ getImageBytes }),
      ];
    },
  });
