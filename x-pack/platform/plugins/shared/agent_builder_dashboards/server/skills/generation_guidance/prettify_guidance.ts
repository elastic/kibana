/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Reviews a dashboard using shared design guidance and requests specific edits without a second visual review. */
export const prettifyGuidancePrompt = `## Improving an Existing Dashboard (Prettify)

When asked to prettify, enhance, or clean up a dashboard, improve the attached dashboard in place; do not create a new one.

1. **Inspect.** Read the dashboard attachment for exact panel settings. Read each panel's query to learn what it actually measures and which data it reads; the existing titles and the dashboard name may be inaccurate and must not be trusted as a description of the content. Use the attached screenshot to judge appearance, but verify settings such as palette colors from the configuration. Without a screenshot, acknowledge that visual assessment is limited.
2. **Structure.** Assign every existing panel to its intended section or top-level position using the Dashboard Composition Guidelines, including panels that otherwise need no changes. Check every section's contents against its purpose and plan any necessary sections or moves; existing section membership is not fixed.
3. **Review.** You MUST apply ALL applicable presentation defaults from the dashboard, chart design, and color guidance above. Apply the sizing guidelines and chart-specific defaults, and recalculate positions from the final sizes to close gaps. Existing settings looking acceptable is not a reason to skip a default. Explicit user choices, meaningful business thresholds/goals, and the guidance's stated exceptions take precedence. Leave settings unchanged only when they meet the defaults or qualify for these exceptions. Go through the Prettify Checklist below before applying anything.
4. **Apply.** Apply the dashboard structure and layout changes, and turn chart-specific mismatches into concrete per-panel edits, combining them with any specific user request. Spell out cross-chart choices, such as consistent service colors, because the chart author cannot see other panels. Apply the initial changes in one call where possible. Set \`appearanceOnly: true\` for presentation-only edits; omit it only for panels where the user also requested a data change.
5. **Preserve.** Keep panel identities; move panels instead of recreating them. Preserve queries, filters, controls, and the time range except for changes explicitly requested by the user. Suggest new charts separately, and report unsupported panels instead of replacing them.
6. **Verify.** Read the updated attachment using the returned attachment ID and version; do not rely only on the tool's summary. Go through the Prettify Checklist again against the updated configuration, including unchanged panels, and apply one correction pass if needed. This checks the configuration, not the rendered dashboard.
7. **Report.** Briefly summarize what changed, grouped by kind of change rather than panel by panel, plus what failed and what could not be assessed or edited. Do not describe settings that were already fine. There is no post-edit screenshot or visual review, so do not claim the updated dashboard was visually checked or that every visual problem is gone.

### Prettify Checklist

A silent sanity check before calling the tool (step 3) and again after re-reading the updated attachment (step 6). The rules live in the guidance above; do not restate them, and do not reproduce this list or a per-panel review in your response. Go through every panel, including panels you do not plan to change, and ask:

- Does every panel have a section or top-level position, does each section hold only panels matching its purpose, and is the order summary metrics → trends → breakdowns?
- Does every panel's \`w\`/\`h\` match the grid size for its chart type, does \`w\` divide 48, is no metric or gauge full-width, and does custom content \`h\` fit the rows its query returns?
- If any panel in a section changes size or position, were the positions of all panels in that section recomputed, so rows tile with no gaps or overlaps, \`x + w ≤ 48\`, panels in a row share \`h\`, and each row's \`y\` is the previous row's \`y + max(h)\`?
- Was every panel compared against its chart type's design rules: titles, legend placement, area fill, metric value coloring, gauge bands, heatmap/table/pie palettes?
- Does every column with a recognizable unit (percent, bytes, bits, duration) have a number format?
- Do colors come from the palette catalog, does the same category keep one color across all charts, and are existing thresholds preserved?
- Is every deviation left in place justified by an explicit user choice, a business threshold or goal, or a stated guidance exception?
- Are panel identities, queries, filters, controls, and time range unchanged except where the user asked, and do presentation-only edits use \`appearanceOnly: true\`?
- Do the dashboard title, description, section titles, panel titles, and markdown text accurately describe what the queries measure and the data they read? Derive names from the queries, fields, and indices, not from the existing dashboard name or an assumed domain, and rename anything misleading.
- Does the dashboard have a non-empty title and a description?
- Are non-editable (non-ES|QL) panels reported rather than replaced?

Fix anything that fails before proceeding; mention only the deviations you kept on purpose, in one short sentence each.`;
