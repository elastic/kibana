/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AGG_TYPE, GRID_RESOLUTION, RENDER_AS } from './constants';

export type SourceDescriptor =
  | XYZTMSSourceDescriptor
  | EMSTMSSourceDescriptor
  | EMSFileSourceDescriptor
  | ESGeoGridSourceDescriptor
  | ESSearchSourceDescriptor
  | ESPewPewSource;

export interface XYZTMSSourceDescriptor {
  id: string;
  type: string;
  urlTemplate: string;
}

export interface EMSTMSSourceDescriptor {
  id?: string; // EMS TMS layer id. Used when !isAutoSelect
  type: string;
  isAutoSelect: boolean;
}

export interface EMSFileSourceDescriptor {
  id: string; // EMS file id
  type: string;
  tooltipProperties: string[];
}

export interface ESSourceDescriptor {
  id: string; // UUID
  type: string;
  indexPatternId: string;
  geoField: string;
}

export interface AggDescriptor {
  field?: string; // count aggregation does not require field. All other aggregation types do
  label?: string;
  type: AGG_TYPE;
}

export type ESGeoGridSourceDescriptor = ESSourceDescriptor & {
  requestType: RENDER_AS;
  resolution: GRID_RESOLUTION;
  metrics: AggDescriptor[];
};

export interface ESPewPewSource {
  id: string; // UUID
  type: string;
  indexPatternId: string;
  sourceGeoField: string;
  destGeoField: string;
  metrics: AggDescriptor[];
}

export type ESSearchSourceDescriptor = ESSourceDescriptor & {
  filterByMapBounds: boolean;
  tooltipProperties: string[];
  sortField: string;
  sortOrder: string;
  useTopHits: boolean;
  topHitsSplitField: string;
  topHitsSize: number;
};

export interface LayerDescriptor {
  sourceDescriptor: SourceDescriptor;
  id: string;
  label?: string;
}
