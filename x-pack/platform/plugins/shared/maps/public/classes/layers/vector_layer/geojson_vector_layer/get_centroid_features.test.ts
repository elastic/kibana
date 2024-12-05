/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Feature, FeatureCollection } from 'geojson';
import { getCentroidFeatures } from './get_centroid_features';

test('should not create centroid feature for point and multipoint', () => {
  const pointFeature: Feature = {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [30, 10],
    },
    properties: {
      prop0: 'value0',
      prop1: 0.0,
    },
  };
  const multiPointFeature: Feature = {
    type: 'Feature',
    geometry: {
      type: 'MultiPoint',
      coordinates: [
        [10, 40],
        [40, 30],
        [20, 20],
        [30, 10],
      ],
    },
    properties: {
      prop0: 'value0',
      prop1: 0.0,
    },
  };
  const featureCollection: FeatureCollection = {
    type: 'FeatureCollection',
    features: [pointFeature, multiPointFeature],
  };
  const centroidFeatures = getCentroidFeatures(featureCollection);
  expect(centroidFeatures.length).toBe(0);
});

test('should create centroid feature for line (even number of points)', () => {
  const lineFeature: Feature = {
    type: 'Feature',
    id: 'myfeature',
    geometry: {
      type: 'LineString',
      coordinates: [
        [102.0, 0.0],
        [103.0, 1.0],
        [104.0, 0.0],
        [105.0, 1.0],
      ],
    },
    properties: {
      prop0: 'value0',
      prop1: 0.0,
    },
  };
  const featureCollection: FeatureCollection = {
    type: 'FeatureCollection',
    features: [lineFeature],
  };
  const centroidFeatures = getCentroidFeatures(featureCollection);
  expect(centroidFeatures.length).toBe(1);
  expect(centroidFeatures[0]).toEqual({
    type: 'Feature',
    id: 'myfeature',
    geometry: {
      type: 'Point',
      coordinates: [103.50003808007737, 0.5000190382261022],
    },
    properties: {
      __kbn_is_centroid_feature__: true,
      prop0: 'value0',
      prop1: 0.0,
    },
  });
});

test('should create centroid feature for line (odd number of points)', () => {
  const lineFeature: Feature = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [
        [102.0, 0.0],
        [103.0, 1.0],
        [104.0, 0.0],
      ],
    },
    properties: {
      prop0: 'value0',
      prop1: 0.0,
    },
  };
  const featureCollection: FeatureCollection = {
    type: 'FeatureCollection',
    features: [lineFeature],
  };
  const centroidFeatures = getCentroidFeatures(featureCollection);
  expect(centroidFeatures.length).toBe(1);
  expect(centroidFeatures[0]).toEqual({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [103.0, 1.0],
    },
    properties: {
      __kbn_is_centroid_feature__: true,
      prop0: 'value0',
      prop1: 0.0,
    },
  });
});

test('should create centroid feature for multi line', () => {
  const multiLineFeature: Feature = {
    type: 'Feature',
    geometry: {
      type: 'MultiLineString',
      coordinates: [
        [
          [10, 10],
          [20, 20],
          [10, 40],
        ],
        [
          [40, 40],
          [30, 30],
          [40, 20],
          [30, 10],
        ],
      ],
    },
    properties: {
      prop0: 'value0',
      prop1: 0.0,
    },
  };
  const featureCollection: FeatureCollection = {
    type: 'FeatureCollection',
    features: [multiLineFeature],
  };
  const centroidFeatures = getCentroidFeatures(featureCollection);
  expect(centroidFeatures.length).toBe(1);
  expect(centroidFeatures[0]).toEqual({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [35.56701982106548, 24.717594944805672],
    },
    properties: {
      __kbn_is_centroid_feature__: true,
      prop0: 'value0',
      prop1: 0.0,
    },
  });
});

