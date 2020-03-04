/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { AGG_TYPE, GRID_RESOLUTION, RENDER_AS, SORT_ORDER } from './constants';

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

export type AbstractESAggDescriptor = AbstractESSourceDescriptor & {
  metrics: AggDescriptor[];
};

export type ESGeoGridSourceDescriptor = AbstractESAggDescriptor & {
  requestType: RENDER_AS;
  resolution: GRID_RESOLUTION;
};

export type ESSearchSourceDescriptor = AbstractESSourceDescriptor & {
  filterByMapBounds?: boolean;
  tooltipProperties?: string[];
  sortField?: string;
  sortOrder?: SORT_ORDER;
  useTopHits?: boolean;
  topHitsSplitField?: string;
  topHitsSize?: number;
};

export type ESPewPewSourceDescriptor = AbstractESAggDescriptor & {
  sourceGeoField: string;
  destGeoField: string;
};

export type ESTermSourceDescriptor = AbstractESAggDescriptor & {
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

export type DataRequestDescriptor = {
  dataId: string;
  dataMetaAtStart: object;
  dataRequestToken: symbol;
  data: object;
  dataMeta: object;
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
  style?: unknown;
};
