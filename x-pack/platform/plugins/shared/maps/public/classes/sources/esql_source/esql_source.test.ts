/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQLSource } from './esql_source';
import { VECTOR_SHAPE_TYPE } from '../../../../common/constants';

describe('getSupportedShapeTypes', () => {
  test('should return point for geo_point column', async () => {
    const descriptor = ESQLSource.createDescriptor({
      dataViewId: '1234',
      esql: 'from kibana_sample_data_logs | keep geo.coordinates | limit 10000',
      columns: [
        {
          name: 'geo.coordinates',
          type: 'geo_point',
        },
      ],
    });
    const esqlSource = new ESQLSource(descriptor);
    expect(await esqlSource.getSupportedShapeTypes()).toEqual([VECTOR_SHAPE_TYPE.POINT]);
  });

  test('should return all geometry types for geo_shape column', async () => {
    const descriptor = ESQLSource.createDescriptor({
      dataViewId: '1234',
      esql: 'from world_countries | keep geometry | limit 10000',
      columns: [
        {
          name: 'geometry',
          type: 'geo_shape',
        },
      ],
    });
    const esqlSource = new ESQLSource(descriptor);
    expect(await esqlSource.getSupportedShapeTypes()).toEqual([
      VECTOR_SHAPE_TYPE.POINT,
      VECTOR_SHAPE_TYPE.LINE,
      VECTOR_SHAPE_TYPE.POLYGON,
    ]);
  });

  test('should fallback to point when geometry column can not be found', async () => {
    const descriptor = ESQLSource.createDescriptor({
      dataViewId: '1234',
      esql: 'from world_countries | keep geometry | limit 10000',
    });
    const esqlSource = new ESQLSource(descriptor);
    expect(await esqlSource.getSupportedShapeTypes()).toEqual([VECTOR_SHAPE_TYPE.POINT]);
  });
});
