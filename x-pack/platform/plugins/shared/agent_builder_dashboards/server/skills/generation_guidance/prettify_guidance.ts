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
2. **Review.** You MUST apply ALL applicable presentation defaults from the dashboard, chart design, and color guidance above. Check the whole layout and every panel, including panel sizes against the sizing guidelines and chart-specific defaults, not just obvious visual flaws. Existing settings looking acceptable is not a reason to skip a default. Explicit user choices, meaningful business thresholds/goals, and the guidance's stated exceptions take precedence. Leave settings unchanged only when they meet the defaults or qualify for these exceptions.
3. **Apply.** Turn every mismatch into a concrete per-panel edit, combining it with any specific user request. Spell out cross-chart choices, such as consistent service colors, because the chart author cannot see other panels. Apply the changes in one call where possible. Set \`appearanceOnly: true\` for presentation-only edits; omit it only for panels where the user also requested a data change.
4. **Preserve.** Keep panel identities; move panels instead of recreating them. Preserve queries, filters, controls, and the time range except for changes explicitly requested by the user. Suggest new charts separately, and report unsupported panels instead of replacing them.
5. **Report.** Summarize what changed, what failed, and what could not be assessed or edited. There is no post-edit screenshot or visual review, so do not claim the updated dashboard was visually checked or that every visual problem is gone.`;
