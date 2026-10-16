/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const gridLayoutPrompt = `## Panel Layout

Panel positions and sizes are set automatically. Use \`layout\` to say where things go, in plain words:

- Pass on the user's own request about arrangement or size, e.g. "put the metrics in one row" or "make the table full width".
- When you add a section or move panels, say where they belong by purpose, e.g. "put the Key metrics section at the top" or "place the new error chart next to the request rate chart". You know what the panels show; the layout step sees panel types, chart types and titles, but not what a panel is for.
- When an edit changes how much room a panel needs, say so, e.g. "Response codes is now a table, size it as one" or "the intro is longer now". Existing panels keep their size otherwise.
- Follow the enhance workflow when it says to set it.

Never write coordinates. Omit \`layout\` for edits that do not change how much room a panel needs, such as colors, titles or queries, and when you add a panel whose place does not matter.`;
