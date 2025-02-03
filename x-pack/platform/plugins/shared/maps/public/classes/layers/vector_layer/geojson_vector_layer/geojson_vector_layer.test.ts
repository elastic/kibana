/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SOURCE_DATA_REQUEST_ID } from '../../../../../common/constants';
import { VectorLayerDescriptor } from '../../../../../common/descriptor_types';
import { InnerJoin } from '../../../joins/inner_join';
import { IJoinSource } from '../../../sources/join_sources';
import { IVectorSource } from '../../../sources/vector_source';
import { GeoJsonVectorLayer } from './geojson_vector_layer';

const joinDataRequestId = 'join_source_a0b0da65-5e1a-4967-9dbe-74f24391afe2';
const mockJoin = {
  hasCompleteConfig: () => {
    return true;
  },
  getSourceDataRequestId: () => {
    return joinDataRequestId;
  },
  getRightJoinSource: () => {
    return {} as unknown as IJoinSource;
  },
} as unknown as InnerJoin;

describe('isLayerLoading', () => {
  test('should return true when source loading has not started', () => {
    const layer = new GeoJsonVectorLayer({
      customIcons: [],
      layerDescriptor: {},
      source: {} as unknown as IVectorSource,
    });
    expect(layer.isLayerLoading(1)).toBe(true);
  });

  test('Should return true when source data request is pending', () => {
    const layer = new GeoJsonVectorLayer({
      customIcons: [],
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
      source: {} as unknown as IVectorSource,
    });
    expect(layer.isLayerLoading(1)).toBe(true);
  });

  describe('no joins', () => {
    test('Should return false when source data request is finished', () => {
      const layer = new GeoJsonVectorLayer({
        customIcons: [],
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
        source: {} as unknown as IVectorSource,
      });
      expect(layer.isLayerLoading(1)).toBe(false);
    });
  });

  describe('joins', () => {
    test('should return false when layer is not visible', () => {
      const layer = new GeoJsonVectorLayer({
        customIcons: [],
        joins: [mockJoin],
        layerDescriptor: {
          visible: false,
        } as unknown as VectorLayerDescriptor,
        source: {} as unknown as IVectorSource,
      });
      expect(layer.isLayerLoading(1)).toBe(false);
    });

    describe('source data loaded with no features', () => {
      test('should return false when join loading has not started', () => {
        const layer = new GeoJsonVectorLayer({
          customIcons: [],
          joins: [mockJoin],
          layerDescriptor: {
            __dataRequests: [
              {
                data: {
                  features: [],
                },
                dataId: SOURCE_DATA_REQUEST_ID,
                dataRequestMeta: {},
                dataRequestMetaAtStart: undefined,
                dataRequestToken: undefined,
              },
            ],
          } as unknown as VectorLayerDescriptor,
          source: {} as unknown as IVectorSource,
        });
        expect(layer.isLayerLoading(1)).toBe(false);
      });
    });

    describe('source data loaded with features', () => {
      const sourceDataRequestDescriptorWithFeatures = {
        data: {
          features: [{}],
        },
        dataId: SOURCE_DATA_REQUEST_ID,
        dataRequestMeta: {},
        dataRequestMetaAtStart: undefined,
        dataRequestToken: undefined,
      };

      test('should return true when join loading has not started', () => {
        const layer = new GeoJsonVectorLayer({
          customIcons: [],
          joins: [mockJoin],
          layerDescriptor: {
            __dataRequests: [sourceDataRequestDescriptorWithFeatures],
          } as unknown as VectorLayerDescriptor,
          source: {} as unknown as IVectorSource,
        });
        expect(layer.isLayerLoading(1)).toBe(true);
      });

      test('should return true when join data request is pending', () => {
        const layer = new GeoJsonVectorLayer({
          customIcons: [],
          joins: [mockJoin],
          layerDescriptor: {
            __dataRequests: [
              sourceDataRequestDescriptorWithFeatures,
              {
                dataId: joinDataRequestId,
                dataRequestMetaAtStart: {},
                dataRequestToken: Symbol(),
              },
            ],
          } as unknown as VectorLayerDescriptor,
          source: {} as unknown as IVectorSource,
        });
        expect(layer.isLayerLoading(1)).toBe(true);
      });

      test('should return false when join data request is finished', () => {
        const layer = new GeoJsonVectorLayer({
          customIcons: [],
          joins: [mockJoin],
          layerDescriptor: {
            __dataRequests: [
              sourceDataRequestDescriptorWithFeatures,
              {
                data: {},
                dataId: joinDataRequestId,
                dataRequestMeta: {},
                dataRequestMetaAtStart: undefined,
                dataRequestToken: undefined,
              },
            ],
          } as unknown as VectorLayerDescriptor,
          source: {} as unknown as IVectorSource,
        });
        expect(layer.isLayerLoading(1)).toBe(false);
      });
    });
  });
});
