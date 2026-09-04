/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dashboardTools } from '../../../common';
import { getDashboardReviewPromptContent } from './dashboard_guidance';

const prettifyGuidance = `## Prettifying a Dashboard

1. Read the dashboard attachment. Read the paired image attachment explicitly. Use the screenshot to judge appearance and the payload to identify panel IDs, data bindings, and settings. If the screenshot is missing or unreadable, review the payload and state that visual assessment is limited. If image and payload disagree, prefer the latest payload and do not guess panel identities from the image.
2. Inspect the full dashboard for layout, chart styling, and useful section grouping. Apply the shared chart rules below, including their conditions for titles, colors, legends, gauge settings, and line-to-area restyling. Preserve queries, data sources, filters, controls, time range, and panel identity. Do not replace charts just to improve appearance.
3. If the dashboard lacks useful coverage, make at most one focused data-discovery pass against its existing data sources to identify specific useful additions. Skip discovery when the user requested existing-only improvements. Do not run queries for ordinary presentation fixes or explore unrelated indices.
4. When useful additions are supported by that discovery and the user has not already chosen, call ask_user_question once with a single-choice question: "Improve existing charts only" or "Also add the suggested charts". Describe the specific additions. Both choices include all applicable fixes to existing charts. If there are no useful additions, or the user already chose the scope, proceed without this question. Never add, remove, or replace charts without permission.
5. Batch the agreed changes in ${dashboardTools.generateDashboard} with dashboardAttachmentId. Use edit_panels with source: "config", type: "vis", and config.changes containing the explicit edits you chose from the shared chart guidance. For example:
   { "changes": [{ "operation": "set", "path": "legend.visibility", "value": "hidden" }, { "operation": "remove", "path": "layers.0.y.0.color" }] }
   Emit only presentation changes that make sense for this panel; defaults are guidance, not an operation. Follow the presentation-edit instructions below. Do not use source: "request" for styling; it is for approved new charts or intentional data changes.
6. Use update_panel_layouts to move/resize existing panels, including newSections/newSectionKey for grouping without recreating them. Keep IDs and unrelated settings. Supported Lens API presentation edits work for both ES|QL and form-based charts. Vega supports only panel title/description/hide_title and layout; leave unsupported chart internals intact and report them.
7. Report per-panel failures without claiming they were fixed. If nothing needs changing, make no tool call.
8. Summarize the changes and anything left unsupported. The original screenshot is not visual verification of the result. Do not start another model-based review loop or claim to have seen the updated dashboard unless a new image is available.
`;

/** On-demand screenshot-first improvement flow for the main dashboard agent. */
export const getDashboardPrettifyPromptContent = (): string =>
  [prettifyGuidance, getDashboardReviewPromptContent()].join('\n\n');
