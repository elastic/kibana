/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggDescriptor,
  ColorDynamicOptions,
  LayerDescriptor,
  SizeDynamicOptions,
  VectorStylePropertiesDescriptor,
} from '../../../common/descriptor_types';
import {
  AGG_TYPE,
  COLOR_MAP_TYPE,
  DEFAULT_PERCENTILE,
  FIELD_ORIGIN,
  GRID_RESOLUTION,
  RENDER_AS,
  STYLE_TYPE,
  VECTOR_STYLES,
} from '../../../common/constants';
import { VectorStyle } from '../styles/vector/vector_style';
import { ESGeoGridSource } from '../sources/es_geo_grid_source';
import { GeoJsonVectorLayer } from './vector_layer';
import { HeatmapLayer } from './heatmap_layer';
import { getDefaultDynamicProperties } from '../styles/vector/vector_style_defaults';
import { NUMERICAL_COLOR_PALETTES } from '../styles/color_palettes';
import { getSourceAggKey } from '../../../common/get_agg_key';
import { isMetricCountable } from '../util/is_metric_countable';

const defaultDynamicProperties = getDefaultDynamicProperties();

export interface CreateTileMapLayerDescriptorParams {
  label: string;
  mapType: string;
  colorSchema: string;
  indexPatternId?: string;
  geoFieldName?: string;
  metricAgg: string;
  metricFieldName?: string;
}

function isHeatmap(mapType: string): boolean {
  return mapType.toLowerCase() === 'heatmap';
}

function getGeoGridRequestType(mapType: string): RENDER_AS {
  if (isHeatmap(mapType)) {
    return RENDER_AS.HEATMAP;
  }

  if (mapType.toLowerCase() === 'shaded geohash grid') {
    return RENDER_AS.GRID;
  }

  return RENDER_AS.POINT;
}

export function createAggDescriptor(
  mapType: string,
  metricAgg: string,
  metricFieldName?: string
): AggDescriptor {
  const aggTypeKey = Object.keys(AGG_TYPE).find((key) => {
    return AGG_TYPE[key as keyof typeof AGG_TYPE] === metricAgg;
  });
  const aggType = aggTypeKey ? AGG_TYPE[aggTypeKey as keyof typeof AGG_TYPE] : undefined;

  if (
    !aggType ||
    aggType === AGG_TYPE.COUNT ||
    !metricFieldName ||
    (isHeatmap(mapType) && !isMetricCountable(aggType))
  ) {
    return { type: AGG_TYPE.COUNT };
  }

  return aggType === AGG_TYPE.PERCENTILE
    ? { type: aggType, field: metricFieldName, percentile: DEFAULT_PERCENTILE }
    : { type: aggType, field: metricFieldName };
}

export function createTileMapLayerDescriptor({
  label,
  mapType,
  colorSchema,
  indexPatternId,
  geoFieldName,
  metricAgg,
  metricFieldName,
}: CreateTileMapLayerDescriptorParams): LayerDescriptor | null {
  if (!indexPatternId || !geoFieldName) {
    return null;
  }

  const metricsDescriptor = createAggDescriptor(mapType, metricAgg, metricFieldName);
  const geoGridSourceDescriptor = ESGeoGridSource.createDescriptor({
    index_pattern_id: indexPatternId,
    geo_field: geoFieldName,
    metrics: [metricsDescriptor],
    request_type: getGeoGridRequestType(mapType),
    resolution: GRID_RESOLUTION.MOST_FINE,
  });

  if (isHeatmap(mapType)) {
    return HeatmapLayer.createDescriptor({
      label,
      source_descriptor: geoGridSourceDescriptor,
    });
  }

  const metricSourceKey = getSourceAggKey({
    aggType: metricsDescriptor.type,
    aggFieldName: 'field' in metricsDescriptor ? metricsDescriptor.field : '',
  });
  const metricStyleField = {
    name: metricSourceKey,
    origin: FIELD_ORIGIN.SOURCE,
  };

  const colorPallette = NUMERICAL_COLOR_PALETTES.find((pallette) => {
    return pallette.value.toLowerCase() === colorSchema.toLowerCase();
  });
  const styleProperties: Partial<VectorStylePropertiesDescriptor> = {
    [VECTOR_STYLES.FILL_COLOR]: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        ...(defaultDynamicProperties[VECTOR_STYLES.FILL_COLOR].options as ColorDynamicOptions),
        field: metricStyleField,
        color: colorPallette ? colorPallette.value : 'Yellow to Red',
        type: COLOR_MAP_TYPE.ORDINAL,
        field_meta_options: {
          ...(defaultDynamicProperties[VECTOR_STYLES.FILL_COLOR].options as ColorDynamicOptions)
            .field_meta_options,
          is_enabled: false,
        },
      },
    },
    [VECTOR_STYLES.LINE_COLOR]: {
      type: STYLE_TYPE.STATIC,
      options: {
        color: '#3d3d3d',
      },
    },
  };
  if (mapType.toLowerCase() === 'scaled circle markers') {
    styleProperties[VECTOR_STYLES.ICON_SIZE] = {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        ...(defaultDynamicProperties[VECTOR_STYLES.ICON_SIZE].options as SizeDynamicOptions),
        max_size: 18,
        field: metricStyleField,
        field_meta_options: {
          ...(defaultDynamicProperties[VECTOR_STYLES.ICON_SIZE].options as SizeDynamicOptions)
            .field_meta_options,
          is_enabled: false,
        },
      },
    };
  }

  return GeoJsonVectorLayer.createDescriptor({
    label,
    source_descriptor: geoGridSourceDescriptor,
    style: VectorStyle.createDescriptor(styleProperties),
  });
}
