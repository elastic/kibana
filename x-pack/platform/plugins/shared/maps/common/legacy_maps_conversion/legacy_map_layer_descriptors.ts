/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  ColorDynamicOptions,
  ESGeoGridSourceDescriptor,
  ESTermSourceDescriptor,
  HeatmapLayerDescriptor,
  SizeDynamicOptions,
  VectorLayerDescriptor,
  VectorStyleDescriptor,
  VectorStylePropertiesDescriptor,
} from '../descriptor_types';
import {
  AGG_TYPE,
  COLOR_MAP_TYPE,
  FIELD_ORIGIN,
  GRID_RESOLUTION,
  LAYER_STYLE_TYPE,
  LAYER_TYPE,
  RENDER_AS,
  SOURCE_TYPES,
  STYLE_TYPE,
  VECTOR_STYLES,
} from '../constants';
import { getJoinAggKey, getSourceAggKey } from '../get_agg_key';
import {
  createEmsFileSourceDescriptor,
  createHeatmapStyleDescriptor,
} from '../descriptor_factories';
import { createRegionMapAggDescriptor, createTileMapAggDescriptor } from './agg_descriptors';
import { getGeoGridRequestType } from './geo_grid_request_type';

// Matches numerical (gradient) palette `value`s from public color_palettes.
const NUMERICAL_COLOR_PALETTE_VALUES = [
  'Blues',
  'Greens',
  'Greys',
  'Reds',
  'Yellow to Red',
  'Green to Red',
  'Blue to Red',
  'theclassic',
] as const;

const DEFAULT_LEGACY_COLOR_SCHEMA = 'Yellow to Red';
const DEFAULT_COLOR_CATEGORY = 'palette_0';
const DEFAULT_SIGMA = 3;
const DEFAULT_ICON_MIN_SIZE = 7;
const DEFAULT_SCALED_CIRCLE_MAX_SIZE = 18;
const DEFAULT_LAYER_ALPHA = 0.75;

function resolveLegacyColorSchema(colorSchema: string): string {
  const match = NUMERICAL_COLOR_PALETTE_VALUES.find(
    (value) => value.toLowerCase() === colorSchema.toLowerCase()
  );
  return match ?? DEFAULT_LEGACY_COLOR_SCHEMA;
}

function buildVectorStyle(
  properties: Partial<VectorStylePropertiesDescriptor>
): VectorStyleDescriptor {
  return {
    type: LAYER_STYLE_TYPE.VECTOR,
    properties,
  };
}

export interface CreateTileMapLayerDescriptorParams {
  label: string;
  mapType: string;
  colorSchema: string;
  indexPatternId?: string;
  geoFieldName?: string;
  metricAgg?: string;
  metricFieldName?: string;
  alpha?: number;
  idGenerator?: () => string;
}

export function createTileMapLayerDescriptor(
  args: CreateTileMapLayerDescriptorParams
): HeatmapLayerDescriptor | VectorLayerDescriptor | null {
  const { indexPatternId, geoFieldName } = args;
  if (!indexPatternId || !geoFieldName) {
    return null;
  }

  const idGenerator = args.idGenerator ?? uuidv4;
  const color = resolveLegacyColorSchema(args.colorSchema);
  const alpha = args.alpha ?? DEFAULT_LAYER_ALPHA;
  const requestType = getGeoGridRequestType(args.mapType);
  const metricsDescriptor = createTileMapAggDescriptor(
    args.mapType,
    args.metricAgg ?? AGG_TYPE.COUNT,
    args.metricFieldName
  );

  const geoGridSourceDescriptor: ESGeoGridSourceDescriptor = {
    type: SOURCE_TYPES.ES_GEO_GRID,
    id: idGenerator(),
    indexPatternId,
    geoField: geoFieldName,
    metrics: [metricsDescriptor],
    requestType,
    resolution: GRID_RESOLUTION.MOST_FINE,
    applyGlobalQuery: true,
    applyGlobalTime: true,
    applyForceRefresh: true,
  };

  if (requestType === RENDER_AS.HEATMAP) {
    return {
      id: idGenerator(),
      type: LAYER_TYPE.HEATMAP,
      label: args.label,
      visible: true,
      alpha,
      minZoom: 0,
      maxZoom: 24,
      sourceDescriptor: geoGridSourceDescriptor,
      style: createHeatmapStyleDescriptor('theclassic'),
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

  const styleProperties: Partial<VectorStylePropertiesDescriptor> = {
    [VECTOR_STYLES.FILL_COLOR]: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        colorCategory: DEFAULT_COLOR_CATEGORY,
        field: metricStyleField,
        color,
        type: COLOR_MAP_TYPE.ORDINAL,
        fieldMetaOptions: {
          isEnabled: false,
          sigma: DEFAULT_SIGMA,
        },
      } as ColorDynamicOptions,
    },
    [VECTOR_STYLES.LINE_COLOR]: {
      type: STYLE_TYPE.STATIC,
      options: { color: '#3d3d3d' },
    },
  };

  if (args.mapType.toLowerCase() === 'scaled circle markers') {
    styleProperties[VECTOR_STYLES.ICON_SIZE] = {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        minSize: DEFAULT_ICON_MIN_SIZE,
        maxSize: DEFAULT_SCALED_CIRCLE_MAX_SIZE,
        field: metricStyleField,
        fieldMetaOptions: {
          isEnabled: false,
          sigma: DEFAULT_SIGMA,
        },
      } as SizeDynamicOptions,
    };
  }

  return {
    id: idGenerator(),
    type: LAYER_TYPE.GEOJSON_VECTOR,
    label: args.label,
    visible: true,
    alpha,
    minZoom: 0,
    maxZoom: 24,
    sourceDescriptor: geoGridSourceDescriptor,
    style: buildVectorStyle(styleProperties),
    joins: [],
    disableTooltips: false,
  };
}

