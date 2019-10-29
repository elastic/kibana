/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isMapLoading, mergeMapLayers } from './use_map_layers';
import { MapLayer } from '../types';

const mockMapLayer: MapLayer[] = [
  {
    dataId: 'source',
    layerId: 'filebeat-* | Line',
    isLoading: false,
    featuresCount: 100,
    errorMessage: '',
  },
  {
    dataId: 'source',
    layerId: 'packetbeat-* | Line',
    isLoading: false,
    featuresCount: 100,
    errorMessage: '',
  },
  {
    dataId: 'source',
    layerId: 'winlogbeat-* | Line',
    isLoading: false,
    featuresCount: 100,
    errorMessage: '',
  },
  {
    dataId: 'source',
    layerId: 'endgame-* | Line',
    isLoading: false,
    featuresCount: 100,
    errorMessage: '',
  },
];

// TODO: Expand test coverage before taking out of draft

describe('useMapLayers', () => {
  describe('mergeMapLayers', () => {
    test('layer is not added when all fields match existing', () => {
      const mergedMapLayers = mergeMapLayers(
        mockMapLayer,
        'source',
        'filebeat-* | Line',
        true,
        100
      );
      expect(mergedMapLayers).toEqual(mergedMapLayers);
    });
  });

  describe('isMapLoading', () => {
    test('map is not loading if no layers exists', () => {
      const isLoading = isMapLoading([]);
      expect(isLoading).toBe(false);
    });

    test('map is not loading if all layers are not loading', () => {
      const isLoading = isMapLoading(mockMapLayer);
      expect(isLoading).toBe(false);
    });
  });
});
