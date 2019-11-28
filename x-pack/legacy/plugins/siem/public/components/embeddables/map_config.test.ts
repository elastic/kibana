/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getDestinationLayer, getLayerList, getLineLayer, getSourceLayer } from './map_config';
import {
  mockDestinationLayer,
  mockIndexPatternIds,
  mockLayerList,
  mockLayerListDouble,
  mockLineLayer,
  mockSourceLayer,
} from './__mocks__/mock';

jest.mock('uuid', () => {
  return {
    v4: jest.fn(() => 'uuid.v4()'),
  };
});

describe('map_config', () => {
  describe('#getLayerList', () => {
    test('it returns the complete layerList with a source, destination, and line layer', () => {
      const layerList = getLayerList(mockIndexPatternIds);
      expect(layerList).toStrictEqual(mockLayerList);
    });

    test('it returns the complete layerList for multiple indices', () => {
      const layerList = getLayerList([...mockIndexPatternIds, ...mockIndexPatternIds]);
      expect(layerList).toStrictEqual(mockLayerListDouble);
    });
  });

  describe('#getSourceLayer', () => {
    test('it returns a source layer', () => {
      const layerList = getSourceLayer(mockIndexPatternIds[0].title, mockIndexPatternIds[0].id);
      expect(layerList).toStrictEqual(mockSourceLayer);
    });
  });

  describe('#getDestinationLayer', () => {
    test('it returns a destination layer', () => {
      const layerList = getDestinationLayer(
        mockIndexPatternIds[0].title,
        mockIndexPatternIds[0].id
      );
      expect(layerList).toStrictEqual(mockDestinationLayer);
    });
  });

  describe('#getLineLayer', () => {
    test('it returns a line layer', () => {
      const layerList = getLineLayer(mockIndexPatternIds[0].title, mockIndexPatternIds[0].id);
      expect(layerList).toStrictEqual(mockLineLayer);
    });
  });
});
