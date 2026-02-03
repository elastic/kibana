/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type * from './data_request_descriptor_types';
export type * from './layer_descriptor_types';
export type * from './map_descriptor';

export type {
  CustomIcon,
  MapCenter,
  MapSettings,

  //
  // Source types
  //
  AggDescriptor,
  CountAggDescriptor,
  FieldedAggDescriptor,
  PercentileAggDescriptor,
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
} from '../../server';
