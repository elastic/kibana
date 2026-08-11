/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ColorDynamicOptions,
  ESGeoGridSourceDescriptor,
  ESTermSourceDescriptor,
  SizeDynamicOptions,
  VectorStylePropertiesDescriptor,
} from '../descriptor_types';
import {
  COLOR_MAP_TYPE,
  FIELD_ORIGIN,
  GRID_RESOLUTION,
  STYLE_TYPE,
  VECTOR_STYLES,
} from '../constants';
import {
  createEsGeoGridSourceDescriptor,
  createEsTermSourceDescriptor,
} from '../descriptor_factories';

export function createLegacyGeoGridSourceDescriptor(args: {
  id: string;
  indexPatternId: string;
  geoField: string;
  metrics: ESGeoGridSourceDescriptor['metrics'];
  requestType: ESGeoGridSourceDescriptor['requestType'];
  resolution?: ESGeoGridSourceDescriptor['resolution'];
}): ESGeoGridSourceDescriptor {
  return createEsGeoGridSourceDescriptor({
    id: args.id,
    indexPatternId: args.indexPatternId,
    geoField: args.geoField,
    metrics: args.metrics,
    requestType: args.requestType,
    resolution: args.resolution ?? GRID_RESOLUTION.MOST_FINE,
    applyGlobalQuery: true,
    applyGlobalTime: true,
    applyForceRefresh: true,
  });
}

export function createLegacyTermSourceDescriptor(args: {
  id: string;
  indexPatternId: string;
  term: string;
  metrics: ESTermSourceDescriptor['metrics'];
  size?: number;
}): ESTermSourceDescriptor {
  return createEsTermSourceDescriptor({
    id: args.id,
    indexPatternId: args.indexPatternId,
    term: args.term,
    ...(args.size !== undefined ? { size: args.size } : {}),
    metrics: args.metrics,
    applyGlobalQuery: true,
    applyGlobalTime: true,
    applyForceRefresh: true,
  });
}

export function createLegacySourceMetricStyleField(sourceMetricAggKey: string) {
  return {
    name: sourceMetricAggKey,
    origin: FIELD_ORIGIN.SOURCE,
  } as const;
}

export function createLegacyJoinMetricStyleField(joinMetricAggKey: string) {
  return {
    name: joinMetricAggKey,
    origin: FIELD_ORIGIN.JOIN,
  } as const;
}

export function createLegacyTileMapVectorStyleProperties(args: {
  metricStyleField: { name: string; origin: typeof FIELD_ORIGIN.SOURCE };
  color: string;
  mapType: string;
  defaults?: {
    fillColor?: ColorDynamicOptions;
    iconSize?: SizeDynamicOptions;
  };
}): Partial<VectorStylePropertiesDescriptor> {
  const fillColorDefaults = args.defaults?.fillColor;

  const styleProperties: Partial<VectorStylePropertiesDescriptor> = {
    [VECTOR_STYLES.FILL_COLOR]: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        ...(fillColorDefaults ?? {}),
        field: args.metricStyleField,
        color: args.color,
        type: COLOR_MAP_TYPE.ORDINAL,
        fieldMetaOptions: {
          ...(fillColorDefaults?.fieldMetaOptions ?? {}),
          isEnabled: false,
        },
      } as ColorDynamicOptions,
    },
    [VECTOR_STYLES.LINE_COLOR]: {
      type: STYLE_TYPE.STATIC,
      options: { color: '#3d3d3d' },
    },
  };

  if (args.mapType.toLowerCase() === 'scaled circle markers') {
    const iconSizeDefaults = args.defaults?.iconSize;
    styleProperties[VECTOR_STYLES.ICON_SIZE] = {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        ...(iconSizeDefaults ?? {}),
        maxSize: 18,
        field: args.metricStyleField,
        fieldMetaOptions: {
          ...(iconSizeDefaults?.fieldMetaOptions ?? {}),
          isEnabled: false,
        },
      } as SizeDynamicOptions,
    };
  }

  return styleProperties;
}

export function createLegacyRegionMapVectorStyleProperties(args: {
  joinStyleField: { name: string; origin: typeof FIELD_ORIGIN.JOIN };
  color: string;
  defaults?: {
    fillColor?: ColorDynamicOptions;
  };
}): Partial<VectorStylePropertiesDescriptor> {
  const fillColorDefaults = args.defaults?.fillColor;
  return {
    [VECTOR_STYLES.FILL_COLOR]: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        ...(fillColorDefaults ?? {}),
        field: args.joinStyleField,
        color: args.color,
        type: COLOR_MAP_TYPE.ORDINAL,
        fieldMetaOptions: {
          ...(fillColorDefaults?.fieldMetaOptions ?? {}),
          isEnabled: false,
        },
      } as ColorDynamicOptions,
    },
  };
}
