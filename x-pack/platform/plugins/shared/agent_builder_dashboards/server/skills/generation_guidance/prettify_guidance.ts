/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dashboardTools } from '../../../common';
import { getDashboardReviewPromptContent } from './dashboard_guidance';

const hitlGuidance = `## Prettifying a Dashboard

Silently review the attached dashboard against the guidelines below. Review grid positions and composition together. If anything violates (gaps, odd widths, misplaced panels, mixed topics, L-shaped holes), rethink where panels live — do not only nudge a few x/w values. Do not invent panel titles, mixed-role Key Metrics, or custom packing. Do not apply corrections yet. Do not write findings, a problem list, or a preview in chat — issues belong only in the form option descriptions.

Group the issues you agree with into these three categories — omit a category if it has no issues:
1. **Layout** — grid, sizing, gaps, alignment (topic \`grid\`).
2. **Chart styling** — painted chart internals: titles, legends, fills, invented colors (chart-type topics such as \`metric\`, \`xy\`, \`pie\`).
3. **Structure** — sections, controls, and composition (topics \`controls\`, \`composition\`).

If every category is empty, tell the user you found nothing to fix and stop.

Your first output this round must be \`ask_user_question\` alone — no assistant text before or with it.

Call \`ask_user_question\` **once** this round (never in parallel with other tools) with one \`multi_select\` question. Question text only, e.g. "Which improvements should I apply?". One option per non-empty category. Labels are the category names only (\`Layout\`, \`Chart styling\`, \`Structure\`). Put a concise description on each option: one short clause per issue (about 5–10 words), no full diagnosis or panel-by-panel walkthrough. Always add a final **All of them** option. The user can pick any combination, pick All of them, or type a custom description.

After they answer, call ${dashboardTools.generateDashboard} once with \`dashboardAttachmentId\` and batched operations for only the chosen categories (or their description). Treat **All of them** as every non-empty category. If Layout, Structure, or All of them is chosen, rethink where panels live, then \`add_section\` with those panels if needed and \`remove_panels\` the old copies — do not patch a subset. If Chart styling or All of them is chosen and any metric has a panel title, the query that authors that metric MUST include the exact phrase "remove the panel title": put it on \`add_section.panels\` when wrapping the panel into a section, otherwise on \`edit_panels\`. If Structure or All of them is chosen and no time-series XY has legend statistics, the query that authors that trend MUST include the exact phrase "show avg/min/max in the legend" — same rule. Do not \`edit_panels\` a panel you are about to \`remove_panels\`. Do not ask again this round; if leftovers remain, mention them and stop.`;

/**
 * Full Enhance playbook: HITL first, then dashboard and chart review rules.
 * Loaded only via `read_file` on the referenced prettify path.
 */
export const getDashboardPrettifyPromptContent = (): string =>
  [hitlGuidance, getDashboardReviewPromptContent()].filter(Boolean).join('\n\n');
