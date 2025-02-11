/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SOURCE_DATA_REQUEST_ID, SOURCE_META_DATA_REQUEST_ID } from '../../../common/constants';
import { AbstractLayer } from './layer';
import { ISource } from '../sources/source';

describe('isFittable', () => {
  [
    {
      isVisible: true,
      fitToBounds: true,
      canFit: true,
    },
    {
      isVisible: false,
      fitToBounds: true,
      canFit: false,
    },
    {
      isVisible: true,
      fitToBounds: false,
      canFit: false,
    },
    {
      isVisible: false,
      fitToBounds: false,
      canFit: false,
    },
    {
      isVisible: true,
      fitToBounds: true,
      includeInFitToBounds: false,
      canFit: false,
    },
  ].forEach((test) => {
    it(`Should take into account layer visibility and bounds-retrieval: ${JSON.stringify(
      test
    )}`, async () => {
      const layer = new AbstractLayer({
        layerDescriptor: {
          visible: test.isVisible,
          includeInFitToBounds: test.includeInFitToBounds,
        },
        source: {
          supportsFitToBounds: () => test.fitToBounds,
        } as unknown as ISource,
      });
      expect(await layer.isFittable()).toBe(test.canFit);
    });
  });
});

describe('isLayerLoading', () => {
  test('Should return false when layer is not visible', () => {
    const layer = new AbstractLayer({
      layerDescriptor: {
        visible: false,
      },
      source: {} as unknown as ISource,
    });
    expect(layer.isLayerLoading(1)).toBe(false);
  });

  test('Should return false when layer is not visible at zoom level', () => {
    const layer = new AbstractLayer({
      layerDescriptor: {
        maxZoom: 24,
        minZoom: 3,
      },
      source: {} as unknown as ISource,
    });
    expect(layer.isLayerLoading(1)).toBe(false);
  });

  describe('tile layer', () => {
    test('Should return true when tile loading has not started', () => {
      const layer = new AbstractLayer({
        layerDescriptor: {},
        source: {} as unknown as ISource,
      });
      layer._isTiled = () => true;
      expect(layer.isLayerLoading(1)).toBe(true);
    });

    test('Should be true when tiles are loading', () => {
      const layer = new AbstractLayer({
        layerDescriptor: {
          __areTilesLoaded: false,
        },
        source: {} as unknown as ISource,
      });
      layer._isTiled = () => true;
      expect(layer.isLayerLoading(1)).toBe(true);
    });

    test('Should be true when tiles are loaded but other data request are pending', () => {
      const layer = new AbstractLayer({
        layerDescriptor: {
          __areTilesLoaded: true,
          __dataRequests: [
            {
              data: {},
              dataId: SOURCE_META_DATA_REQUEST_ID,
              dataRequestMetaAtStart: {},
              dataRequestToken: Symbol(),
            },
          ],
        },
        source: {} as unknown as ISource,
      });
      layer._isTiled = () => true;
      expect(layer.isLayerLoading(1)).toBe(true);
    });

    test('Should be false when tiles are loaded and there are no other data requests pending', () => {
      const layer = new AbstractLayer({
        layerDescriptor: {
          __areTilesLoaded: true,
        },
        source: {} as unknown as ISource,
      });
      layer._isTiled = () => true;
      expect(layer.isLayerLoading(1)).toBe(false);
    });
  });

  describe('non-tile layer', () => {
    test('Should return true when source data request has not started', () => {
      const layer = new AbstractLayer({
        layerDescriptor: {},
        source: {} as unknown as ISource,
      });
      layer._isTiled = () => false;
      expect(layer.isLayerLoading(1)).toBe(true);
    });

    test('Should return true when source data request is pending', () => {
      const layer = new AbstractLayer({
        layerDescriptor: {
          __dataRequests: [
            {
              data: {},
              dataId: SOURCE_DATA_REQUEST_ID,
              dataRequestMetaAtStart: {},
              dataRequestToken: Symbol(),
            },
          ],
        },
        source: {} as unknown as ISource,
      });
      layer._isTiled = () => false;
      expect(layer.isLayerLoading(1)).toBe(true);
    });

    test('Should return true when source data request is finished but other data request are pending', () => {
      const layer = new AbstractLayer({
        layerDescriptor: {
          __dataRequests: [
            {
              data: {},
              dataId: SOURCE_DATA_REQUEST_ID,
              dataRequestMeta: {},
              dataRequestMetaAtStart: undefined,
              dataRequestToken: undefined,
            },
            {
              data: {},
              dataId: SOURCE_META_DATA_REQUEST_ID,
              dataRequestMetaAtStart: {},
              dataRequestToken: Symbol(),
            },
          ],
        },
        source: {} as unknown as ISource,
      });
      layer._isTiled = () => false;
      expect(layer.isLayerLoading(1)).toBe(true);
    });

    test('Should return false when source data request is finished and there are no other data requests pending', () => {
      const layer = new AbstractLayer({
        layerDescriptor: {
          __dataRequests: [
            {
              data: {},
              dataId: SOURCE_DATA_REQUEST_ID,
              dataRequestMeta: {},
              dataRequestMetaAtStart: undefined,
              dataRequestToken: undefined,
            },
          ],
        },
        source: {} as unknown as ISource,
      });
      layer._isTiled = () => false;
      expect(layer.isLayerLoading(1)).toBe(false);
    });
  });
});
