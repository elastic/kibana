/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertToGeoJson } from './convert_to_geojson';

const esResponse = {
  aggregations: {
    tracks: {
      buckets: {
        ios: {
          doc_count: 1,
          path: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [
                [-95.339639, 41.584389],
                [-95.339639, 41.0],
              ],
            },
            properties: {
              complete: true,
            },
          },
        },
        osx: {
          doc_count: 1,
          path: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [
                [-97.902775, 48.940572],
                [-97.902775, 48.0],
              ],
            },
            properties: {
              complete: false,
            },
          },
        },
      },
    },
  },
};

it('Should convert elasticsearch aggregation response into feature collection', () => {
  const geoJson = convertToGeoJson(esResponse, 'machine.os.keyword');
  expect(geoJson.numTrimmedTracks).toBe(1);
  expect(geoJson.featureCollection.features.length).toBe(2);
  expect(geoJson.featureCollection.features[0]).toEqual({
    geometry: {
      coordinates: [
        [-95.339639, 41.584389],
        [-95.339639, 41.0],
      ],
      type: 'LineString',
    },
    id: 'ios',
    properties: {
      complete: true,
      doc_count: 1,
      ['machine.os.keyword']: 'ios',
    },
    type: 'Feature',
  });
});
