/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLayerDescriptor } from './create_layer_descriptor';
import { ES_GEO_FIELD_TYPE } from '../../../../common/constants';

jest.mock('../../../kibana_services', () => {
  return {
    getIsDarkMode() {
      return false;
    },
  };
});
jest.mock('../../../licensed_features', () => {
  return {
    getIsGoldPlus() {
      return true;
    },
  };
});
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('12345'),
}));

test('Should create layer descriptor', () => {
  const layerDescriptor = createLayerDescriptor({
    indexPatternId: 'myIndexPattern',
    geoFieldName: 'myGeoField',
    geoFieldType: ES_GEO_FIELD_TYPE.GEO_POINT,
  });
  expect(layerDescriptor.source_descriptor).toEqual({
    apply_global_query: true,
    apply_global_time: true,
    filter_by_map_bounds: true,
    geo_field: 'myGeoField',
    id: '12345',
    index_pattern_id: 'myIndexPattern',
    apply_force_refresh: true,
    scaling_type: 'CLUSTERS',
    sort_field: '',
    sort_order: 'desc',
    tooltip_properties: [],
    top_hits_group_by_timeseries: false,
    top_hits_size: 1,
    top_hits_split_field: '',
    type: 'ES_SEARCH',
  });
});
