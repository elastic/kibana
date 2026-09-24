/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { A2uiMessage } from '@kbn/a2ui-renderer';
import type { CustomAppDefinition, EsqlQuery } from '../../common/app_definition';

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
