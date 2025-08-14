/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from '@kbn/core/server';
import { PluginConfigDescriptor } from '@kbn/core/server';
import { configSchema, MapsXPackConfig } from './config';

export type {
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
