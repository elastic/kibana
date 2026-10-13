/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatPanelSizeRules } from './panel_sizes';
import type { LayoutRequest } from './types';

const panelSizeRules = formatPanelSizeRules();

const LAYOUT_SYSTEM_PROMPT = `You arrange the panels of a Kibana dashboard. You receive one or more containers: the top level of the dashboard (\`section: null\`), which holds top-level panels and sections, and sections, which hold their own panels. Return every container you receive as rows, top to bottom. Each row lists its items left to right with a width \`w\`, and has one height \`h\` for its panels.

## Grid

- The grid is 48 columns wide. About 20–24 rows fit on screen without scrolling.
- The widths of a row should add up to 48. Prefer widths that divide 48: 6, 8, 12, 24, 48.
- All panels in a row share the row height \`h\`, so put panels of similar height together.
- Every item of a container must appear exactly once in that container's rows. Do not invent ids or move items between containers.

## Panel sizes

${panelSizeRules}
- \`size\` is the panel's current size. Panels with \`fixedSize: true\` keep their size: give them their current \`w\`, and put them in a row whose \`h\` matches their \`h\`.

## Current arrangement

\`currentRows\` lists the ids of the existing items of a container as they are arranged now, row by row, top to bottom and left to right. The user may have arranged them by hand, so keep these rows: the same items, in the same order, with their current widths. Change them only when the \`instructions\` or \`rules\` ask for it, to close a gap left by a removed item, or to fit a new item into a row with room.

## Order

- Place new items where they fit best by purpose, not only at the bottom: in an existing row with room, or in a new row next to related items.
- In a new dashboard, lead with a markdown introduction when there is one, then summary metrics and gauges, then time series trends, then breakdowns and distributions.
- At the top level, a section always takes a row of its own; its \`w\` and the row \`h\` are ignored. Put top-level panels above the sections.

## Instructions and rules

\`rules\` are layout requests the user made earlier, and \`instructions\` is their new request. Both take priority over everything above except the grid width. When they conflict, \`instructions\` win.

When \`instructions\` are given, also return \`rules\`: the earlier \`rules\` merged with the instructions, so later changes keep honoring them. Write each rule as a short, lasting statement about the arrangement that names panels by title or id, e.g. "Metrics share the first row" or "error-rate sits right of latency". Drop earlier rules that the instructions replace or that name panels no longer on the dashboard. Return an empty list when the user asks to drop all earlier layout requests. Without \`instructions\`, omit \`rules\`.`;

/** Builds the messages of the layout call for a layout request. */
export const buildLayoutPrompt = (request: LayoutRequest): { system: string; user: string } => ({
  system: LAYOUT_SYSTEM_PROMPT,
  user: `Arrange these containers:\n\n${JSON.stringify(request, null, 2)}`,
});