export interface CreateRegionMapLayerDescriptorParams {
  label: string;
  emsLayerId?: string;
  leftFieldName?: string;
  termsFieldName?: string;
  termsSize?: number;
  colorSchema: string;
  indexPatternId?: string;
  metricAgg?: string;
  metricFieldName?: string;
  alpha?: number;
  idGenerator?: () => string;
}

export function createRegionMapLayerDescriptor(
  args: CreateRegionMapLayerDescriptorParams
): VectorLayerDescriptor | null {
  const { indexPatternId, emsLayerId, leftFieldName, termsFieldName } = args;
  if (!indexPatternId || !emsLayerId || !leftFieldName || !termsFieldName) {
    return null;
  }

  const idGenerator = args.idGenerator ?? uuidv4;
  const color = resolveLegacyColorSchema(args.colorSchema);
  const alpha = args.alpha ?? DEFAULT_LAYER_ALPHA;
  const metricsDescriptor = createRegionMapAggDescriptor(
    args.metricAgg ?? AGG_TYPE.COUNT,
    args.metricFieldName
  );

  const joinId = idGenerator();
  const joinKey = getJoinAggKey({
    aggType: metricsDescriptor.type,
    aggFieldName: 'field' in metricsDescriptor ? metricsDescriptor.field : '',
    rightSourceId: joinId,
  });

  const termSourceDescriptor: ESTermSourceDescriptor = {
    type: SOURCE_TYPES.ES_TERM_SOURCE,
    id: joinId,
    indexPatternId,
    term: termsFieldName,
    ...(args.termsSize !== undefined ? { size: args.termsSize } : {}),
    metrics: [metricsDescriptor],
    applyGlobalQuery: true,
    applyGlobalTime: true,
    applyForceRefresh: true,
  };

  const styleProperties: Partial<VectorStylePropertiesDescriptor> = {
    [VECTOR_STYLES.FILL_COLOR]: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        colorCategory: DEFAULT_COLOR_CATEGORY,
        field: { name: joinKey, origin: FIELD_ORIGIN.JOIN },
        color,
        type: COLOR_MAP_TYPE.ORDINAL,
        fieldMetaOptions: {
          isEnabled: false,
          sigma: DEFAULT_SIGMA,
        },
      } as ColorDynamicOptions,
    },
  };

  return {
    id: idGenerator(),
    type: LAYER_TYPE.GEOJSON_VECTOR,
    label: args.label,
    visible: true,
    alpha,
    minZoom: 0,
    maxZoom: 24,
    sourceDescriptor: createEmsFileSourceDescriptor({
      id: emsLayerId,
      tooltipProperties: ['name', leftFieldName],
    }),
    joins: [
      {
        leftField: leftFieldName,
        right: termSourceDescriptor,
      },
    ],
    style: buildVectorStyle(styleProperties),
    disableTooltips: false,
  };
}
