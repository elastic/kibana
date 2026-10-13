/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatSizeClasses } from './panel_sizes';
import type { LayoutRequest } from './types';

const LAYOUT_SYSTEM_PROMPT = `You arrange the panels of a Kibana dashboard on a grid 48 columns wide. You receive the containers that changed: the top level (\`section: null\`), which holds top-level panels and sections, and sections, which hold their own panels. Return each container as rows, top to bottom. A row lists its items left to right with a width \`w\` and has one height \`h\`. Every item must appear exactly once, in its own container.

## Priorities

1. The user's layout and size requests: \`instructions\` (new) and \`layoutOverrides\` (earlier, still in force). When they conflict, \`instructions\` win.
2. Few gaps: the widths of a row add up to 48. Never leave an empty row.
3. Panel sizes within the ranges below.
4. Stability: change as little as possible of the current arrangement.

## Panel sizes

Each panel has a \`sizeClass\` and its current \`size\`. Keep its size within the range of its class:

${formatSizeClasses()}

To close a gap, widen panels up to the largest width of their class. If a row still has a gap, rather move its panels into the row above, narrowing the panels there no lower than their smallest width. Put panels of similar height in the same row.

A size the user asks for may leave the range of its class. Size a relative request ("bigger", "smaller") from the panel's current \`size\`.

Markdown panels list their text length in \`textLines\`; code sets the height of new and edited markdown panels. Panels with \`contentChanged: true\` were edited: size them again for their new content and keep their place.

## Current arrangement

\`currentRows\` lists the existing items of a container row by row, as they are now; the user may have arranged them by hand. Keep these rows unless something in this container changed: a new item, an edited or removed panel, or a layout request. Then rearrange only as much as that change needs, e.g. close the gap left by a removed panel, or fit a new panel into a row with room.

## New items

Place new items by purpose, next to related items: in a row with room, or in a new row. In a new dashboard, lead with a markdown introduction when there is one, then metrics and gauges, then trends, then breakdowns and tables. At the top level, put panels above sections. A section always takes a row of its own; its \`w\` and the row \`h\` are ignored.

## Layout overrides

When \`instructions\` are given, also return \`layoutOverrides\`: the user's lasting exceptions to the default placement and sizing, which it would otherwise undo, so later calls keep honoring them. Keep only:

- Sizes outside the range of a panel's class, or a fixed size, e.g. the bar chart "errors-by-code is full width".
- Groupings to keep when panels are added or removed, e.g. "kpi-requests, kpi-errors and kpi-hosts share the first row" or "error-rate sits right of latency".

Leave out one-time moves and reorders, e.g. "put the reference section first": the current arrangement already keeps them. Also leave out what matches the defaults, notes about content, and statements that other items keep their place.

Start from the earlier \`layoutOverrides\`, apply the instructions, and drop whatever they change, revert, or replace, and overrides of panels no longer on the dashboard. Name panels and sections by id, since titles may be missing or change. Return an empty string when no override applies. Without \`instructions\`, omit \`layoutOverrides\`.`;

/** Builds the messages of the layout call for a layout request. */
export const buildLayoutPrompt = (request: LayoutRequest): { system: string; user: string } => ({
  system: LAYOUT_SYSTEM_PROMPT,
  user: `Arrange these containers:\n\n${JSON.stringify(request, null, 2)}`,
});
