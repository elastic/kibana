/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { AGG_TYPE, GRID_RESOLUTION, RENDER_AS, SORT_ORDER, SCALING_TYPES } from './constants';
import { VectorStyleDescriptor } from './style_property_descriptor_types';
import { DataRequestDescriptor } from './data_request_descriptor_types';

export type AbstractSourceDescriptor = {
  id?: string;
  type: string;
};

export type EMSTMSSourceDescriptor = AbstractSourceDescriptor & {
  // id: EMS TMS layer id. Used when !isAutoSelect
  isAutoSelect: boolean;
};

export type EMSFileSourceDescriptor = AbstractSourceDescriptor & {
  // id: EMS file id

  tooltipProperties: string[];
};

export type AbstractESSourceDescriptor = AbstractSourceDescriptor & {
  // id: UUID
  indexPatternId: string;
  geoField?: string;
};

export type AggDescriptor = {
  field?: string; // count aggregation does not require field. All other aggregation types do
  label?: string;
  type: AGG_TYPE;
};

export type AbstractESAggSourceDescriptor = AbstractESSourceDescriptor & {
  metrics: AggDescriptor[];
};

export type ESGeoGridSourceDescriptor = AbstractESAggSourceDescriptor & {
  requestType?: RENDER_AS;
  resolution?: GRID_RESOLUTION;
};

export type ESSearchSourceDescriptor = AbstractESSourceDescriptor & {
  filterByMapBounds?: boolean;
  tooltipProperties?: string[];
  sortField?: string;
  sortOrder?: SORT_ORDER;
  scalingType: SCALING_TYPES;
  topHitsSplitField?: string;
  topHitsSize?: number;
};

export type ESPewPewSourceDescriptor = AbstractESAggSourceDescriptor & {
  sourceGeoField: string;
  destGeoField: string;
};

export type ESTermSourceDescriptor = AbstractESAggSourceDescriptor & {
  indexPatternTitle: string;
  term: string; // term field name
};

export type KibanaRegionmapSourceDescriptor = {
  type: string;
  name: string;
};

export type KibanaTilemapSourceDescriptor = {
  type: string;
};

export type WMSSourceDescriptor = {
  type: string;
  serviceUrl: string;
  layers: string;
  styles: string;
  attributionText: string;
  attributionUrl: string;
};

export type XYZTMSSourceDescriptor = {
  id: string;
  type: string;
  urlTemplate: string;
};

export type JoinDescriptor = {
  leftField: string;
  right: ESTermSourceDescriptor;
};

export type LayerDescriptor = {
  __dataRequests?: DataRequestDescriptor[];
  __isInErrorState?: boolean;
  __errorMessage?: string;
  alpha?: number;
  id: string;
  label?: string;
  minZoom?: number;
  maxZoom?: number;
  sourceDescriptor: AbstractSourceDescriptor;
  type?: string;
  visible?: boolean;
};

export type VectorLayerDescriptor = LayerDescriptor & {
  joins?: JoinDescriptor[];
  style?: VectorStyleDescriptor;
};

export type RangeFieldMeta = {
  min: number;
  max: number;
  delta: number;
  isMinOutsideStdRange?: boolean;
  isMaxOutsideStdRange?: boolean;
};

export type Category = {
  key: string;
  count: number;
};

export type CategoryFieldMeta = {
  categories: Category[];
};

export type GeometryTypes = {
  isPointsOnly: boolean;
  isLinesOnly: boolean;
  isPolygonsOnly: boolean;
};

export type StyleMetaDescriptor = {
  geometryTypes?: GeometryTypes;
  fieldMeta: {
    [key: string]: {
      range: RangeFieldMeta;
      categories: CategoryFieldMeta;
    };
  };
};
