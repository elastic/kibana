/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Reviews a dashboard using shared design guidance and requests specific edits without a second visual review. */
export const prettifyGuidancePrompt = `## Improving an Existing Dashboard (Prettify)

When asked to prettify, enhance, or clean up a dashboard, improve the attached dashboard in place; do not create a new one.

1. **Inspect.** Read the dashboard attachment for exact panel settings. Use the attached screenshot to judge appearance, but verify settings such as palette colors from the configuration. Without a screenshot, acknowledge that visual assessment is limited.
2. **Structure.** Assign every existing panel to its intended section or top-level position using the Dashboard Composition Guidelines, including panels that otherwise need no changes. Check every section's contents against its purpose and plan any necessary sections or moves; existing section membership is not fixed.
3. **Review.** You MUST apply ALL applicable presentation defaults from the dashboard, chart design, and color guidance above. Apply the sizing guidelines and chart-specific defaults, and recalculate positions from the final sizes to close gaps. Existing settings looking acceptable is not a reason to skip a default. Explicit user choices, meaningful business thresholds/goals, and the guidance's stated exceptions take precedence. Leave settings unchanged only when they meet the defaults or qualify for these exceptions.
4. **Apply.** Apply the dashboard structure and layout changes, and turn chart-specific mismatches into concrete per-panel edits, combining them with any specific user request. Spell out cross-chart choices, such as consistent service colors, because the chart author cannot see other panels. Apply the initial changes in one call where possible. Set \`appearanceOnly: true\` for presentation-only edits; omit it only for panels where the user also requested a data change.
5. **Preserve.** Keep panel identities; move panels instead of recreating them. Preserve queries, filters, controls, and the time range except for changes explicitly requested by the user. Suggest new charts separately, and report unsupported panels instead of replacing them.
6. **Verify.** Read the updated attachment using the returned attachment ID and version; do not rely only on the tool's summary. Check every panel and section against the guidance again, including unchanged panels, and apply one correction pass if needed. This checks the configuration, not the rendered dashboard.
7. **Report.** Summarize what changed, what failed, and what could not be assessed or edited. There is no post-edit screenshot or visual review, so do not claim the updated dashboard was visually checked or that every visual problem is gone.`;
