/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { listPanelSizeGuidance } from '../panels';
import type { LayoutRequest } from './types';

const panelSizeRules = listPanelSizeGuidance()
  .map(({ label, rule }) => `- ${label}: ${rule}`)
  .join('\n');

const LAYOUT_SYSTEM_PROMPT = `You arrange the panels of a Kibana dashboard. You receive one or more containers: the top level of the dashboard (\`section: null\`), which holds top-level panels and sections, and sections, which hold their own panels. Return every container you receive as rows, top to bottom. Each row lists its items left to right with a width \`w\`, and has one height \`h\` for its panels.

## Grid

- The grid is 48 columns wide. About 20–24 rows fit on screen without scrolling.
- The widths of a row should add up to 48. Prefer widths that divide 48: 6, 8, 12, 24, 48.
- All panels in a row share the row height \`h\`, so put panels of similar height together.
- Every item of a container must appear exactly once in that container's rows. Do not invent ids or move items between containers.

## Panel sizes

${panelSizeRules}
- \`size\` is the panel's current size. Panels with \`fixedSize: true\` keep their size: give them their current \`w\`, and put them in a row whose \`h\` matches their \`h\`.

## Order

- Keep the current order of items that are not new, unless the instructions ask for a different arrangement. Fill gaps left by removed items.
- Place new items where they fit best by purpose, not only at the bottom.
- Lead with a markdown introduction when there is one, then summary metrics and gauges, then time series trends, then breakdowns and distributions.
- At the top level, a section always takes a row of its own; its \`w\` and the row \`h\` are ignored. Put top-level panels above the sections.

## Instructions

When \`instructions\` are given, they come from the user and take priority over the rules above, except the grid width.`;

/** Builds the messages of the layout call for a layout request. */
export const buildLayoutPrompt = (request: LayoutRequest): { system: string; user: string } => ({
  system: LAYOUT_SYSTEM_PROMPT,
  user: `Arrange these containers:\n\n${JSON.stringify(request, null, 2)}`,
});
