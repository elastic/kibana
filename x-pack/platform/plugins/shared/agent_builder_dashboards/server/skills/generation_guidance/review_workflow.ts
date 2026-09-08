/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dashboardTools } from '../../../common';

/**
 * The short Prettify review-and-apply workflow the main agent follows. The
 * chart-specific presentation rules live in the `review_dashboard` tool's own
 * context; this block only says when to call it and how to act on its result.
 */
export const reviewWorkflowPrompt = `## Improving an Existing Dashboard (Prettify)

When asked to prettify, enhance, or clean up a dashboard, improve the attached dashboard in place; never create a new one. Use ${dashboardTools.reviewDashboard}, a read-only presentation review with its own detailed guidance: composition and section membership, panel sizing and packing, titles, number formats, colors and palettes, legends, axes, and other chart-specific defaults. It reports problems; you apply the fixes with ${dashboardTools.generateDashboard}. Do not check those chart-specific rules yourself, and do not skip the review because the dashboard looks acceptable.

Use the review only for Prettify requests on an existing dashboard. Do not run it on a dashboard you have just generated, and not for focused edits ("make the error series blue", "rename this panel"): apply those directly.

**Review flow**
1. **Review.** Call ${dashboardTools.reviewDashboard} with the dashboard \`dashboardAttachmentId\` and the user's request in their words, including any constraint they stated (named colors, thresholds, goals, panels to leave alone). Pass \`screenshotAttachmentId\` only when the screenshot shows the current version: the Prettify screenshot matches only the initial dashboard, so omit it after the first edit.
2. **Apply.** Turn the result into one ${dashboardTools.generateDashboard} call where possible: \`add_section\` (with the proposed \`key\`) and \`update_panel_layouts\` for \`new_sections\` and \`layout_changes\`, \`set_metadata\` for metadata findings, and \`edit_panels\` for each entry in \`panel_findings\`, using the finding's \`correction\` as the edit \`query\` and \`appearanceOnly: true\` when it is marked appearance-only. Combine a panel's findings with any change the user asked for on that panel. Skip corrections that contradict an explicit user choice and say so. Treat \`data_questions\` as things to investigate or ask about, not as edits; additions and removals stay suggestions unless the user authorized content changes.
3. **Review again.** Read the tool result for the updated attachment id and version, then call ${dashboardTools.reviewDashboard} on the updated attachment. Apply at most one correction pass for the remaining findings.
4. **Report.** Summarize what changed, what the review still flags, and what could not be assessed or edited (\`could_not_assess\` and \`unreviewed_panel_ids\` panels, unsupported panel types). There is no post-edit screenshot, so never claim the updated dashboard was visually verified.

**Preserve throughout.** Keep panel identities and move panels instead of recreating them. Keep queries, filters, controls, and the time range unless the user asked to change them. Explicit user choices and meaningful business thresholds or goals take precedence over any correction. Report unsupported panels instead of replacing them.`;
