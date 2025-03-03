/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractEntityAndBoundaryReferences } from './migrations';

describe('geo_containment migration utilities', () => {
  test('extractEntityAndBoundaryReferences', () => {
    expect(
      extractEntityAndBoundaryReferences({
        index: 'foo*',
        indexId: 'foobar',
        geoField: 'geometry',
        entity: 'vehicle_id',
        dateField: '@timestamp',
        boundaryType: 'entireIndex',
        boundaryIndexTitle: 'boundary*',
        boundaryIndexId: 'boundaryid',
        boundaryGeoField: 'geometry',
      })
    ).toEqual({
      params: {
        boundaryGeoField: 'geometry',
        boundaryIndexRefName: 'boundary_index_boundaryid',
        boundaryIndexTitle: 'boundary*',
        boundaryType: 'entireIndex',
        dateField: '@timestamp',
        entity: 'vehicle_id',
        geoField: 'geometry',
        index: 'foo*',
        indexRefName: 'tracked_index_foobar',
      },
      references: [
        {
          id: 'foobar',
          name: 'param:tracked_index_foobar',
          type: 'index-pattern',
        },
        {
          id: 'boundaryid',
          name: 'param:boundary_index_boundaryid',
          type: 'index-pattern',
        },
      ],
    });
  });
});
