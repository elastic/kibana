/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SCALING_TYPES, SOURCE_TYPES } from '../../../../../common/constants';
import { BlendedVectorLayer } from './blended_vector_layer';
import { ESSearchSource } from '../../../sources/es_search_source';
import type {
  AbstractESSourceDescriptor,
  CustomIcon,
  ESGeoGridSourceDescriptor,
} from '../../../../../common/descriptor_types';

jest.mock('../../../../kibana_services', () => {
  return {
    getIsDarkMode() {
      return false;
    },
  };
});

const mapColors: string[] = [];

const customIcons: CustomIcon[] = [];

const notClusteredDataRequest = {
  data: { isSyncClustered: false },
  dataId: 'ACTIVE_COUNT_DATA_ID',
};

const clusteredDataRequest = {
  data: { isSyncClustered: true },
  dataId: 'ACTIVE_COUNT_DATA_ID',
};

const documentSourceDescriptor = ESSearchSource.createDescriptor({
  geo_field: 'myGeoField',
  index_pattern_id: 'myIndexPattern',
  scaling_type: SCALING_TYPES.CLUSTERS,
});

describe('getSource', () => {
  describe('isClustered: true', () => {
    test('should return cluster source', async () => {
      const blendedVectorLayer = new BlendedVectorLayer({
        source: new ESSearchSource(documentSourceDescriptor),
        layerDescriptor: BlendedVectorLayer.createDescriptor(
          {
            source_descriptor: documentSourceDescriptor,
            __dataRequests: [clusteredDataRequest],
          },
          mapColors
        ),
        customIcons,
      });

      const source = blendedVectorLayer.getSource();
      expect(source.cloneDescriptor().type).toBe(SOURCE_TYPES.ES_GEO_GRID);
    });

    test('cluster source AbstractESSourceDescriptor properties should mirror document source AbstractESSourceDescriptor properties', async () => {
      const blendedVectorLayer = new BlendedVectorLayer({
        source: new ESSearchSource({
          ...documentSourceDescriptor,
          apply_global_query: false,
          apply_global_time: false,
          apply_force_refresh: false,
        }),
        layerDescriptor: BlendedVectorLayer.createDescriptor(
          {
            source_descriptor: documentSourceDescriptor,
            __dataRequests: [clusteredDataRequest],
          },
          mapColors
        ),
        customIcons,
      });

      const source = blendedVectorLayer.getSource();
      const sourceDescriptor = source.cloneDescriptor() as Required<ESGeoGridSourceDescriptor>;
      const abstractEsSourceDescriptor: Required<AbstractESSourceDescriptor> = {
        // Purposely grabbing properties instead of using spread operator
        // to ensure type check will fail when new properties are added to AbstractESSourceDescriptor.
        // In the event of type check failure, ensure test is updated with new property and that new property
        // is correctly passed to clustered source descriptor.
        id: sourceDescriptor.id,
        index_pattern_id: sourceDescriptor.index_pattern_id,
        apply_global_query: sourceDescriptor.apply_global_query,
        apply_global_time: sourceDescriptor.apply_global_time,
        apply_force_refresh: sourceDescriptor.apply_force_refresh,
      };
      expect(abstractEsSourceDescriptor).toEqual({
        id: sourceDescriptor.id,
        index_pattern_id: 'myIndexPattern',
        apply_global_query: false,
        apply_global_time: false,
        apply_force_refresh: false,
      } as AbstractESSourceDescriptor);
    });
  });

  describe('isClustered: false', () => {
    test('should return document source', async () => {
      const blendedVectorLayer = new BlendedVectorLayer({
        source: new ESSearchSource(documentSourceDescriptor),
        layerDescriptor: BlendedVectorLayer.createDescriptor(
          {
            source_descriptor: documentSourceDescriptor,
            __dataRequests: [notClusteredDataRequest],
          },
          mapColors
        ),
        customIcons,
      });

      const source = blendedVectorLayer.getSource();
      expect(source.cloneDescriptor().type).toBe(SOURCE_TYPES.ES_SEARCH);
    });
  });
});

describe('cloneDescriptor', () => {
  describe('isClustered: true', () => {
    test('Cloned layer descriptor sourceDescriptor should be document source', async () => {
      const blendedVectorLayer = new BlendedVectorLayer({
        source: new ESSearchSource(documentSourceDescriptor),
        layerDescriptor: BlendedVectorLayer.createDescriptor(
          {
            source_descriptor: documentSourceDescriptor,
            __dataRequests: [clusteredDataRequest],
          },
          mapColors
        ),
        customIcons,
      });

      const clones = await blendedVectorLayer.cloneDescriptor();
      expect(clones.length).toBe(1);
      const clonedLayerDescriptor = clones[0];
      expect(clonedLayerDescriptor.source_descriptor!.type).toBe(SOURCE_TYPES.ES_SEARCH);
      expect(clonedLayerDescriptor.label).toBe('Clone of myIndexPattern');
    });
  });

  describe('isClustered: false', () => {
    test('Cloned layer descriptor sourceDescriptor should be document source', async () => {
      const blendedVectorLayer = new BlendedVectorLayer({
        source: new ESSearchSource(documentSourceDescriptor),
        layerDescriptor: BlendedVectorLayer.createDescriptor(
          {
            source_descriptor: documentSourceDescriptor,
            __dataRequests: [notClusteredDataRequest],
          },
          mapColors
        ),
        customIcons,
      });

      const clones = await blendedVectorLayer.cloneDescriptor();
      expect(clones.length).toBe(1);
      const clonedLayerDescriptor = clones[0];
      expect(clonedLayerDescriptor.source_descriptor!.type).toBe(SOURCE_TYPES.ES_SEARCH);
      expect(clonedLayerDescriptor.label).toBe('Clone of myIndexPattern');
    });
  });
});
