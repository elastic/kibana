/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Vis } from '@kbn/visualizations-plugin/public';
import type { AggConfigSerialized } from '@kbn/data-plugin/common';
import { extractRegionMapLayerDescriptorParams } from '../../../common/legacy_maps_conversion';
import type { RegionMapVisParams } from './types';
import { title } from './region_map_vis_type';

function toLegacyAggs(vis: Vis<RegionMapVisParams>): AggConfigSerialized[] {
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
        size: bucketAggs[0].getParam('size'),
      },
    });
  }

  return aggs;
}

export function extractLayerDescriptorParams(vis: Vis<RegionMapVisParams>) {
  return extractRegionMapLayerDescriptorParams({
    label: vis.title ? vis.title : title,
    colorSchema: vis.params.colorSchema,
    indexPatternId: vis.data.indexPattern?.id,
    selectedLayer: vis.params.selectedLayer,
    selectedJoinField: vis.params.selectedJoinField,
    aggs: toLegacyAggs(vis),
  });
}
