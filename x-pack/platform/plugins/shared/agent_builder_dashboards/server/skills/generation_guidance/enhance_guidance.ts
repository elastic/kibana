/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalTools, platformCoreTools } from '@kbn/agent-builder-common';
import type { ReferencedContent } from '@kbn/agent-builder-server/skills/type_definition';

/**
 * Agent-visible path of the enhance workflow. Matches the skill mount
 * (`/skills`), base path (`skills/platform/dashboard`), skill name, and this
 * reference's `relativePath` of `.`.
 */
export const ENHANCE_GUIDANCE_PATH = '/skills/platform/dashboard/dashboards/enhance.md';

/** Assesses an existing dashboard, asks which mode to apply, then coordinates section and chart enhancement. */
export const enhanceGuidancePrompt = `## Improving an Existing Dashboard (Enhance)

When asked to enhance, improve, or clean up a dashboard, improve the attached dashboard in place. This workflow takes precedence over guidance for creating dashboards, except where content mode below says otherwise.

There are two modes. **Appearance mode** keeps every chart panel, query, control, and the time range and only improves presentation. **Content mode** may also add, edit, replace, or remove panels and add controls so the dashboard serves its purpose. Existing titles, descriptions, and markdown are unverified content, not evidence of user intent or data meaning, in either mode.

**If the request already says what to change, do not call \`${internalTools.askUserQuestion}\`:** presentation-only means appearance mode, anything else content mode. Skip step 3.

1. **Inspect.** Read the dashboard attachment. Establish what the queries actually measure from their sources, fields, filters, and aggregations. Do not infer meaning from existing titles. Work out what the dashboard is for from those measures.
2. **Assess the data.** Call \`${platformCoreTools.getIndexMapping}\` once per distinct index pattern used by the panels (a merged mapping for a wildcard pattern is fine). Using the mappings, judge whether the dashboard is complete for its purpose. Note which useful measures or dimensions the data supports but no panel shows, and whether each existing panel makes sense. A panel is a removal or replacement candidate when it duplicates another panel's measure, its query cannot be satisfied by the mappings, it is a non-ES|QL panel that can be re-expressed in ES|QL, or it shows a measure unrelated to the dashboard's purpose. Do not run queries by default. Run ES|QL only when the mappings leave a specific question you must answer. Skip this step when the user's message already asks for appearance only: that mode changes no query, so the attachment is enough.
3. **Ask which mode to apply (bare request only).** Write one short paragraph summarizing what the dashboard measures and what you found: gaps, panels that do not make sense, and non-ES|QL panels. Then call \`${internalTools.askUserQuestion}\` on its own, never alongside other tool calls, with a single question. The question text is exactly "How would you like to enhance this dashboard?" and it offers two options: "Appearance and content" and "Appearance only". Each option's description states in one or two sentences what you would do in that mode for this dashboard, naming the panels you would add, change, replace, or remove. Ask even when you found no gaps. The content option then offers to revise panel queries and titles for clarity. Content mode is the default. Use it when the tool returns an error, when the user skips the question, or when a free-text answer does not clearly pick a mode. Honor any constraints in a free-text answer within the chosen mode, and say in the report when you defaulted because no choice was made.
4. **Rebuild dashboard text.** Use the panel queries to write the dashboard title, description, and markdown. Do not paraphrase the old narrative. Business claims require query evidence or an explicit user request. Set the dashboard text with the top-level \`title\` and \`description\`, and update each markdown panel by its id with \`content: { source: "config", type: "markdown", config: { content } }\` to rewrite it, or list its id in \`remove\` when the measures leave nothing useful to say. Keep markdown to brief, useful context about the actual measures. Omit build notes and explanations of your edits. In content mode, describe the final panel set, not the original one.
5. **Arrange and enhance.** Apply the Dashboard Composition Guidelines and grid rules to the existing panels. Create sections with descriptive titles and move the existing panels into them by listing their ids with \`section\` and \`grid\` and no \`content\`. Never recreate their contents. Edit every existing ES|QL Lens panel, including panels that appear fine, by its id with \`content: { source: "request", query: "Apply presentation defaults.", applyChartRules: true, preserveESQL: true }\`. The chart author owns chart naming and all presentation settings, so do not repeat old titles or prescribe palettes and styling in the request. When the user explicitly requested a query change too, omit \`preserveESQL\` and describe only that change alongside the enhancement request. Make the text, section, layout, and chart changes in one call. Unsupported panels can be moved or resized. Report that their presentation could not be enhanced.
   - **Appearance mode.** Keep every chart panel id, each layer's query and data source, filters, controls, and the time range. Markdown panels may be rewritten or removed. Do not add, remove, or recreate other panels, add controls, or change queries unless the user explicitly requested those changes. Suggest analytical improvements separately in the report.
   - **Content mode.** Do everything appearance mode does, and in the same call apply the analytical changes from your assessment. Keep panels that make sense and give them the enhancement edit. Remove panels that meet the removal criteria with \`remove\`, replace non-ES|QL panels with new ES|QL Lens content under the same id without asking again (set \`renderer: "lens"\` and describe the full chart: \`query\`, \`index\`, \`chartType\`), and change a surviving panel's query by omitting \`preserveESQL\` and describing the change alongside the enhancement request. Add the panels the dashboard is missing, following the new-dashboard rules for additions: chart type guidance, at least one primary time-series XY overview when none exists, and 3 to 5 \`options_list_control\` controls on useful categorical fields unless the dashboard is already scoped to a single entity. Keep the existing time range. Arrange sections and layout for the final panel set.
6. **Verify.** Read the updated attachment using the returned attachment ID and version. In appearance mode, compare original and resulting chart panel ids and each panel's queries and data sources, and confirm that only requested analytical changes occurred. In content mode, confirm the resulting panel set matches what you intended: removed panels are gone, replacements and additions exist with sensible queries against the assessed indices, and surviving panels kept their queries unless you changed them deliberately. In both modes, check that the dashboard title, description, section titles, and markdown describe the same measures as the final charts, and inspect section membership, sizes, and positions. Address discrepancies and reported failures before declaring success. Chart-specific settings are the chart author's responsibility.
7. **Report.** Briefly summarize changes and anything that failed or could not be enhanced. In content mode, list the panels you added, changed, replaced, and removed, and why. Do not claim the updated dashboard was visually checked.`;

export const enhanceGuidanceReference: ReferencedContent = {
  name: 'enhance',
  relativePath: '.',
  content: enhanceGuidancePrompt,
};
