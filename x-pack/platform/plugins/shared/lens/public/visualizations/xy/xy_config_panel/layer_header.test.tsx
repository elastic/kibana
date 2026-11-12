/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import type { FramePublicAPI } from '@kbn/lens-common';
import { LayerHeader, LayerHeaderContent } from './layer_header';
import { createMockDatasource, createMockFramePublicAPI } from '../../../mocks';
import type {
  XYByReferenceAnnotationLayerConfig,
  XYByValueAnnotationLayerConfig,
  XYLayerConfig,
  XYVisualizationState,
} from '../types';
import { renderWithProviders } from '../../../test_utils/test_utils';

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

      const getStateWithLayers = (layers: XYLayerConfig[]): XYVisualizationState => ({
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

      const { container, rerender } = renderWithProviders(
        <LayerHeader {...props} state={getStateWithLayers([byValueLayer])} />
      );
      expect(container.textContent?.trim()).toBe('Annotations');

      rerender(<LayerHeader {...props} state={getStateWithLayers([byRefLayer])} />);
      expect(container.textContent?.trim()).toBe(byRefGroupTitle);

      const cachedMetadata = { title: 'A cached title', description: '', tags: [] };
      rerender(
        <LayerHeader {...props} state={getStateWithLayers([{ ...byRefLayer, cachedMetadata }])} />
      );
      expect(container.textContent?.trim()).toBe(cachedMetadata.title);
    });
  });

  describe('annotation layer header content', () => {
    const annotationLayer: XYByValueAnnotationLayerConfig = {
      layerId: 'annotation',
      layerType: 'annotations',
      annotations: [],
      indexPatternId: 'myIndexPattern',
      ignoreGlobalFilters: false,
    };

    const state: XYVisualizationState = {
      preferredSeriesType: 'area',
      legend: { isVisible: false, position: 'left' },
      layers: [annotationLayer],
    };

    const getProps = (frame: FramePublicAPI) => ({
      layerId: 'annotation',
      frame,
      state,
      onChangeIndexPattern: () => {},
      setState: () => {},
    });

    it('renders the data view switcher for form-based charts', () => {
      const frame = createMockFramePublicAPI({
        datasourceLayers: { data: createMockDatasource('formBased').publicAPIMock },
      });
      renderWithProviders(<LayerHeaderContent {...getProps(frame)} />);
      expect(screen.getByTestId('lns_layerIndexPatternLabel')).toBeInTheDocument();
    });

    it('hides the data view switcher on ES|QL charts', () => {
      const frame = createMockFramePublicAPI({
        datasourceLayers: { data: createMockDatasource('textBased').publicAPIMock },
      });
      const { container } = renderWithProviders(<LayerHeaderContent {...getProps(frame)} />);
      expect(container).toBeEmptyDOMElement();
    });
  });
});
