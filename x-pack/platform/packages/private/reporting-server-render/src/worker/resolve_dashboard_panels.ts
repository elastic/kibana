/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LoopbackHttpClient } from '../services/loopback_http_client';
import type { DashboardPanelLayout } from './dashboard_panel_layout';

interface DashboardPanelsJsonEntry {
  panelIndex?: string;
  gridData: { x: number; y: number; w: number; h: number; i: string };
  title?: string;
  panelRefName?: string;
  /** The embeddable's saved-object type, e.g. `'lens'`, `'search'`, `'map'`. */
  type?: string;
}

interface DashboardSavedObjectResponse {
  attributes: {
    title?: string;
    panelsJSON: string;
  };
  references: Array<{ name: string; type: string; id: string }>;
}

/**
 * Reads a dashboard's own saved `panelsJSON` (`{x,y,w,h,i}` grid units per panel; see
 * `dashboard_panel_layout.ts`'s doc comment) over the same loopback connection every other
 * API call in this worker uses, rather than asking the navigated page to measure its own
 * layout -- jsdom has no CSS Grid engine to measure (see `computePanelPixelPositions`'s doc
 * comment), so the one source of truth for a panel's position is the data that produced it.
 *
 * Returned sorted into reading order (`gridData.y` then `gridData.x`), *not* the saved
 * object's own raw `panelsJSON` array order -- `DashboardGrid`/`GridLayout` renders
 * `[data-shared-item]` elements in reading order regardless of a panel's position in the
 * saved array (confirmed live: a dashboard whose `'map'` panel is `panelsJSON[0]` but sits
 * visually at row 7 of 8 rendered its `[data-shared-item]` for that panel 7th in the DOM,
 * not 1st -- every downstream index-based correlation, `matchPanelsToElements` and
 * `render_dashboard_report.ts`'s `mapPanelIndexes`, was silently matching the wrong panel
 * to the wrong element/exclusion before this sort was added, which is why that `'map'`
 * panel's own `[data-render-complete]` wait was never actually being skipped). Sorting
 * once here, at the single source of truth for panel order, keeps every caller correct
 * without each needing its own reading-order logic.
 */
export const resolveDashboardPanelLayout = async (
  client: LoopbackHttpClient,
  dashboardId: string
): Promise<{ title?: string; panels: DashboardPanelLayout[] }> => {
  const so = await client.fetchJson<DashboardSavedObjectResponse>(
    `/api/saved_objects/dashboard/${encodeURIComponent(dashboardId)}`
  );

  let parsed: DashboardPanelsJsonEntry[];
  try {
    parsed = JSON.parse(so.attributes.panelsJSON);
  } catch (error) {
    throw new Error(`Could not parse panelsJSON for dashboard "${dashboardId}": ${error}`);
  }

  const references = so.references ?? [];
  const panels: DashboardPanelLayout[] = parsed
    .map((entry) => {
      const panelIndex = entry.panelIndex ?? entry.gridData.i;
      // A dashboard's own references are namespaced per-panel as `${panelIndex}:${panelRefName}`
      // (not the bare `panelRefName`) -- necessary since two different panels can each save a
      // reference under the same `panelRefName` (e.g. `panel_0`), so the panel index prefix is
      // what keeps them from colliding. Confirmed live against a real dashboard's `references`
      // array, e.g. `{ name: '4:panel_4', type: 'map', id: '...' }` for the panel whose
      // `panelIndex` is `'4'` and `panelRefName` is `'panel_4'`. Matching on the bare
      // `panelRefName` alone (as this used to) never matched anything, silently leaving every
      // by-reference panel's `savedObjectId` `undefined`.
      const savedObjectId = references.find(
        (ref) => ref.name === `${panelIndex}:${entry.panelRefName}`
      )?.id;
      return {
        panelIndex,
        gridData: entry.gridData,
        title: entry.title,
        type: entry.type,
        savedObjectId,
      };
    })
    .sort((a, b) => a.gridData.y - b.gridData.y || a.gridData.x - b.gridData.x);

  return { title: so.attributes.title, panels };
};
