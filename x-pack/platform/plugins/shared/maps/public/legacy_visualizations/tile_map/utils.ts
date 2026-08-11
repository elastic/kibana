/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Vis } from '@kbn/visualizations-plugin/public';
import { isNestedField } from '@kbn/data-views-plugin/common';
import type { AggConfigSerialized } from '@kbn/data-plugin/common';
import { extractTileMapLayerDescriptorParams } from '../../../common/legacy_maps_conversion';
import type { TileMapVisParams } from './types';
import { title } from './tile_map_vis_type';

function toLegacyAggs(vis: Vis<TileMapVisParams>): AggConfigSerialized[] {
  const aggs: AggConfigSerialized[] = [];

  const metricAggs = vis.data?.aggs?.byType('metrics');
  if (metricAggs?.length) {
    aggs.push({
      type: metricAggs[0].type.dslName,
      schema: 'metric',
      params: {
        field: metricAggs[0].getField()?.name,
      },
    });
  }

  const bucketAggs = vis.data?.aggs?.byType('buckets');
  if (bucketAggs?.length) {
    aggs.push({
      type: bucketAggs[0].type.dslName,
      schema: 'segment',
      params: {
        field: bucketAggs[0].getField()?.name,
      },
    });
  }

  return aggs;
}

export function extractLayerDescriptorParams(vis: Vis<TileMapVisParams>) {
  let fallbackGeoFieldName: string | undefined;
  if (vis.data.indexPattern) {
    // attempt to default to first geo point field when geohash is not configured yet
    const geoField = vis.data.indexPattern.fields.find((field) => {
      return !isNestedField(field) && field.aggregatable && field.type === 'geo_point';
    });
    if (geoField) {
      fallbackGeoFieldName = geoField.name;
    }
  }

  return extractTileMapLayerDescriptorParams({
    label: vis.title ? vis.title : title,
    mapType: vis.params.mapType,
    colorSchema: vis.params.colorSchema,
    indexPatternId: vis.data.indexPattern?.id,
    aggs: toLegacyAggs(vis),
    fallbackGeoFieldName,
  });
}
