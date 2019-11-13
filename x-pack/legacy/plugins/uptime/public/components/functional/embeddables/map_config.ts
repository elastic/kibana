/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import lowPolyLayerFeatures from './low_poly_layer.json';

/**
 * Returns `Source/Destination Point-to-point` Map LayerList configuration, with a source,
 * destination, and line layer for each of the provided indexPatterns
 *
 */
export const getLayerList = () => {
  return [getLowPolyLayer()];
};

export const getLowPolyLayer = () => {
  return {
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
};