test('should create centroid feature for polygon', () => {
  const polygonFeature: Feature = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [35, 10],
          [45, 45],
          [15, 40],
          [10, 20],
          [35, 10],
        ],
      ],
    },
    properties: {
      prop0: 'value0',
      prop1: 0.0,
    },
  };
  const featureCollection: FeatureCollection = {
    type: 'FeatureCollection',
    features: [polygonFeature],
  };
  const centroidFeatures = getCentroidFeatures(featureCollection);
  expect(centroidFeatures.length).toBe(1);
  expect(centroidFeatures[0]).toEqual({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [27.526881720430108, 28.70967741935484],
    },
    properties: {
      __kbn_is_centroid_feature__: true,
      prop0: 'value0',
      prop1: 0.0,
    },
  });
});

test('should create centroid feature for multi polygon', () => {
  const multiPolygonFeature: Feature = {
    type: 'Feature',
    geometry: {
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [30, 20],
            [45, 40],
            [10, 40],
            [30, 20],
          ],
        ],
        [
          [
            [15, 5],
            [40, 10],
            [10, 20],
            [5, 10],
            [15, 5],
          ],
        ],
      ],
    },
    properties: {
      prop0: 'value0',
      prop1: 0.0,
    },
  };
  const featureCollection: FeatureCollection = {
    type: 'FeatureCollection',
    features: [multiPolygonFeature],
  };
  const centroidFeatures = getCentroidFeatures(featureCollection);
  expect(centroidFeatures.length).toBe(1);
  expect(centroidFeatures[0]).toEqual({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [28.333333333333332, 33.333333333333336],
    },
    properties: {
      __kbn_is_centroid_feature__: true,
      prop0: 'value0',
      prop1: 0.0,
    },
  });
});

test('should create centroid feature for GeometryCollection with Point', () => {
  const featureCollection: FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'GeometryCollection',
          geometries: [
            {
              type: 'Point',
              coordinates: [100.0, 0.0],
            },
          ],
        },
        properties: {
          prop0: 'value0',
          prop1: 0.0,
        },
      },
    ],
  };
  const centroidFeatures = getCentroidFeatures(featureCollection);
  expect(centroidFeatures.length).toBe(1);
  expect(centroidFeatures[0]).toEqual({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [100.0, 0.0],
    },
    properties: {
      __kbn_is_centroid_feature__: true,
      prop0: 'value0',
      prop1: 0.0,
    },
  });
});

test('should create centroid feature for GeometryCollection with MultiPoint', () => {
  const featureCollection: FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'GeometryCollection',
          geometries: [
            {
              type: 'MultiPoint',
              coordinates: [
                [10, 40],
                [40, 30],
                [20, 20],
                [30, 10],
              ],
            },
          ],
        },
        properties: {
          prop0: 'value0',
          prop1: 0.0,
        },
      },
    ],
  };
  const centroidFeatures = getCentroidFeatures(featureCollection);
  expect(centroidFeatures.length).toBe(1);
  expect(centroidFeatures[0]).toEqual({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [10, 40],
    },
    properties: {
      __kbn_is_centroid_feature__: true,
      prop0: 'value0',
      prop1: 0.0,
    },
  });
});

test('should create centroid feature for GeometryCollection with Polygon', () => {
  const featureCollection: FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'GeometryCollection',
          geometries: [
            {
              type: 'Polygon',
              coordinates: [
                [
                  [35, 10],
                  [45, 45],
                  [15, 40],
                  [10, 20],
                  [35, 10],
                ],
              ],
            },
          ],
        },
        properties: {
          prop0: 'value0',
          prop1: 0.0,
        },
      },
    ],
  };
  const centroidFeatures = getCentroidFeatures(featureCollection);
  expect(centroidFeatures.length).toBe(1);
  expect(centroidFeatures[0]).toEqual({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [27.526881720430108, 28.70967741935484],
    },
    properties: {
      __kbn_is_centroid_feature__: true,
      prop0: 'value0',
      prop1: 0.0,
    },
  });
});
