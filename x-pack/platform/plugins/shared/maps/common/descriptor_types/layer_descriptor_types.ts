/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions */

import type { ErrorCause } from '@elastic/elasticsearch/lib/api/types';
import type { Feature } from 'geojson';
import type {
  StoredEMSVectorTileLayer,
  StoredHeatmapLayer,
  StoredLayerGroup,
  StoredRasterLayer,
  StoredVectorLayer,
} from '../../server';
import type { DataRequestDescriptor } from './data_request_descriptor_types';
import type { JoinSourceDescriptor } from '.';

export type { Attribution } from '../../server';

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

interface RuntimeLayerState {
  __dataRequests?: DataRequestDescriptor[];
  __isPreviewLayer?: boolean;
  __trackedLayerDescriptor?:
    | StoredEMSVectorTileLayer
    | StoredHeatmapLayer
    | StoredLayerGroup
    | StoredRasterLayer
    | StoredVectorLayer;
  __areTilesLoaded?: boolean;
  __tileMetaFeatures?: TileMetaFeature[];
  __tileErrors?: TileError[];
}

export type VectorLayerDescriptor = Omit<StoredVectorLayer, 'joins'> & {
  joins?: JoinDescriptor[];
} & RuntimeLayerState;

export type HeatmapLayerDescriptor = StoredHeatmapLayer & RuntimeLayerState;

export type EMSVectorTileLayerDescriptor = StoredEMSVectorTileLayer & RuntimeLayerState;

export type LayerGroupDescriptor = StoredLayerGroup & RuntimeLayerState;

export type RasterLayerDescriptor = StoredRasterLayer & RuntimeLayerState;

export type LayerDescriptor =
  | VectorLayerDescriptor
  | HeatmapLayerDescriptor
  | EMSVectorTileLayerDescriptor
  | (LayerGroupDescriptor & {
      sourceDescriptor?: { type: string };
      style?: { type: string };
    })
  | (RasterLayerDescriptor & {
      style?: { type: string };
    });
