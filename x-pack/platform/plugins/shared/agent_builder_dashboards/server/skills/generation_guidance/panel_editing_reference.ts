/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReferencedContent } from '@kbn/agent-builder-server/skills/type_definition';

export const PANEL_EDITING_REFERENCE_NAME = 'panel-editing';
export const PANEL_EDITING_REFERENCE_PATH = './references';

/**
 * Read before every `edit_panels` call — the skill body says so unconditionally, so this covers
 * the ordinary edit as well as the panels that cannot be edited at all.
 */
export const panelEditingReference: ReferencedContent = {
  name: PANEL_EDITING_REFERENCE_NAME,
  relativePath: PANEL_EDITING_REFERENCE_PATH,
  content: `# Editing Existing Panels

Work out what backs the target panel before calling \`edit_panels\`. What you find decides which of the two cases below you are in, and if you cannot determine it, you are in the second one.

## Panels that can be edited in place

- ES|QL-backed Lens and Vega panels, via \`source: "request"\` with a natural-language query. The panel keeps its existing renderer, so describe the new content rather than restating the chart it already is.
- Markdown panels, via \`source: "config"\` with \`type: "markdown"\`. The new config fully replaces the old one, so include everything the panel should still say — anything left out is gone.

That is the whole list.

## Panels that cannot

Anything else — a DSL-based panel, a form-based panel, another legacy Lens config — cannot be edited, and nothing converts one in place. The only route is to build a replacement as a new ES|QL-based Lens panel and swap it in, which throws away whatever the original config expressed. That makes it the user's call, not yours:

1. Say plainly that this panel can't be edited directly.
2. Offer to recreate it as a new ES|QL-based Lens chart, and say what that costs — a fresh chart built from a query, not a copy of the original.
3. Wait for confirmation before removing or replacing anything.

Never run a remove-and-recreate sequence without that confirmation, even when the replacement looks obviously equivalent. An edit that happens to succeed does not mean the check was unnecessary — the panels where it silently loses the original are the ones you cannot spot without looking.

When you cannot tell what backs a panel, ask instead of guessing: say what you were able to determine and let the user decide whether to recreate it.
`,
};
