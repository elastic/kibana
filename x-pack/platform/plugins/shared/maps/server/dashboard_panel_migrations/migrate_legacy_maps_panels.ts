/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core/server';
import isPlainObject from 'lodash/isPlainObject';
import { v4 as uuidv4 } from 'uuid';
import type { SavedObjectReference } from '@kbn/core/server';
import { VISUALIZE_SAVED_OBJECT_TYPE, VISUALIZE_EMBEDDABLE_TYPE } from '@kbn/visualizations-common';
import { injectReferences, parseSearchSourceJSON } from '@kbn/data-plugin/common';
import type {
  PanelTypeMigrationPanel,
  PanelTypeMigrationResult,
  PanelTypeMigrationSuccessResult,
} from '@kbn/embeddable-plugin/server';
import {
  createLegacyCompatibleBasemapLayersFromLegacyParams,
  createLegacyRegionMapAggDescriptor,
  createLegacyTileMapAggDescriptor,
  getEmsLayerIdFromSelectedLayer,
  getLegacyGeoGridRequestType,
} from '../../common/legacy_maps_conversion';

import {
  AGG_TYPE,
  COLOR_MAP_TYPE,
  FIELD_ORIGIN,
  GRID_RESOLUTION,
  LAYER_STYLE_TYPE,
  LAYER_TYPE,
  SOURCE_TYPES,
  STYLE_TYPE,
  VECTOR_STYLES,
  MAP_SAVED_OBJECT_TYPE,
} from '../../common/constants';
import { getJoinAggKey, getSourceAggKey } from '../../common/get_agg_key';

const TILE_MAP_VIS_TYPE = 'tile_map' as const;
const REGION_MAP_VIS_TYPE = 'region_map' as const;

interface LegacyTileMapParams {
  mapType?: unknown;
  colorSchema?: unknown;
  isDesaturated?: unknown;
  wms?: unknown;
}

interface LegacyRegionMapParams {
  colorSchema?: unknown;
  selectedLayer?: unknown;
  selectedJoinField?: unknown;
  wms?: unknown;
}

interface LegacyVisState {
  title?: unknown;
  type?: unknown;
  params?: unknown;
  aggs?: unknown;
}

interface LegacyVisualizationSavedObjectAttributes {
  visState?: string;
  uiStateJSON?: string;
  kibanaSavedObjectMeta?: { searchSourceJSON?: string };
}

interface LegacyAgg {
  type?: unknown;
  schema?: unknown;
  params?: unknown;
}

interface LegacyUiState {
  mapCenter?: unknown;
  mapZoom?: unknown;
}

function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}

function getPanelBaseConfig(sourceConfig: Record<string, unknown>) {
  const { title, description, hide_title, hide_border, time_range, drilldowns } = sourceConfig;
  return omitUndefined({
    title,
    description,
    hide_title,
    hide_border,
    time_range,
    drilldowns,
  });
}

