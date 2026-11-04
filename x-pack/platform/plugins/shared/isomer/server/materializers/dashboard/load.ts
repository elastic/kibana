/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core/server';
import type { DashboardPluginStart } from '@kbn/dashboard-plugin/server';
import type {
  DashboardConfig,
  DashboardPanelConfig,
  DashboardStateConfig,
  DroppedPanel,
} from './config';
import { isDashboardSection, markLoaded, parseDashboardConfig } from './config';
import { panelTitle, savedObjectTypeForPanel } from './panel_types';

type DashboardClient = DashboardPluginStart['client'];

interface StoredPanel {
  id?: unknown;
  type?: unknown;
  grid?: unknown;
  config?: unknown;
}

interface StoredSection {
  id?: unknown;
  panels: unknown[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isStoredSection = (value: unknown): value is StoredSection =>
  isRecord(value) && Array.isArray(value.panels);

const isGrid = (value: unknown): value is DashboardPanelConfig['grid'] =>
  isRecord(value) && ['x', 'y', 'w', 'h'].every((key) => typeof value[key] === 'number');

const panelIds = (state: DashboardStateConfig): Set<string> => {
  const ids = new Set<string>();
  for (const panel of state.panels) {
    for (const { id } of isDashboardSection(panel) ? panel.panels : [panel]) {
      if (id) {
        ids.add(id);
      }
    }
  }
  return ids;
};

const toDroppedPanel = (panel: StoredPanel, sectionId?: string): DroppedPanel | undefined => {
  const { id, type, grid, config } = panel;
  if (typeof id !== 'string' || typeof type !== 'string' || !isGrid(grid)) {
    return undefined;
  }
  const stored = isRecord(config) ? config : {};
  const savedVis = isRecord(stored.savedVis) ? stored.savedVis : {};
  const title = panelTitle(stored) ?? panelTitle(savedVis);
  const { savedObjectId } = stored;
  return {
    id,
    type,
    grid: { x: grid.x, y: grid.y, w: grid.w, h: grid.h },
    ...(sectionId ? { sectionId } : {}),
    ...(title !== undefined ? { title } : {}),
    ...(stored.hide_title === true ? { hideTitle: true } : {}),
    ...(typeof savedObjectId === 'string' && savedObjectId.length > 0
      ? { savedObject: { type: savedObjectTypeForPanel(type), id: savedObjectId } }
      : {}),
  };
};

/**
 * The panels the Dashboard API leaves out of `DashboardState` because their type has no as-code
 * schema (Maps and legacy visualizations, for example). The Dashboard app's read keeps them with
 * their positions, so they're the panels it has that the API's read doesn't.
 */
export const recoverDroppedPanels = (
  apiState: DashboardStateConfig,
  appPanels: unknown[]
): DroppedPanel[] => {
  const known = panelIds(apiState);
  const dropped: DroppedPanel[] = [];
  const recover = (panel: unknown, sectionId?: string) => {
    if (!isRecord(panel) || (typeof panel.id === 'string' && known.has(panel.id))) {
      return;
    }
    const recovered = toDroppedPanel(panel, sectionId);
    if (recovered) {
      dropped.push(recovered);
    }
  };
  for (const panel of appPanels) {
    if (isStoredSection(panel)) {
      const sectionId = typeof panel.id === 'string' ? panel.id : undefined;
      panel.panels.forEach((sectionPanel) => recover(sectionPanel, sectionId));
    } else {
      recover(panel);
    }
  }
  return dropped;
};

/** By-reference panels without a title of their own, which show their saved object's title. */
const untitledReferences = (
  state: DashboardStateConfig,
  dropped: DroppedPanel[]
): Array<{ panelId: string; type: string; id: string }> => {
  const references: Array<{ panelId: string; type: string; id: string }> = [];
  for (const panel of state.panels) {
    for (const { id, type, config } of isDashboardSection(panel) ? panel.panels : [panel]) {
      const { ref_id: refId } = config;
      if (id && typeof refId === 'string' && panelTitle(config) === undefined) {
        references.push({ panelId: id, type: savedObjectTypeForPanel(type), id: refId });
      }
    }
  }
  for (const { id, title, savedObject } of dropped) {
    if (savedObject && title === undefined) {
      references.push({ panelId: id, ...savedObject });
    }
  }
  return references;
};

/** The saved titles of by-reference panels without their own, by panel ID. */
const loadSavedTitles = async (
  savedObjectsClient: SavedObjectsClientContract,
  references: Array<{ panelId: string; type: string; id: string }>
): Promise<Record<string, string>> => {
  if (references.length === 0) {
    return {};
  }
  const { saved_objects: savedObjects } = await savedObjectsClient.bulkGet<{ title?: unknown }>(
    references.map(({ type, id }) => ({ type, id, fields: ['title'] }))
  );
  const titles: Record<string, string> = {};
  references.forEach(({ panelId }, index) => {
    const savedObject = savedObjects[index];
    if (!savedObject || isSavedObjectErrorResult(savedObject)) {
      return;
    }
    const { title } = savedObject.attributes;
    if (typeof title === 'string' && title.length > 0) {
      titles[panelId] = title;
    }
  });
  return titles;
};

/**
 * Loads a dashboard as the Dashboard API reads it, with the panels that read drops recovered from
 * the Dashboard app's read, and saved titles for by-reference panels without their own.
 */
export const loadDashboard = async (
  client: DashboardClient,
  savedObjectsClient: SavedObjectsClientContract,
  id: string
): Promise<DashboardConfig> => {
  const { data, warnings } = await client.read(savedObjectsClient, id);
  const { state } = parseDashboardConfig(data);
  const droppedPanels = warnings?.some(({ type }) => type === 'dropped_panel')
    ? recoverDroppedPanels(
        state,
        (await client.read(savedObjectsClient, id, { isDashboardAppRequest: true })).data
          .panels as unknown[]
      )
    : [];
  const savedTitles = await loadSavedTitles(
    savedObjectsClient,
    untitledReferences(state, droppedPanels)
  );
  return markLoaded({ state, id, droppedPanels, savedTitles });
};
