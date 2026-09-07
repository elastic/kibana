/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { attachmentTools } from '@kbn/agent-builder-common';
import { dashboardTools } from '../../../common';

/** Reviews a dashboard using shared design guidance and requests specific edits without a second visual review. */
export const prettifyGuidancePrompt = `## Improving an Existing Dashboard (Prettify)

When the user asks to prettify, enhance, or clean up the attached dashboard, improve its layout and presentation without changing what it measures unless the user explicitly requests a data change too. The dashboard attachment is updated in place; never create a new dashboard for this.

1. **Inspect.** Read the attachment with \`${attachmentTools.read}\` to see every panel's exact settings (titles, legends, axes, formats, colors, thresholds, grid). If a dashboard screenshot is attached, use it to judge appearance and the settings to identify panels and check exact values — a screenshot cannot tell whether a color belongs to a palette. Without a screenshot, say that visual assessment is limited.
2. **Review.** Check the whole layout (grouping, sections, sizes, dead space, which trend is the primary overview) and each chart against the chart design guidance and color guidance above. Decide the concrete fixes, and decide choices that must be consistent across charts (for example the same service keeps one color everywhere). Leave already-good panels alone.
3. **Apply everything in one \`${dashboardTools.generateDashboard}\` call** with \`dashboardAttachmentId\`: \`update_panel_layouts\` and \`add_section\` for layout, \`set_metadata\` for title or description, and one \`edit_panels\` item (\`source: "request"\`) per chart that needs work, with specific instructions. The chart author cannot see the other panels, so spell out any cross-chart decision it must honor. If the user also asked for a specific change, fold it into the same instruction; explicit user choices win over defaults. Choose the query-editing behavior separately for each panel:
   - For presentation-only changes, set \`appearanceOnly: true\`, e.g. "Move the legend below the plot, hide the axis titles, and display latency in milliseconds. Keep the existing series colors and line representation."
   - If the user also requests a change to what the panel measures, omit \`appearanceOnly\` so the normal query-editing workflow can update its data. Combine that change and the concrete presentation fixes in the same instruction, e.g. "Show average latency instead of request count, display it in milliseconds, and move the legend below the plot." Other panels that only need presentation changes still use \`appearanceOnly: true\`.
4. **Preserve.** Keep panel identities. Preserve queries, filters, controls, and the time range except for changes explicitly requested by the user. Move panels between sections with \`update_panel_layouts\` instead of recreating them. For a new section, put \`add_section\` first with a unique \`key\` (e.g. \`"overview"\`), then use \`sectionId: "overview"\` in a later \`update_panel_layouts\` operation in the same call; panel grids are relative to that section. Do not add new charts silently — suggest them separately. Report non-ES|QL panels as not editable instead of replacing them.
5. **Report** from the tool result: what changed, what failed (\`data.failures\`), and what could not be assessed or edited. The screenshot shows the dashboard before the edits and there is no visual review afterwards, so do not claim the updated dashboard was checked visually or that every visual problem is gone.`;
