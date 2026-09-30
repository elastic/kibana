/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { A2uiMessage } from '@kbn/a2ui-renderer';
import type { CustomAppDefinition, EsqlQuery } from '../../common/app_definition';
import { DEFAULT_PANEL_HEIGHT, DEFAULT_PANEL_WIDTH } from '../../common/constants';

export interface PanelEdit {
  title?: string;
  messages: A2uiMessage[];
  queries: EsqlQuery[];
}

/**
 * Folds one panel's edits back into the app document.
 *
 * A panel's parts live in three places — chrome in `panels`, components in
 * `surfaces`, data in `queries` — so writing one back means touching all three
 * while leaving every other panel alone.
 */
export function applyPanelEdit(
  definition: CustomAppDefinition,
  panelId: string,
  { title, messages, queries }: PanelEdit
): CustomAppDefinition {
  // A panel with no queries drops its key rather than storing an empty array,
  // so the saved document stays as small as it was.
  const { [panelId]: _dropped, ...otherQueries } = definition.queries ?? {};

  return {
    ...definition,
    panels: {
      ...definition.panels,
      // Merged, not replaced: `hideBorder` and `tab` are set elsewhere and are
      // not part of this editor, so overwriting the entry would silently move
      // the panel out of its tab and give it a frame back.
      [panelId]: { ...definition.panels[panelId], title },
    },
    surfaces: { ...definition.surfaces, [panelId]: messages },
    queries: queries.length > 0 ? { ...otherQueries, [panelId]: queries } : otherQueries,
  };
}

/** The bottom of the panels in one scope, so a new one lands below them. */
function bottomOfScope(definition: CustomAppDefinition, tab: string | undefined): number {
  let bottom = 0;
  for (const [id, widget] of Object.entries(definition.layout)) {
    if (definition.panels[id]?.tab !== tab) continue;
    if (widget.type === 'panel') {
      bottom = Math.max(bottom, widget.row + widget.height);
    } else {
      for (const panel of Object.values(widget.panels)) {
        bottom = Math.max(bottom, widget.row + panel.row + panel.height);
      }
    }
  }
  return bottom;
}

function nextPanelId(definition: CustomAppDefinition): string {
  const taken = new Set(Object.keys(definition.layout));
  let index = taken.size + 1;
  while (taken.has(`panel${index}`)) index++;
  return `panel${index}`;
}

/**
 * Appends an empty panel below whatever is already on screen.
 *
 * The new panel joins `activeTab`. Leaving it untabbed would drop it into the
 * persistent strip above the tab bar — not where someone pressing "Add panel"
 * while reading a tab expects it, and it would put a panel sized from the whole
 * document into a strip three rows tall.
 */
export function addPanelTo(
  definition: CustomAppDefinition,
  activeTab: string | undefined
): CustomAppDefinition {
  const id = nextPanelId(definition);

  return {
    ...definition,
    layout: {
      ...definition.layout,
      [id]: {
        type: 'panel',
        id,
        // Measured within the scope the panel is joining, not across the whole
        // document, or it would land far below everything it belongs with.
        row: bottomOfScope(definition, activeTab),
        column: 0,
        width: DEFAULT_PANEL_WIDTH,
        height: DEFAULT_PANEL_HEIGHT,
      },
    },
    panels: {
      ...definition.panels,
      [id]: { title: 'New panel', ...(activeTab ? { tab: activeTab } : {}) },
    },
    surfaces: {
      ...definition.surfaces,
      [id]: [
        {
          version: 'v1.0',
          createSurface: {
            surfaceId: id,
            catalogId: 'elastic/kibana-eui/v1',
            components: [{ id: 'root', component: 'Text', text: 'Edit this panel.' }],
          },
        },
      ] as A2uiMessage[],
    },
  };
}
