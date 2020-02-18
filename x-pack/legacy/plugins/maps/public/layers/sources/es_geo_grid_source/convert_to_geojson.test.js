/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { convertToGeoJson } from './convert_to_geojson';
import { RENDER_AS } from './render_as';

const esResponse = {
  aggregations: {
    gridSplit: {
      buckets: [
        {
          key: '4/4/6',
          doc_count: 65,
          avg_of_bytes: { value: 5359.2307692307695 },
          'terms_of_machine.os.keyword': {
            buckets: [
              {
                key: 'win xp',
                doc_count: 16,
              },
            ],
          },
          gridCentroid: {
            location: { lat: 36.62813963153614, lon: -81.94552666092149 },
            count: 65,
          },
        },
      ],
    },
  },
};

it('Should convert elasticsearch aggregation response into feature collection of points', () => {
  const geoJson = convertToGeoJson(esResponse, RENDER_AS.POINT);
  expect(geoJson.featureCollection.features.length).toBe(1);
  expect(geoJson.featureCollection.features[0]).toEqual({
    geometry: {
      coordinates: [-81.94552666092149, 36.62813963153614],
      type: 'Point',
    },
    id: '4/4/6',
    properties: {
      avg_of_bytes: 5359.2307692307695,
      doc_count: 65,
      'terms_of_machine.os.keyword': 'win xp',
    },
    type: 'Feature',
  });
});

it('Should convert elasticsearch aggregation response into feature collection of Polygons', () => {
  const geoJson = convertToGeoJson(esResponse, RENDER_AS.GRID);
  expect(geoJson.featureCollection.features.length).toBe(1);
  expect(geoJson.featureCollection.features[0]).toEqual({
    geometry: {
      coordinates: [
        [
          [-67.5, 40.9799],
          [-90, 40.9799],
          [-90, 21.94305],
          [-67.5, 21.94305],
          [-67.5, 40.9799],
        ],
      ],
      type: 'Polygon',
    },
    id: '4/4/6',
    properties: {
      avg_of_bytes: 5359.2307692307695,
      doc_count: 65,
      'terms_of_machine.os.keyword': 'win xp',
    },
    type: 'Feature',
  });
});
