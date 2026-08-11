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
  createLegacyTileMapAggDescriptor,
  getLegacyGeoGridRequestType,
} from '../../../common/legacy_maps_conversion';
import {
  COLOR_MAP_TYPE,
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

export function createAggDescriptor(
  mapType: string,
  metricAgg: string,
  metricFieldName?: string
): AggDescriptor {
  return createLegacyTileMapAggDescriptor(mapType, metricAgg, metricFieldName);
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

  const requestType = getLegacyGeoGridRequestType(mapType);
  const metricsDescriptor = createAggDescriptor(mapType, metricAgg, metricFieldName);
  const geoGridSourceDescriptor = ESGeoGridSource.createDescriptor({
    indexPatternId,
    geoField: geoFieldName,
    metrics: [metricsDescriptor],
    requestType,
    resolution: GRID_RESOLUTION.MOST_FINE,
  });

  if (requestType === RENDER_AS.HEATMAP) {
    return HeatmapLayer.createDescriptor({
      label,
      sourceDescriptor: geoGridSourceDescriptor,
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
        fieldMetaOptions: {
          ...(defaultDynamicProperties[VECTOR_STYLES.FILL_COLOR].options as ColorDynamicOptions)
            .fieldMetaOptions,
          isEnabled: false,
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
        maxSize: 18,
        field: metricStyleField,
        fieldMetaOptions: {
          ...(defaultDynamicProperties[VECTOR_STYLES.ICON_SIZE].options as SizeDynamicOptions)
            .fieldMetaOptions,
          isEnabled: false,
        },
      },
    };
  }

  return GeoJsonVectorLayer.createDescriptor({
    label,
    sourceDescriptor: geoGridSourceDescriptor,
    style: VectorStyle.createDescriptor(styleProperties),
  });
}