function parseJsonObject(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    const parsed = JSON.parse(value);
    return isPlainObject(parsed) ? (parsed as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

function getUiStateFromSavedVis(savedVis: any): LegacyUiState | undefined {
  const uiState = savedVis?.uiState;
  return isPlainObject(uiState) ? (uiState as LegacyUiState) : undefined;
}

function getUiStateFromSavedObjectAttributes(
  attributes: LegacyVisualizationSavedObjectAttributes
): LegacyUiState | undefined {
  const parsed = parseJsonObject(attributes.uiStateJSON);
  return parsed ? (parsed as LegacyUiState) : undefined;
}

function getMapCenterAndZoom(uiState: LegacyUiState | undefined): {
  center?: { lat: number; lon: number };
  zoom?: number;
} {
  const mapCenter = uiState?.mapCenter;
  const mapZoom = uiState?.mapZoom;

  const center =
    Array.isArray(mapCenter) &&
    mapCenter.length === 2 &&
    typeof mapCenter[0] === 'number' &&
    typeof mapCenter[1] === 'number'
      ? { lat: mapCenter[0], lon: mapCenter[1] }
      : undefined;

  const zoomRaw =
    typeof mapZoom === 'number'
      ? mapZoom
      : typeof mapZoom === 'string'
      ? parseInt(mapZoom, 10)
      : undefined;
  const zoom = typeof zoomRaw === 'number' && Number.isFinite(zoomRaw) ? zoomRaw : undefined;

  return { center, zoom };
}

function getIndexPatternIdFromSearchSource(searchSource: unknown): string | undefined {
  if (!isPlainObject(searchSource)) return undefined;
  const index = (searchSource as any).index;
  if (typeof index === 'string') return index;
  if (isPlainObject(index) && typeof (index as any).id === 'string') return (index as any).id;
  return undefined;
}

function getSearchSourceFromSavedObjectAttributes(
  searchSourceJSON: string | undefined,
  references: SavedObjectReference[]
): Record<string, unknown> | undefined {
  if (!searchSourceJSON) return undefined;

  let parsedSearchSource;
  try {
    parsedSearchSource = parseSearchSourceJSON(searchSourceJSON);
  } catch {
    return undefined;
  }

  try {
    const injected = injectReferences(parsedSearchSource, references);
    return isPlainObject(injected) ? (injected as Record<string, unknown>) : undefined;
  } catch {
    // fail open: if injection fails, fall back to parsed
    return isPlainObject(parsedSearchSource)
      ? (parsedSearchSource as Record<string, unknown>)
      : undefined;
  }
}

function getAggsFromSavedVis(savedVis: any): LegacyAgg[] {
  const dataAggs = savedVis?.data?.aggs;
  if (Array.isArray(dataAggs)) return dataAggs as LegacyAgg[];
  const aggs = savedVis?.aggs;
  return Array.isArray(aggs) ? (aggs as LegacyAgg[]) : [];
}

function getAggsFromVisState(visState: LegacyVisState): LegacyAgg[] {
  return Array.isArray(visState.aggs) ? (visState.aggs as LegacyAgg[]) : [];
}

function getFirstBucketAgg(aggs: LegacyAgg[]): LegacyAgg | undefined {
  return aggs.find((a) => a.schema === 'segment' || a.schema === 'bucket');
}

function getFirstMetricAgg(aggs: LegacyAgg[]): LegacyAgg | undefined {
  return aggs.find((a) => a.schema === 'metric');
}

function getAggFieldName(agg: LegacyAgg | undefined): string | undefined {
  const params = agg?.params;
  if (!isPlainObject(params)) return undefined;
  const field = (params as any).field;
  return typeof field === 'string' ? field : undefined;
}

function getTermsSize(agg: LegacyAgg | undefined): number | undefined {
  const params = agg?.params;
  if (!isPlainObject(params)) return undefined;
  const size = (params as any).size;
  return typeof size === 'number' ? size : undefined;
}

function getMetricAggType(agg: LegacyAgg | undefined): string | undefined {
  return typeof agg?.type === 'string' ? agg.type : undefined;
}

function createTileMapLayerDescriptor(params: {
  label: string;
  mapType: string;
  colorSchema: string;
  indexPatternId: string;
  geoFieldName: string;
  metricAgg: string | undefined;
  metricFieldName: string | undefined;
}) {
  const { label, mapType, colorSchema, indexPatternId, geoFieldName, metricAgg, metricFieldName } =
    params;

  const requestType = getLegacyGeoGridRequestType(mapType);
  const metricsDescriptor = createLegacyTileMapAggDescriptor(
    mapType,
    metricAgg ?? AGG_TYPE.COUNT,
    metricFieldName
  );

  const sourceDescriptor = {
    type: SOURCE_TYPES.ES_GEO_GRID,
    id: uuidv4(),
    indexPatternId,
    geoField: geoFieldName,
    metrics: [metricsDescriptor],
    requestType,
    resolution: GRID_RESOLUTION.MOST_FINE,
    applyGlobalQuery: true,
    applyGlobalTime: true,
    applyForceRefresh: true,
  } as const;

  if (requestType === 'heatmap') {
    return {
      id: uuidv4(),
      type: LAYER_TYPE.HEATMAP,
      label,
      visible: true,
      alpha: 1,
      minZoom: 0,
      maxZoom: 24,
      sourceDescriptor,
      style: { type: LAYER_STYLE_TYPE.HEATMAP, colorRampName: 'theclassic' },
    };
  }

  const metricSourceKey = getSourceAggKey({
    aggType: metricsDescriptor.type,
    aggFieldName: 'field' in metricsDescriptor ? metricsDescriptor.field : '',
  });

  const metricStyleField = {
    name: metricSourceKey,
    origin: FIELD_ORIGIN.SOURCE,
  } as const;

  const styleProperties: Record<string, unknown> = {
    [VECTOR_STYLES.FILL_COLOR]: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        field: metricStyleField,
        color: colorSchema || 'Yellow to Red',
        type: COLOR_MAP_TYPE.ORDINAL,
        fieldMetaOptions: { isEnabled: false },
      },
    },
    [VECTOR_STYLES.LINE_COLOR]: {
      type: STYLE_TYPE.STATIC,
      options: { color: '#3d3d3d' },
    },
  };

  if (mapType.toLowerCase() === 'scaled circle markers') {
    styleProperties[VECTOR_STYLES.ICON_SIZE] = {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        minSize: 7,
        maxSize: 18,
        field: metricStyleField,
        fieldMetaOptions: { isEnabled: false },
      },
    };
  }

  return {
    id: uuidv4(),
    type: LAYER_TYPE.GEOJSON_VECTOR,
    label,
    visible: true,
    alpha: 1,
    minZoom: 0,
    maxZoom: 24,
    sourceDescriptor,
    style: {
      type: LAYER_STYLE_TYPE.VECTOR,
      properties: styleProperties,
    },
    joins: [],
    disableTooltips: false,
  };
}

