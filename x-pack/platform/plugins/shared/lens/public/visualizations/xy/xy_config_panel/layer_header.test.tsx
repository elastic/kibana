/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { FramePublicAPI } from '../../../types';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { LayerHeader } from './layer_header';
import {
  XYByReferenceAnnotationLayerConfig,
  XYByValueAnnotationLayerConfig,
  XYLayerConfig,
  XYState,
} from '../types';

describe('layer header', () => {
  describe('annotation layer header', () => {
    it('should inject annotation title for by-reference layer', () => {
      const byRefGroupTitle = 'My group title!';

      const byRefLayer: XYByReferenceAnnotationLayerConfig = {
        layerId: 'layer-123',
        layerType: 'annotations',
        annotationGroupId: 'some-group',
        annotations: [],
        indexPatternId: '',
        ignoreGlobalFilters: false,
        __lastSaved: {
          title: byRefGroupTitle,
          description: '',
          tags: [],
          annotations: [],
          indexPatternId: '',
          ignoreGlobalFilters: false,
        },
      };

      const byValueLayer: XYByValueAnnotationLayerConfig = {
        layerId: 'layer-123',
        layerType: 'annotations',
        annotations: [],
        indexPatternId: '',
        ignoreGlobalFilters: false,
      };

      const getStateWithLayers = (layers: XYLayerConfig[]): XYState => ({
        preferredSeriesType: 'area',
        legend: { isVisible: false, position: 'left' },
        layers,
      });

      const props: Omit<Parameters<typeof LayerHeader>[0], 'state'> = {
        layerId: 'layer-123',
        frame: {} as FramePublicAPI,
        onChangeIndexPattern: () => {},
        setState: () => {},
      };

      expect(
        mountWithIntl(<LayerHeader {...props} state={getStateWithLayers([byValueLayer])} />)
          .text()
          .trim()
      ).toBe('Annotations');

      expect(
        mountWithIntl(<LayerHeader {...props} state={getStateWithLayers([byRefLayer])} />)
          .text()
          .trim()
      ).toBe(byRefGroupTitle);

      const cachedMetadata = { title: 'A cached title', description: '', tags: [] };
      expect(
        mountWithIntl(
          <LayerHeader {...props} state={getStateWithLayers([{ ...byRefLayer, cachedMetadata }])} />
        )
          .text()
          .trim()
      ).toBe(cachedMetadata.title);
    });
  });
});
