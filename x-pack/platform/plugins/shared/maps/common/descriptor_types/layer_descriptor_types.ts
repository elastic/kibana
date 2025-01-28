/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions */

import type { ErrorCause } from '@elastic/elasticsearch/lib/api/types';
import type { Query } from '@kbn/es-query';
import { Feature } from 'geojson';
import {
  EMSVectorTileStyleDescriptor,
  HeatmapStyleDescriptor,
  StyleDescriptor,
  VectorStyleDescriptor,
} from './style_property_descriptor_types';
import { DataRequestDescriptor } from './data_request_descriptor_types';
import { AbstractSourceDescriptor, JoinSourceDescriptor } from './source_descriptor_types';
import { LAYER_TYPE } from '../constants';

export type Attribution = {
  label: string;
  url: string;
};

export type JoinDescriptor = {
  leftField?: string;
  right: Partial<JoinSourceDescriptor>;
  error?: string;
};

export type TileMetaFeature = Feature & {
  properties: {
    'hits.total.relation': string;
    'hits.total.value': number;

    // For _mvt requests with "aggs" property in request: aggregation statistics returned in the pattern outined below
    // aggregations._count.avg
    // aggregations._count.count
    // aggregations._count.min
    // aggregations._count.max
    // aggregations._count.sum
    // aggregations.<agg_name>.avg
    // aggregations.<agg_name>.count
    // aggregations.<agg_name>.min
    // aggregations.<agg_name>.max
    // aggregations.<agg_name>.sum
    [key: string]: number | string | boolean;
  };
};

export type TileError = {
  message: string;
  tileKey: string; // format zoom/x/y
  error?: ErrorCause;
};

export type LayerDescriptor = {
  __dataRequests?: DataRequestDescriptor[];
  __isPreviewLayer?: boolean;
  __trackedLayerDescriptor?: LayerDescriptor;
  __areTilesLoaded?: boolean;
  __tileMetaFeatures?: TileMetaFeature[];
  __tileErrors?: TileError[];
  alpha?: number;
  attribution?: Attribution;
  id: string;
  label?: string | null;
  locale?: string | null;
  areLabelsOnTop?: boolean;
  minZoom?: number;
  maxZoom?: number;
  sourceDescriptor: AbstractSourceDescriptor | null;
  type?: string;
  visible?: boolean;
  style?: StyleDescriptor | null;
  query?: Query;
  includeInFitToBounds?: boolean;
  parent?: string;
};

export type VectorLayerDescriptor = LayerDescriptor & {
  type: LAYER_TYPE.GEOJSON_VECTOR | LAYER_TYPE.MVT_VECTOR | LAYER_TYPE.BLENDED_VECTOR;
  joins?: Array<Partial<JoinDescriptor>>;
  style: VectorStyleDescriptor;
  disableTooltips?: boolean;
};

export type HeatmapLayerDescriptor = LayerDescriptor & {
  type: LAYER_TYPE.HEATMAP;
  style: HeatmapStyleDescriptor;
};

export type EMSVectorTileLayerDescriptor = LayerDescriptor & {
  type: LAYER_TYPE.EMS_VECTOR_TILE;
  style: EMSVectorTileStyleDescriptor;
};

export type LayerGroupDescriptor = LayerDescriptor & {
  type: LAYER_TYPE.LAYER_GROUP;
  label: string;
  sourceDescriptor: null;
  visible: boolean;
};