function createRegionMapLayerDescriptor(params: {
  label: string;
  emsLayerId: string;
  leftFieldName: string;
  termsFieldName: string;
  termsSize?: number;
  colorSchema: string;
  indexPatternId: string;
  metricAgg: string | undefined;
  metricFieldName: string | undefined;
}) {
  const {
    label,
    emsLayerId,
    leftFieldName,
    termsFieldName,
    termsSize,
    colorSchema,
    indexPatternId,
    metricAgg,
    metricFieldName,
  } = params;

  const metricsDescriptor = createLegacyRegionMapAggDescriptor(
    metricAgg ?? AGG_TYPE.COUNT,
    metricFieldName
  );
  const joinId = uuidv4();
  const joinKey = getJoinAggKey({
    aggType: metricsDescriptor.type,
    aggFieldName: 'field' in metricsDescriptor ? metricsDescriptor.field : '',
    rightSourceId: joinId,
  });

  return {
    id: uuidv4(),
    type: LAYER_TYPE.GEOJSON_VECTOR,
    label,
    visible: true,
    alpha: 1,
    minZoom: 0,
    maxZoom: 24,
    sourceDescriptor: {
      type: SOURCE_TYPES.EMS_FILE,
      id: emsLayerId,
      tooltipProperties: ['name', leftFieldName],
    },
    joins: [
      {
        leftField: leftFieldName,
        right: {
          type: SOURCE_TYPES.ES_TERM_SOURCE,
          id: joinId,
          indexPatternId,
          term: termsFieldName,
          ...(termsSize !== undefined ? { size: termsSize } : {}),
          metrics: [metricsDescriptor],
          applyGlobalQuery: true,
          applyGlobalTime: true,
          applyForceRefresh: true,
        },
      },
    ],
    style: {
      type: LAYER_STYLE_TYPE.VECTOR,
      properties: {
        [VECTOR_STYLES.FILL_COLOR]: {
          type: STYLE_TYPE.DYNAMIC,
          options: {
            field: { name: joinKey, origin: FIELD_ORIGIN.JOIN },
            color: colorSchema || 'Yellow to Red',
            type: COLOR_MAP_TYPE.ORDINAL,
            fieldMetaOptions: { isEnabled: false },
          },
        },
      },
    },
    disableTooltips: false,
  };
}

