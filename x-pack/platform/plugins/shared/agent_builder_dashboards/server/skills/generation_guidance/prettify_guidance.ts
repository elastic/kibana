/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dashboardTools } from '../../../common';
import { getDashboardReviewPromptContent } from './dashboard_guidance';

const hitlGuidance = `## Prettifying a Dashboard

Review the attached dashboard against the guidelines below. Review grid positions and composition together. If anything violates (gaps, odd widths, misplaced panels, mixed topics, L-shaped holes), rethink where panels live — do not only nudge a few x/w values.

Group the issues into these three categories — omit a category if it has no issues:
1. **Layout** — grid, sizing, gaps, alignment (topic \`grid\`).
2. **Chart styling** — painted chart internals: titles, legends, fills, invented colors (chart-type topics such as \`metric\`, \`xy\`, \`pie\`).
3. **Structure** — sections, controls, and composition (topics \`controls\`, \`composition\`).

If every category is empty, tell the user you found nothing to fix and stop.

Call \`ask_user_question\` **once** this round with one \`multi_select\` question. Question text only, e.g. "Which improvements should I apply?". One option per non-empty category. Labels are the category names (\`Layout\`, \`Chart styling\`, \`Structure\`). Put a concise description on each option: one short clause per issue (about 5–10 words). Always add a final **All of them** option.
After they answer, call ${dashboardTools.generateDashboard} once with \`dashboardAttachmentId\` and batched operations for only the chosen categories (or their description). Treat **All of them** as every non-empty category. Apply only the review criticals for those categories.
A typical flow is to use operations: \`edit_panels\` and \`update_panel_layouts\`. 
For easy fixes, prefer \`edit_panels\` with \`source: "config"\`, \`type: "vis"\`, and a partial \`config\` patch (title, legend, colors) rather than regenerating the chart with \`source: "request"\`.
`;

/**
 * Full Enhance playbook: HITL first, then dashboard and chart review rules.
 * Loaded only via `read_file` on the referenced prettify path.
 */
export const getDashboardPrettifyPromptContent = (): string =>
  [hitlGuidance, getDashboardReviewPromptContent()].filter(Boolean).join('\n\n');
