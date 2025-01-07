/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializer } from '@kbn/core/public';
import { PluginInitializerContext } from '@kbn/core/public';
import { MapsPlugin, MapsPluginSetup, MapsPluginStart } from './plugin';
import type { MapsXPackConfig } from '../server/config';

export const plugin: PluginInitializer<MapsPluginSetup, MapsPluginStart> = (
  initContext: PluginInitializerContext<MapsXPackConfig>
) => {
  // @ts-ignore
  return new MapsPlugin(initContext);
};

export { GEOJSON_FEATURE_ID_PROPERTY_NAME, MAP_SAVED_OBJECT_TYPE } from '../common/constants';
export { MAPS_APP_LOCATOR } from './locators/map_locator/locator_definition';

export type {
  ITooltipProperty,
  RenderTooltipContentParams,
} from './classes/tooltips/tooltip_property';

export type { MapsSetupApi, MapsStartApi } from './api';
export type { CreateLayerDescriptorParams } from './classes/sources/es_search_source/create_layer_descriptor';

export { type MapApi, type MapSerializedState, isMapApi } from './react_embeddable/types';

export type { EMSTermJoinConfig, SampleValuesConfig } from './ems_autosuggest';

export type { ITMSSource } from './classes/sources/tms_source';
export type { IRasterSource } from './classes/sources/raster_source';

export type {
  GetFeatureActionsArgs,
  IVectorSource,
  GeoJsonWithMeta,
} from './classes/sources/vector_source/vector_source';
export type { ImmutableSourceProperty, SourceEditorArgs } from './classes/sources/source';
export type { Attribution } from '../common/descriptor_types';
export type {
  BoundsRequestMeta,
  SourceStatus,
} from './classes/sources/vector_source/vector_source';
export type { IField } from './classes/fields/field';
export type { LayerWizard, RenderWizardArguments } from './classes/layers';
export type { DataRequest } from './classes/util/data_request';