function buildMapAttributesFromTileMap(args: {
  title: string;
  params: LegacyTileMapParams;
  aggs: LegacyAgg[];
  searchSource: unknown;
  uiState: LegacyUiState | undefined;
}): Record<string, unknown> | undefined {
  const mapType = typeof args.params.mapType === 'string' ? args.params.mapType : undefined;
  const colorSchema =
    typeof args.params.colorSchema === 'string' ? args.params.colorSchema : 'Yellow to Red';
  if (!mapType) return undefined;

  const indexPatternId = getIndexPatternIdFromSearchSource(args.searchSource);
  if (!indexPatternId) return undefined;

  const bucket = getFirstBucketAgg(args.aggs);
  if (getMetricAggType(bucket) !== 'geohash_grid') return undefined;
  const geoFieldName = getAggFieldName(bucket);
  if (!geoFieldName) return undefined;

  const metric = getFirstMetricAgg(args.aggs);
  const metricAgg = getMetricAggType(metric);
  const metricFieldName = getAggFieldName(metric);

  const layer = createTileMapLayerDescriptor({
    label: args.title,
    mapType,
    colorSchema,
    indexPatternId,
    geoFieldName,
    metricAgg,
    metricFieldName,
  });
  const basemapLayers = createLegacyCompatibleBasemapLayersFromLegacyParams(args.params, {
    idGenerator: uuidv4,
  });

  const { center, zoom } = getMapCenterAndZoom(args.uiState);

  return omitUndefined({
    title: args.title,
    isLayerTOCOpen: true,
    settings: { projection: 'mercator' },
    layers: [...basemapLayers, layer],
    ...(center ? { center } : {}),
    ...(zoom !== undefined ? { zoom } : {}),
  }) as Record<string, unknown>;
}

function buildMapAttributesFromRegionMap(args: {
  title: string;
  params: LegacyRegionMapParams;
  aggs: LegacyAgg[];
  searchSource: unknown;
  uiState: LegacyUiState | undefined;
}): Record<string, unknown> | undefined {
  const colorSchema =
    typeof args.params.colorSchema === 'string' ? args.params.colorSchema : 'Yellow to Red';

  const selectedLayer = args.params.selectedLayer as any;
  const selectedJoinField = args.params.selectedJoinField as any;
  if (!selectedLayer || !selectedJoinField) return undefined;
  if (selectedLayer.isEMS !== true) return undefined;
  const emsLayerId = getEmsLayerIdFromSelectedLayer(selectedLayer);
  const leftFieldName =
    typeof selectedJoinField.name === 'string' ? selectedJoinField.name : undefined;
  if (!emsLayerId || !leftFieldName) return undefined;

  const indexPatternId = getIndexPatternIdFromSearchSource(args.searchSource);
  if (!indexPatternId) return undefined;

  const bucket = getFirstBucketAgg(args.aggs);
  if (getMetricAggType(bucket) !== 'terms') return undefined;
  const termsFieldName = getAggFieldName(bucket);
  if (!termsFieldName) return undefined;
  const termsSize = getTermsSize(bucket);

  const metric = getFirstMetricAgg(args.aggs);
  const metricAgg = getMetricAggType(metric);
  const metricFieldName = getAggFieldName(metric);

  const layer = createRegionMapLayerDescriptor({
    label: args.title,
    emsLayerId,
    leftFieldName,
    termsFieldName,
    termsSize,
    colorSchema,
    indexPatternId,
    metricAgg,
    metricFieldName,
  });
  const basemapLayers = createLegacyCompatibleBasemapLayersFromLegacyParams(args.params, {
    idGenerator: uuidv4,
  });

  const { center, zoom } = getMapCenterAndZoom(args.uiState);

  return omitUndefined({
    title: args.title,
    isLayerTOCOpen: true,
    settings: { projection: 'mercator' },
    layers: [...basemapLayers, layer],
    ...(center ? { center } : {}),
    ...(zoom !== undefined ? { zoom } : {}),
  }) as Record<string, unknown>;
}

function getByValueMapResult(
  panelId: string,
  config: Record<string, unknown>
): PanelTypeMigrationSuccessResult | undefined {
  const savedVis = (config as any).savedVis;
  if (!isPlainObject(savedVis) || typeof (savedVis as any).type !== 'string') return undefined;

  const visType = (savedVis as any).type;
  const title = typeof (savedVis as any).title === 'string' ? (savedVis as any).title : 'Map';

  const aggs = getAggsFromSavedVis(savedVis);
  const searchSource = (savedVis as any)?.data?.searchSource;
  const uiState = getUiStateFromSavedVis(savedVis);

  const attributes =
    visType === TILE_MAP_VIS_TYPE
      ? buildMapAttributesFromTileMap({
          title,
          params: (savedVis as any).params as LegacyTileMapParams,
          aggs,
          searchSource,
          uiState,
        })
      : visType === REGION_MAP_VIS_TYPE
      ? buildMapAttributesFromRegionMap({
          title,
          params: (savedVis as any).params as LegacyRegionMapParams,
          aggs,
          searchSource,
          uiState,
        })
      : undefined;

  if (!attributes) return undefined;

  return {
    panelId,
    config: {
      ...getPanelBaseConfig(config),
      attributes,
    },
  };
}

