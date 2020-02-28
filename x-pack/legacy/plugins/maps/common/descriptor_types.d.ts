/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { AGG_TYPE, GRID_RESOLUTION, RENDER_AS, SORT_ORDER } from './constants';

export type SourceDescriptor =
  | EMSTMSSourceDescriptor
  | EMSFileSourceDescriptor
  | ESGeoGridSourceDescriptor
  | ESSearchSourceDescriptor
  | ESPewPewSource
  | ESTermSourceDescriptor
  | KibanaRegionmapSourceDescriptor
  | KibanaTilemapSourceDescriptor
  | WMSSourceDescriptor
  | XYZTMSSourceDescriptor;

export type EMSTMSSourceDescriptor = {
  id?: string; // EMS TMS layer id. Used when !isAutoSelect
  type: string;
  isAutoSelect: boolean;
};

export type EMSFileSourceDescriptor = {
  id: string; // EMS file id
  type: string;
  tooltipProperties: string[];
};

export type ESSourceDescriptor = {
  id: string; // UUID
  type: string;
  indexPatternId: string;
  geoField: string;
};

export type AggDescriptor = {
  field?: string; // count aggregation does not require field. All other aggregation types do
  label?: string;
  type: AGG_TYPE;
};

export type ESGeoGridSourceDescriptor = ESSourceDescriptor & {
  requestType: RENDER_AS;
  resolution: GRID_RESOLUTION;
  metrics: AggDescriptor[];
};

export type ESSearchSourceDescriptor = ESSourceDescriptor & {
  filterByMapBounds: boolean;
  tooltipProperties: string[];
  sortField: string;
  sortOrder: SORT_ORDER;
  useTopHits: boolean;
  topHitsSplitField: string;
  topHitsSize: number;
};

export type ESPewPewSourceDescriptor = {
  id: string; // UUID
  type: string;
  indexPatternId: string;
  sourceGeoField: string;
  destGeoField: string;
  metrics: AggDescriptor[];
};

export type ESTermSourceDescriptor = {
  id: string; // UUID
  indexPatternId: string;
  indexPatternTitle: string;
  term: string; // term field name
  metrics: AggDescriptor[];
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

export type joinDescriptor = {
  leftField: string;
  right: ESTermSourceDescriptor;
};

export type LayerDescriptor = {
  sourceDescriptor: SourceDescriptor;
  id: string;
  label?: string;
};
