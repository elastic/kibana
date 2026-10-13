/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const gridLayoutPrompt = `## Panel Layout

The tool arranges panel positions and sizes after it applies your changes, so never compute grid coordinates or sizes. New and moved panels are placed by purpose, and gaps left by removed panels are filled.

- When the user asks for an arrangement or a size, e.g. "put the metrics in one row", "move the error chart to the top", or "make the table full width", pass their request in \`layout\`. A call may contain only \`layout\`. To move a panel into another section, also set its \`section\`. Layout requests are remembered and kept on later calls; to undo one, pass the new request in \`layout\`.
- Use sections, not empty space, to separate semantic groups.`;
