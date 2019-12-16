/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import lowPolyLayerFeatures from '../low_poly_layer.json';

export const mockDownPointsLayer = {
  id: 'down_points',
  label: 'Down Locations',
  sourceDescriptor: {
    type: 'GEOJSON_FILE',
    __featureCollection: {
      features: [
        {
          type: 'feature',
          geometry: {
            type: 'Point',
            coordinates: [13.399262, 52.487239],
          },
        },
        {
          type: 'feature',
          geometry: {
            type: 'Point',
            coordinates: [13.399262, 55.487239],
          },
        },
        {
          type: 'feature',
          geometry: {
            type: 'Point',
            coordinates: [14.399262, 54.487239],
          },
        },
      ],
      type: 'FeatureCollection',
    },
  },
  visible: true,
  style: {
    type: 'VECTOR',
    properties: {
      fillColor: {
        type: 'STATIC',
        options: {
          color: '#BC261E',
        },
      },
      lineColor: {
        type: 'STATIC',
        options: {
          color: '#fff',
        },
      },
      lineWidth: {
        type: 'STATIC',
        options: {
          size: 2,
        },
      },
      iconSize: {
        type: 'STATIC',
        options: {
          size: 6,
        },
      },
    },
  },
  type: 'VECTOR',
};

export const mockUpPointsLayer = {
  id: 'up_points',
  label: 'Up Locations',
  sourceDescriptor: {
    type: 'GEOJSON_FILE',
    __featureCollection: {
      features: [
        {
          type: 'feature',
          geometry: {
            type: 'Point',
            coordinates: [13.399262, 52.487239],
          },
        },
        {
          type: 'feature',
          geometry: {
            type: 'Point',
            coordinates: [13.399262, 55.487239],
          },
        },
        {
          type: 'feature',
          geometry: {
            type: 'Point',
            coordinates: [14.399262, 54.487239],
          },
        },
      ],
      type: 'FeatureCollection',
    },
  },
  visible: true,
  style: {
    type: 'VECTOR',
    properties: {
      fillColor: {
        type: 'STATIC',
        options: {
          color: '#98A2B2',
        },
      },
      lineColor: {
        type: 'STATIC',
        options: {
          color: '#fff',
        },
      },
      lineWidth: {
        type: 'STATIC',
        options: {
          size: 2,
        },
      },
      iconSize: {
        type: 'STATIC',
        options: {
          size: 6,
        },
      },
    },
  },
  type: 'VECTOR',
};

export const mockLayerList = [
  {
    id: 'low_poly_layer',
    label: 'World countries',
    minZoom: 0,
    maxZoom: 24,
    alpha: 1,
    sourceDescriptor: {
      id: 'b7486535-171b-4d3b-bb2e-33c1a0a2854c',
      type: 'GEOJSON_FILE',
      __featureCollection: lowPolyLayerFeatures,
    },
    visible: true,
    style: {
      type: 'VECTOR',
      properties: {
        fillColor: {
          type: 'STATIC',
          options: {
            color: '#cad3e4',
          },
        },
        lineColor: {
          type: 'STATIC',
          options: {
            color: '#fff',
          },
        },
        lineWidth: {
          type: 'STATIC',
          options: {
            size: 0,
          },
        },
        iconSize: {
          type: 'STATIC',
          options: {
            size: 6,
          },
        },
      },
    },
    type: 'VECTOR',
  },
  mockDownPointsLayer,
  mockUpPointsLayer,
];
