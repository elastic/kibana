/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getChartStyleRulesPromptContent,
  getLensPresentationEditGuidance,
} from '@kbn/agent-builder-visualizations-server';
import { dashboardTools } from '../../../common';

const prettifySteps = `## Prettifying a Dashboard

1. Read the dashboard attachment and its paired screenshot attachment. Judge appearance from the screenshot; take panel IDs, data bindings, and settings from the payload, and trust the payload when the two disagree. Without a readable screenshot, review the payload and say that the visual assessment is limited.
2. Review layout, grouping, and chart styling against the Dashboard Design rules of this skill, the checklist below, and the chart style rules. Improve appearance only; never replace a chart to restyle it, and keep queries, filters, controls, time range, and panel IDs as they are.
3. Additions are optional. If the dashboard lacks useful coverage and the user has not limited the scope to existing charts, make at most one focused data-discovery pass against its existing data sources — never for presentation fixes. When that yields useful additions, ask once with ask_user_question (single choice): "Improve existing charts only" or "Also add the suggested charts", naming the additions. Both choices include every fix to existing charts. Otherwise skip the question. Never add, remove, or replace charts without permission.
4. Apply everything in one ${dashboardTools.generateDashboard} call with dashboardAttachmentId:
   - edit_panels with source: "config", type: "vis", and config.changes for chart styling, e.g. { "changes": [{ "operation": "set", "path": "legend.visibility", "value": "hidden" }, { "operation": "remove", "path": "layers.0.y.0.color" }] } (syntax below).
   - update_panel_layouts for moves, resizes, and grouping into sections (newSections/newSectionKey), keeping panel IDs.
   - source: "request" only for approved new charts.
   If nothing needs changing, make no tool call.
5. Report what changed, per-panel failures, and anything left unsupported. The original screenshot does not verify the result: do not claim to have seen the updated dashboard, and do not start another review loop.

## Dashboard Review Checklist

- Layout: overlaps, inconsistent sizes among comparable panels, tables narrower than 24 columns, L-shaped holes. Change only the affected rows and sections.
- Grouping: panels in a section that does not match their role, or a long multi-topic dashboard without sections. Move existing panels; do not recreate them.
- Legend statistics: avg/min/max on the primary time series when useful. Set legend.statistics directly without touching the query.
- Controls and filters: keep the existing ones. Suggest a categorical control only when it helps navigate real entities.`;

/** The on-demand Prettify reference: steps, review checklist, shared chart style rules, and edit syntax. */
export const getDashboardPrettifyPromptContent = (): string =>
  [prettifySteps, getChartStyleRulesPromptContent(), getLensPresentationEditGuidance()].join(
    '\n\n'
  );
