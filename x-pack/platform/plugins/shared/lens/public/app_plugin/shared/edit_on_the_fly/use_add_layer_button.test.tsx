/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import type { Query, AggregateQuery } from '@kbn/es-query';
import { coreMock } from '@kbn/core/public/mocks';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';

import {
  createMockFramePublicAPI,
  mockVisualizationMap,
  mockDatasourceMap,
  mockStoreDeps,
  renderWithReduxStore,
} from '../../../mocks';
import { createMockStartDependencies } from '../../../editor_frame_service/mocks';
import { EditorFrameServiceProvider } from '../../../editor_frame_service/editor_frame_service_context';
import type { LensPluginStartDependencies } from '../../../plugin';
import { useAddLayerButton } from './use_add_layer_button';

function AddLayerButtonHarness({
  framePublicAPI,
  coreStart,
  dataViews,
  uiActions,
}: {
  framePublicAPI: ReturnType<typeof createMockFramePublicAPI>;
  coreStart: ReturnType<typeof coreMock.createStart>;
  dataViews: LensPluginStartDependencies['dataViews'];
  uiActions: LensPluginStartDependencies['uiActions'];
}) {
  const addLayerButton = useAddLayerButton(
    framePublicAPI,
    coreStart,
    dataViews,
    uiActions,
    () => undefined
  );

  return <div data-test-subj="addLayerButtonHost">{addLayerButton}</div>;
}

describe('useAddLayerButton', () => {
  function renderAddLayerButton(query?: Query | AggregateQuery) {
    const visualizationMap = mockVisualizationMap();
    const datasourceMap = mockDatasourceMap();
    visualizationMap.testVis.getAddLayerButtonComponent = (props) => (
      <button data-test-subj="lnsLayerAddButton" onClick={() => props.addLayer(LayerTypes.DATA)} />
    );

    const framePublicAPI = createMockFramePublicAPI();
    const coreStart = coreMock.createStart();
    const startDependencies =
      createMockStartDependencies() as unknown as LensPluginStartDependencies;

    return renderWithReduxStore(
      <EditorFrameServiceProvider visualizationMap={visualizationMap} datasourceMap={datasourceMap}>
        <AddLayerButtonHarness
          framePublicAPI={framePublicAPI}
          coreStart={coreStart}
          dataViews={startDependencies.dataViews}
          uiActions={startDependencies.uiActions}
        />
      </EditorFrameServiceProvider>,
      {},
      {
        preloadedState: {
          datasourceStates: {
            formBased: {
              isLoading: false,
              state: 'state',
            },
          },
          activeDatasourceId: 'formBased',
          query,
          visualization: {
            activeId: 'testVis',
            state: 'state',
            selectedLayerId: 'first',
          },
        },
        storeDeps: mockStoreDeps({ datasourceMap, visualizationMap }),
      }
    );
  }

  it('hides the add layer button for ES|QL queries', () => {
    renderAddLayerButton({ esql: 'FROM foo' });
    expect(screen.queryByTestId('lnsLayerAddButton')).not.toBeInTheDocument();
  });

  it('renders the add layer button for non-ES|QL queries', () => {
    renderAddLayerButton({ query: '*', language: 'kuery' });
    expect(screen.getByTestId('lnsLayerAddButton')).toBeInTheDocument();
  });
});
