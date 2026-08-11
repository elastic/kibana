/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import isPlainObject from 'lodash/isPlainObject';
import type { AggConfigSerialized } from '@kbn/data-plugin/common';
import type {
  CreateRegionMapLayerDescriptorParams,
  CreateTileMapLayerDescriptorParams,
} from './legacy_map_layer_descriptors';
import { getEmsLayerIdFromSelectedLayer } from './ems_layer_id';

const GEOHASH_GRID = 'geohash_grid';
const TERMS = 'terms';
const DEFAULT_COLOR_SCHEMA = 'Yellow to Red';
const DEFAULT_METRIC_AGG = 'count';

export type ExtractedTileMapLayerDescriptorParams = Omit<
  CreateTileMapLayerDescriptorParams,
  'alpha' | 'idGenerator'
>;

export type ExtractedRegionMapLayerDescriptorParams = Omit<
  CreateRegionMapLayerDescriptorParams,
  'alpha' | 'idGenerator'
>;

function getAggFieldName(agg: AggConfigSerialized | undefined): string | undefined {
  const params = agg?.params;
  if (!isPlainObject(params)) return undefined;
  const field = (params as Record<string, unknown>).field;
  return typeof field === 'string' ? field : undefined;
}

function getTermsSize(agg: AggConfigSerialized | undefined): number | undefined {
  const params = agg?.params;
  if (!isPlainObject(params)) return undefined;
  const size = (params as Record<string, unknown>).size;
  return typeof size === 'number' ? size : undefined;
}

function getFirstBucketAgg(aggs: AggConfigSerialized[]): AggConfigSerialized | undefined {
  return aggs.find((agg) => agg.schema === 'segment' || agg.schema === 'bucket');
}

function getFirstMetricAgg(aggs: AggConfigSerialized[]): AggConfigSerialized | undefined {
  return aggs.find((agg) => agg.schema === 'metric');
}

export function extractTileMapLayerDescriptorParams(args: {
  label: string;
  mapType: string;
  colorSchema?: string;
  indexPatternId?: string;
  aggs?: AggConfigSerialized[];
  fallbackGeoFieldName?: string;
}): ExtractedTileMapLayerDescriptorParams {
  const aggs = args.aggs ?? [];
  const bucket = getFirstBucketAgg(aggs);
  const metric = getFirstMetricAgg(aggs);

  let geoFieldName: string | undefined;
  if (bucket?.type === GEOHASH_GRID) {
    geoFieldName = getAggFieldName(bucket);
  } else if (args.fallbackGeoFieldName) {
    geoFieldName = args.fallbackGeoFieldName;
  }

  return {
    label: args.label,
    mapType: args.mapType,
    colorSchema:
      typeof args.colorSchema === 'string' && args.colorSchema.length > 0
        ? args.colorSchema
        : DEFAULT_COLOR_SCHEMA,
    indexPatternId: args.indexPatternId,
    geoFieldName,
    metricAgg: metric?.type ?? DEFAULT_METRIC_AGG,
    metricFieldName: getAggFieldName(metric),
  };
}

export function extractRegionMapLayerDescriptorParams(args: {
  label: string;
  colorSchema?: string;
  indexPatternId?: string;
  selectedLayer?: unknown;
  selectedJoinField?: unknown;
  aggs?: AggConfigSerialized[];
}): ExtractedRegionMapLayerDescriptorParams {
  const aggs = args.aggs ?? [];
  const bucket = getFirstBucketAgg(aggs);
  const metric = getFirstMetricAgg(aggs);

  const selectedLayer = args.selectedLayer;
  const selectedJoinField = args.selectedJoinField;
  const isEms =
    isPlainObject(selectedLayer) && (selectedLayer as Record<string, unknown>).isEMS === true;

  let termsFieldName: string | undefined;
  let termsSize: number | undefined;
  if (bucket?.type === TERMS) {
    termsFieldName = getAggFieldName(bucket);
    termsSize = getTermsSize(bucket);
  }

  return {
    label: args.label,
    emsLayerId: isEms ? getEmsLayerIdFromSelectedLayer(selectedLayer) : undefined,
    leftFieldName:
      isEms &&
      isPlainObject(selectedJoinField) &&
      typeof (selectedJoinField as Record<string, unknown>).name === 'string'
        ? ((selectedJoinField as Record<string, unknown>).name as string)
        : undefined,
    termsFieldName,
    termsSize,
    colorSchema:
      typeof args.colorSchema === 'string' && args.colorSchema.length > 0
        ? args.colorSchema
        : DEFAULT_COLOR_SCHEMA,
    indexPatternId: args.indexPatternId,
    metricAgg: metric?.type ?? DEFAULT_METRIC_AGG,
    metricFieldName: getAggFieldName(metric),
  };
}
