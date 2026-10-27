/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core-saved-objects-api-server';
import {
  OPAQUE_PANEL_LIMITS,
  isSection,
  type AttachmentPanel,
  type DashboardAttachmentData,
  type OpaquePanelSummary,
} from '@kbn/agent-builder-dashboards-common';

const { textLength: MAX_TEXT_LENGTH, listItems: MAX_LIST_ITEMS } = OPAQUE_PANEL_LIMITS;

/** Saved object type behind each panel type, and the config key holding its id. */
const byRefPanelTypes: Record<string, { savedObjectType: string; idKey: string }> = {
  legacy_vis: { savedObjectType: 'visualization', idKey: 'savedObjectId' },
  map: { savedObjectType: 'map', idKey: 'savedObjectId' },
  vis: { savedObjectType: 'lens', idKey: 'ref_id' },
  discover_session: { savedObjectType: 'search', idKey: 'ref_id' },
};

export interface ByRefPanel {
  panelId: string;
  panelType: string;
  savedObjectType: string;
  savedObjectId: string;
}

/** What a saved object shows, projected for the agent. Every field is optional. */
export type SavedObjectSummary = Omit<
  OpaquePanelSummary,
  'panel_id' | 'saved_object_id' | 'resolved' | 'error'
>;

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const parseJson = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

/** Truncates to at most `maxLength` characters, ellipsis included. */
export const truncate = (value: string, maxLength: number): string =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;

const asText = (value: unknown): string | undefined => {
  const text = asString(value);
  return text && truncate(text, MAX_TEXT_LENGTH);
};

/** Returns the dashboard's panels that only carry a reference to a saved object. */
export const findByRefPanels = ({ panels }: DashboardAttachmentData): ByRefPanel[] =>
  panels
    .flatMap((widget): AttachmentPanel[] => (isSection(widget) ? widget.panels : [widget]))
    .flatMap(({ id, type, config }) => {
      const itemType = byRefPanelTypes[type];
      const savedObjectId = itemType && asString(config[itemType.idKey]);
      return itemType && savedObjectId
        ? [
            {
              panelId: id,
              panelType: type,
              savedObjectType: itemType.savedObjectType,
              savedObjectId,
            },
          ]
        : [];
    });

/** Ids of the data views a saved object references. */
export const getDataViewIds = ({ references }: SavedObject): string[] =>
  references.filter(({ type }) => type === 'index-pattern').map(({ id }) => id);

/** Returns the ES|QL or KQL text of a query object. */
const queryText = (query: unknown): string | undefined =>
  isRecord(query) ? asString(query.esql) ?? asString(query.query) : undefined;

const searchSourceQuery = (meta: unknown): string | undefined => {
  const searchSource = parseJson(isRecord(meta) ? meta.searchSourceJSON : undefined);
  return isRecord(searchSource) ? queryText(searchSource.query) : undefined;
};

interface TypeSummary {
  chartType?: unknown;
  query?: string;
}

const summarizers: Record<string, (attributes: UnknownRecord) => TypeSummary> = {
  visualization: ({ visState, kibanaSavedObjectMeta }) => {
    const parsedVisState = parseJson(visState);
    return {
      chartType: isRecord(parsedVisState) ? parsedVisState.type : undefined,
      query: searchSourceQuery(kibanaSavedObjectMeta),
    };
  },
  lens: ({ visualizationType, state }) => ({
    chartType: visualizationType,
    query: isRecord(state) ? queryText(state.query) : undefined,
  }),
  map: () => ({ chartType: 'map' }),
  search: ({ tabs, kibanaSavedObjectMeta }) => {
    const [firstTab] = Array.isArray(tabs) ? tabs : [];
    const tabAttributes = isRecord(firstTab) ? firstTab.attributes : undefined;
    return {
      chartType: 'search',
      query: searchSourceQuery(
        isRecord(tabAttributes) ? tabAttributes.kibanaSavedObjectMeta : kibanaSavedObjectMeta
      ),
    };
  },
};

/** Summarizes a saved object by the same minimal fields for every type. */
export const summarizeSavedObject = (
  savedObject: SavedObject,
  dataViewTitles: ReadonlyMap<string, string>
): SavedObjectSummary => {
  const attributes = isRecord(savedObject.attributes) ? savedObject.attributes : {};
  const { chartType, query } = summarizers[savedObject.type]?.(attributes) ?? {};
  const dataViews = [
    ...new Set(getDataViewIds(savedObject).flatMap((id) => asText(dataViewTitles.get(id)) ?? [])),
  ].slice(0, MAX_LIST_ITEMS);
  const summary: SavedObjectSummary = {
    title: asText(attributes.title),
    chart_type: asText(chartType),
    data_views: dataViews.length > 0 ? dataViews : undefined,
    query: asText(query),
  };
  return Object.fromEntries(
    Object.entries(summary).filter(([, value]) => value !== undefined)
  ) as SavedObjectSummary;
};
