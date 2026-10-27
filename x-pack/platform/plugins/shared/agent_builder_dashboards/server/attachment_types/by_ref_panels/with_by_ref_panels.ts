/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isSavedObjectErrorResult,
  type SavedObject,
  type SavedObjectBulkResult,
  type SavedObjectsClientContract,
} from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/core/server';
import {
  OPAQUE_PANEL_LIMITS,
  type OpaquePanelSummary,
  type DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import {
  findByRefPanels,
  getDataViewIds,
  summarizeSavedObject,
  truncate,
  type ByRefPanel,
} from './by_ref_panels';

interface WithByRefPanelsDeps {
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}

const toKey = (type: string, id: string) => `${type}:${id}`;

const bulkGetByKey = async (
  savedObjectsClient: SavedObjectsClientContract,
  objects: Array<{ type: string; id: string }>
): Promise<Map<string, SavedObjectBulkResult>> => {
  const unique = [...new Map(objects.map((object) => [toKey(object.type, object.id), object]))];
  if (unique.length === 0) return new Map();
  const { saved_objects: savedObjects } = await savedObjectsClient.bulkGet(
    unique.map(([, object]) => object)
  );
  return new Map(
    savedObjects.map((savedObject) => [toKey(savedObject.type, savedObject.id), savedObject])
  );
};

const getDataViewTitles = async (
  savedObjectsClient: SavedObjectsClientContract,
  savedObjects: SavedObject[]
): Promise<Map<string, string>> => {
  const dataViews = await bulkGetByKey(
    savedObjectsClient,
    savedObjects.flatMap(getDataViewIds).map((id) => ({ type: 'index-pattern', id }))
  );
  return new Map(
    [...dataViews.values()].flatMap((dataView) => {
      if (isSavedObjectErrorResult(dataView)) return [];
      const { title } = dataView.attributes as { title?: unknown };
      return typeof title === 'string' ? [[dataView.id, title] as const] : [];
    })
  );
};

const withSummaries = (
  data: DashboardAttachmentData,
  summaries: OpaquePanelSummary[]
): DashboardAttachmentData =>
  summaries.length > 0 ? { ...data, _derived: { opaque_panels: summaries } } : data;

/**
 * Sets `_derived.opaque_panels` to a read-only summary of every panel that only references a
 * saved object, so the agent can tell what those panels show. Resolved summaries already present
 * for the same saved object are kept, so each one is read once per conversation.
 */
export const withByRefPanels = async (
  { _derived: { opaque_panels: currentSummaries = [] } = {}, ...data }: DashboardAttachmentData,
  { savedObjectsClient, logger }: WithByRefPanelsDeps
): Promise<DashboardAttachmentData> => {
  const byRefPanels = findByRefPanels(data).slice(0, OPAQUE_PANEL_LIMITS.entries);
  if (byRefPanels.length === 0) return data;

  const current = new Map(
    currentSummaries.map((summary) => [toKey(summary.panel_id, summary.saved_object_id), summary])
  );
  const getResolved = ({ panelId, savedObjectId }: ByRefPanel) => {
    const summary = current.get(toKey(panelId, savedObjectId));
    return summary?.resolved ? summary : undefined;
  };
  const missing = byRefPanels.filter((panel) => !getResolved(panel));

  try {
    const savedObjects = await bulkGetByKey(
      savedObjectsClient,
      missing.map(({ savedObjectType, savedObjectId }) => ({
        type: savedObjectType,
        id: savedObjectId,
      }))
    );
    const dataViewTitles = await getDataViewTitles(
      savedObjectsClient,
      [...savedObjects.values()].filter(
        (savedObject): savedObject is SavedObject => !isSavedObjectErrorResult(savedObject)
      )
    );

    const summaries = byRefPanels.map((panel): OpaquePanelSummary => {
      const existing = getResolved(panel);
      if (existing) return existing;
      const { panelId, savedObjectType, savedObjectId } = panel;
      const identity = { panel_id: panelId, saved_object_id: savedObjectId };
      const savedObject = savedObjects.get(toKey(savedObjectType, savedObjectId));
      if (!savedObject) {
        return { ...identity, resolved: false, error: 'Not found' };
      }
      if (isSavedObjectErrorResult(savedObject)) {
        return {
          ...identity,
          resolved: false,
          error: truncate(savedObject.error.message, OPAQUE_PANEL_LIMITS.textLength),
        };
      }
      return {
        ...identity,
        resolved: true,
        ...summarizeSavedObject(savedObject, dataViewTitles),
      };
    });
    return withSummaries(data, summaries);
  } catch (error) {
    logger.warn(`Failed to summarize dashboard by-reference panels: ${error}`);
    const kept = byRefPanels.flatMap(
      ({ panelId, savedObjectId }) => current.get(toKey(panelId, savedObjectId)) ?? []
    );
    return withSummaries(data, kept);
  }
};