function getByReferenceMapResult(args: {
  panelId: string;
  baseConfig: Record<string, unknown>;
  attributes: LegacyVisualizationSavedObjectAttributes;
  references: SavedObjectReference[];
}): PanelTypeMigrationSuccessResult | undefined {
  const visStateString = args.attributes.visState;
  if (typeof visStateString !== 'string') return undefined;

  let visState: LegacyVisState;
  try {
    const parsed = JSON.parse(visStateString);
    if (!isPlainObject(parsed)) return undefined;
    visState = parsed as LegacyVisState;
  } catch {
    return undefined;
  }

  const visType = visState.type;
  if (visType !== TILE_MAP_VIS_TYPE && visType !== REGION_MAP_VIS_TYPE) return undefined;

  const title = typeof visState.title === 'string' ? visState.title : 'Map';
  const aggs = getAggsFromVisState(visState);
  const uiState = getUiStateFromSavedObjectAttributes(args.attributes);
  const searchSource = getSearchSourceFromSavedObjectAttributes(
    args.attributes.kibanaSavedObjectMeta?.searchSourceJSON,
    args.references
  );

  const attributes =
    visType === TILE_MAP_VIS_TYPE
      ? buildMapAttributesFromTileMap({
          title,
          params: (visState.params ?? {}) as LegacyTileMapParams,
          aggs,
          searchSource,
          uiState,
        })
      : buildMapAttributesFromRegionMap({
          title,
          params: (visState.params ?? {}) as LegacyRegionMapParams,
          aggs,
          searchSource,
          uiState,
        });

  if (!attributes) return undefined;

  return {
    panelId: args.panelId,
    config: {
      ...args.baseConfig,
      attributes,
    },
  };
}

export async function migrateLegacyTileAndRegionMapPanels(
  panels: readonly PanelTypeMigrationPanel[],
  savedObjectsClient: SavedObjectsClientContract
): Promise<readonly PanelTypeMigrationResult[]> {
  const results: PanelTypeMigrationResult[] = [];

  const byRefCandidates: Array<{
    panelId: string;
    savedObjectId: string;
    baseConfig: Record<string, unknown>;
  }> = [];

  for (const panel of panels) {
    const config = panel.config;
    const byValueResult = getByValueMapResult(panel.id, config);
    if (byValueResult) {
      results.push(byValueResult);
      continue;
    }

    const savedObjectId = (config as any).savedObjectId;
    if (typeof savedObjectId === 'string' && savedObjectId.length > 0) {
      byRefCandidates.push({
        panelId: panel.id,
        savedObjectId,
        baseConfig: getPanelBaseConfig(config),
      });
    }
  }

  if (byRefCandidates.length === 0) {
    return results;
  }

  const uniqueIds = Array.from(new Set(byRefCandidates.map((c) => c.savedObjectId)));

  let bulkGetResponse;
  try {
    bulkGetResponse = await savedObjectsClient.bulkGet(
      uniqueIds.map((id) => ({ type: VISUALIZE_SAVED_OBJECT_TYPE, id }))
    );
  } catch {
    return results;
  }

  const byId = new Map<string, unknown>();
  uniqueIds.forEach((id, idx) => {
    byId.set(id, bulkGetResponse.saved_objects[idx]);
  });

  for (const candidate of byRefCandidates) {
    const bulkItem = byId.get(candidate.savedObjectId);
    if (!bulkItem) continue;
    if (isSavedObjectErrorResult(bulkItem as any)) continue;

    const attrs = (bulkItem as any).attributes as
      | LegacyVisualizationSavedObjectAttributes
      | undefined;
    if (!attrs) continue;

    const refs = ((bulkItem as any).references ?? []) as SavedObjectReference[];

    const byRefResult = getByReferenceMapResult({
      panelId: candidate.panelId,
      baseConfig: candidate.baseConfig,
      attributes: attrs,
      references: refs,
    });
    if (byRefResult) {
      results.push(byRefResult);
    }
  }

  return results;
}

export const legacyVisualizeToMapPanelMigration = {
  from: VISUALIZE_EMBEDDABLE_TYPE,
  to: MAP_SAVED_OBJECT_TYPE,
} as const;
