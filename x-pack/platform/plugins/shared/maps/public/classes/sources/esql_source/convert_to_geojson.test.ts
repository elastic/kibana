/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertToGeoJson } from './convert_to_geojson';

describe('convertToGeoJson', () => {
  test('should convert ES|QL response to feature collection', () => {
    const resp = {
      columns: [
        { name: 'location', type: 'geo_point' },
        { name: 'bytes', type: 'long' },
      ],
      values: [
        ['POINT (-87.66208335757256 32.68147221766412)', 6901],
        ['POINT (-76.41376560553908 39.32566332165152)', 484],
      ],
    };
    const featureCollection = convertToGeoJson(resp);
    expect(featureCollection).toEqual({
      type: 'FeatureCollection',
      features: [
        {
          geometry: {
            coordinates: [-87.66208335757256, 32.68147221766412],
            type: 'Point',
          },
          properties: {
            bytes: 6901,
          },
          type: 'Feature',
        },
        {
          geometry: {
            coordinates: [-76.41376560553908, 39.32566332165152],
            type: 'Point',
          },
          properties: {
            bytes: 484,
          },
          type: 'Feature',
        },
      ],
    });
  });
});
