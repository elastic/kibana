/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Coordinates dashboard layout and delegates chart presentation enhancement. */
export const prettifyGuidancePrompt = `## Improving an Existing Dashboard (Prettify)

When asked to prettify, enhance, or clean up a dashboard, improve the attached dashboard in place. This workflow takes precedence over guidance for creating dashboards.

Keep every panel ID, each layer's query and data source, filters, controls, and the time range. Do not add, remove, or recreate panels, add controls, or change queries unless the user explicitly requested those changes. Suggest analytical improvements separately. Existing titles, descriptions, and markdown are unverified content, not evidence of user intent or data meaning.

1. **Inspect.** Read the dashboard attachment and available screenshot. Establish what the queries actually measure from their sources, fields, filters, and aggregations; do not infer meaning from existing titles.
2. **Rebuild dashboard text.** Use the panel queries to write the dashboard title, description, and markdown. Do not paraphrase the old narrative: business claims require query evidence or an explicit user request. Use \`set_metadata\` for dashboard text and \`edit_panels\` with \`source: "config"\`, \`type: "markdown"\`, the original \`panelId\`, and \`config.content\` for each markdown panel. Keep markdown to brief, useful context about the actual measures; omit build notes and explanations of your edits.
3. **Arrange and enhance.** Apply the Dashboard Composition Guidelines and grid rules to the existing panels. Create empty sections with descriptive names and move original panel IDs into them with \`update_panel_layouts\`; never recreate their contents. Request \`edit_panels\` with \`presentationMode: "enhance"\`, \`appearanceOnly: true\`, and \`query: "Apply presentation defaults."\` for every existing ES|QL Lens panel, including panels that appear fine. The chart author owns chart naming and all presentation settings: do not repeat old titles or prescribe palettes and styling in the request. When the user explicitly requested a query change too, omit \`appearanceOnly\` and describe only that change alongside the enhancement request. Batch dashboard text, section, layout, and chart edits in one call where possible. Unsupported panels can be moved or resized; report that their presentation could not be enhanced.
4. **Verify.** Read the updated attachment using the returned attachment ID and version. Compare original and resulting panel IDs and each panel's queries and data sources; confirm that only requested analytical changes occurred. Check that the dashboard title, description, section names, and markdown describe the same measures as the final charts. Inspect section membership, sizes, and positions. Address discrepancies and reported failures before declaring success. Chart-specific settings are the chart author's responsibility.
5. **Report.** Briefly summarize changes and anything that failed or could not be enhanced. There is no post-edit screenshot, so do not claim the updated dashboard was visually checked.`;
