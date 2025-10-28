/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';
import type { PluginConfigDescriptor } from '@kbn/core/server';
import type { MapsXPackConfig } from './config';
import { configSchema } from './config';

export type { StoredMapAttributes } from './saved_objects/types';

export type {
  AdhocDataView,
  CustomIcon,
  MapAttributes,
  MapCenter,
  MapSettings,

  //
  // Layer types
  //
  Attribution,
  StoredEMSVectorTileLayer,
  StoredHeatmapLayer,
  StoredLayerGroup,
  StoredRasterLayer,
  StoredVectorLayer,

  //
  // Source types
  //
  CountAggDescriptor,
  FieldedAggDescriptor,
  PercentileAggDescriptor,
  AggDescriptor,
  AbstractESAggSourceDescriptor,
  AbstractESJoinSourceDescriptor,
  AbstractESSourceDescriptor,
  EMSFileSourceDescriptor,
  EMSTMSSourceDescriptor,
  ESGeoGridSourceDescriptor,
  ESGeoLineSourceDescriptor,
  ESPewPewSourceDescriptor,
  ESSearchSourceDescriptor,
  ESQLSourceDescriptor,
  ESDistanceSourceDescriptor,
  ESTermSourceDescriptor,
  KibanaTilemapSourceDescriptor,
  WMSSourceDescriptor,
  XYZTMSSourceDescriptor,
  MVTFieldDescriptor,
  TiledSingleLayerVectorSourceDescriptor,
  JoinSourceDescriptor,
  SourceDescriptor,

  //
  // Style types
  //
  Category,
  CategoryColorStop,
  ColorDynamicOptions,
  ColorStaticOptions,
  ColorDynamicStylePropertyDescriptor,
  ColorStaticStylePropertyDescriptor,
  ColorStylePropertyDescriptor,
  DynamicStyleProperties,
  DynamicStylePropertyOptions,
  EMSVectorTileStyleDescriptor,
  FieldMetaOptions,
  HeatmapStyleDescriptor,
  IconDynamicOptions,
  IconStaticOptions,
  IconStop,
  IconStylePropertyDescriptor,
  LabelDynamicOptions,
  LabelBorderSizeOptions,
  LabelPositionStylePropertyDescriptor,
  LabelStaticOptions,
  LabelStylePropertyDescriptor,
  LabelZoomRangeStylePropertyDescriptor,
  OrdinalColorStop,
  OrientationDynamicOptions,
  OrientationStaticOptions,
  OrientationStylePropertyDescriptor,
  PercentilesFieldMeta,
  SizeDynamicOptions,
  SizeStaticOptions,
  SizeStylePropertyDescriptor,
  StaticStylePropertyOptions,
  StyleDescriptor,
  StyleMetaDescriptor,
  StylePropertyField,
  StylePropertyOptions,
  SymbolizeAsOptions,
  RangeFieldMeta,
  VectorStyleDescriptor,
  VectorStylePropertiesDescriptor,
} from './content_management';
export { MapsStorage } from './content_management';

export const config: PluginConfigDescriptor<MapsXPackConfig> = {
  // exposeToBrowser specifies kibana.yml settings to expose to the browser
  // the value `true` in this context signals configuration is exposed to browser
  exposeToBrowser: {
    showMapsInspectorAdapter: true,
    preserveDrawingBuffer: true,
  },
  schema: configSchema,
};

export const plugin = async (initializerContext: PluginInitializerContext) => {
  const { MapsPlugin } = await import('./plugin');
  return new MapsPlugin(initializerContext);
};
