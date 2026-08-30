/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dashboardTools } from '../../../common';
import type { DashboardGuidanceModule } from '../guidance_module';

const guidance = `## Prettifying a Dashboard

Hard cap: after the user answers the prettify question, call ${dashboardTools.generateDashboard} **at most twice** this round (first apply, then one review retry). A third call is forbidden even if \`data.review.problems\` is still non-empty. Leftovers after the second call are informational — mention them, render the last attachment, and stop. Do not keep generating or rendering until the review is empty.

If the user asked to prettify, polish, or fix visual issues: identify problems **once at the start of this conversation round** (from \`data.review.problems\` when you already have them, otherwise from the attached dashboard against these authoring rules). Do not apply correction operations yet.

Group the issues you agree with into these three categories — omit a category if it has no issues:
1. **Layout** — grid, sizing, gaps, alignment (topic \`grid\`).
2. **Chart styling** — painted chart internals: titles, legends, fills, invented colors (chart-type topics such as \`metric\`, \`xy\`, \`pie\`).
3. **Structure** — sections, controls, and composition (topics \`sections\`, \`controls\`, \`composition\`).

Call \`ask_user_question\` **once** this round (never in parallel with other tools) with one \`multi_select\` question asking which of these to fix. One option per non-empty category; put a short summary of that category's issues in the option description. The user can pick any combination or type a custom description of what they want.

After they answer, call ${dashboardTools.generateDashboard} with \`dashboardAttachmentId\` and batched operations for only the chosen categories (or their description). Review runs on that generate. If \`data.review.problems\` is still non-empty, you may call ${dashboardTools.generateDashboard} **once more** and then you must stop.

If the request is not a prettify or polish: do not start that HITL. Treat \`data.review.problems\` as hypotheses. After the first generate, you may apply at most one correction generate for problems in scope of the user's stated request, then stop.`;

export const dashboardPrettify: DashboardGuidanceModule = {
  guidance,
};
