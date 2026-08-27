/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';

import {
  createMockFramePublicAPI,
  mockDatasourceMap,
  mockStoreDeps,
  mockVisualizationMap,
  renderWithReduxStore,
} from '../../../mocks';
import { createMockStartDependencies } from '../../../editor_frame_service/mocks';
import { EditorFrameServiceProvider } from '../../../editor_frame_service/editor_frame_service_context';
import type { LensPluginStartDependencies } from '../../../plugin';
import { useAddLayerButton } from './use_add_layer_button';

const TestComponent = ({ startDependencies }: { startDependencies: LensPluginStartDependencies }) =>
  useAddLayerButton(
    createMockFramePublicAPI(),
    coreMock.createStart(),
    startDependencies.dataViews,
    startDependencies.uiActions,
    jest.fn()
  );

describe('useAddLayerButton', () => {
  it('renders the visualization add layer button for an ES|QL query', () => {
    const visualizationMap = mockVisualizationMap();
    const datasourceMap = mockDatasourceMap();
    const startDependencies =
      createMockStartDependencies() as unknown as LensPluginStartDependencies;

    visualizationMap.testVis.getAddLayerButtonComponent = jest.fn(() => (
      <button type="button">Add layer</button>
    ));

    renderWithReduxStore(
      <EditorFrameServiceProvider visualizationMap={visualizationMap} datasourceMap={datasourceMap}>
        <TestComponent startDependencies={startDependencies} />
      </EditorFrameServiceProvider>,
      {},
      {
        preloadedState: {
          activeDatasourceId: 'textBased',
          datasourceStates: {
            textBased: {
              isLoading: false,
              state: {
                layers: {},
                indexPatternRefs: [],
              },
            },
          },
          query: { esql: 'from index1 | limit 10' },
          visualization: {
            activeId: 'testVis',
            selectedLayerId: 'layer1',
            state: {},
          },
        },
        storeDeps: mockStoreDeps({ datasourceMap, visualizationMap }),
      }
    );

    expect(screen.getByRole('button', { name: 'Add layer' })).toBeInTheDocument();
    expect(visualizationMap.testVis.getAddLayerButtonComponent).toHaveBeenCalled();
  });
});
