/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getLayerList } from './map_config';
import { mockLayerList } from './__mocks__/mock';

jest.mock('uuid', () => {
  return {
    v4: jest.fn(() => 'uuid.v4()'),
  };
});

describe('map_config', () => {
  describe('#getLayerList', () => {
    test('it returns the low poly layer', () => {
      const layerList = getLayerList();
      expect(layerList).toStrictEqual(mockLayerList);
    });
  });
});
