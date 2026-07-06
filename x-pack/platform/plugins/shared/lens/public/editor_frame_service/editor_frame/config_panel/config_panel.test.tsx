/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, act, fireEvent } from '@testing-library/react';
import type { Query, AggregateQuery } from '@kbn/es-query';

import {
  createMockFramePublicAPI,
  mockVisualizationMap,
  mockDatasourceMap,
  mockStoreDeps,
  renderWithReduxStore,
} from '../../../mocks';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { Visualization } from '@kbn/lens-common';
import { ConfigPanel } from './config_panel';
import { coreMock } from '@kbn/core/public/mocks';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { generateId } from '../../../id_generator';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { createIndexPatternServiceMock } from '../../../mocks/data_views_service_mock';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { EditorFrameServiceProvider } from '../../editor_frame_service_context';
import { updateDatasourceState, setDimensionAndUpdateDatasource } from '../../../state_management';

jest.mock('../../../id_generator');

jest.mock('@kbn/kibana-utils-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-utils-plugin/public');
  return {
    ...original,
    Storage: class Storage {
      get = () => ({ skipDeleteModal: true });
    },
  };
});

describe('ConfigPanel', () => {
  const frame = createMockFramePublicAPI();

  let uiActions: UiActionsStart;

  beforeEach(() => {
    jest.useFakeTimers();
    uiActions = uiActionsPluginMock.createStartContract();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  function renderConfigPanel(
    props: ReturnType<typeof getDefaultProps>,
    customStoreProps?: {
      preloadedState?: Record<string, unknown>;
      storeDeps?: ReturnType<typeof mockStoreDeps>;
    },
    query?: Query | AggregateQuery,
    selectedLayerId: string | null = 'first'
  ) {
    (generateId as jest.Mock).mockReturnValue(`newId`);
    const { visualizationMap, datasourceMap, ...rest } = props;
    return renderWithReduxStore(
      <EditorFrameServiceProvider visualizationMap={visualizationMap} datasourceMap={datasourceMap}>
        <ConfigPanel {...rest} />
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
          query: query as Query,
          visualization: {
            activeId: 'testVis',
            state: 'state',
            selectedLayerId,
          },
          ...customStoreProps?.preloadedState,
        },
        storeDeps:
          customStoreProps?.storeDeps ??
          mockStoreDeps({
            datasourceMap,
            visualizationMap,
          }),
      }
    );
  }

  function getDefaultProps(
    { datasourceMap = mockDatasourceMap(), visualizationMap = mockVisualizationMap() } = {
      datasourceMap: mockDatasourceMap(),
      visualizationMap: mockVisualizationMap(),
    }
  ) {
    frame.datasourceLayers = {
      first: datasourceMap.formBased.publicAPIMock,
    };
    return {
      activeVisualizationId: 'testVis',
      visualizationMap,
      activeDatasourceId: 'formBased',
      datasourceMap,
      activeVisualization: {
        ...visualizationMap.testVis,
        getLayerIds: () => Object.keys(frame.datasourceLayers),
        getAddLayerButtonComponent: (props: { addLayer: (type: string) => void }) => {
          return (
            <>
              <button
                data-test-subj={LayerTypes.REFERENCELINE}
                onClick={() => props.addLayer(LayerTypes.REFERENCELINE)}
              />
              <button
                data-test-subj={LayerTypes.ANNOTATIONS}
                onClick={() => props.addLayer(LayerTypes.ANNOTATIONS)}
              />
            </>
          );
        },
      } as Visualization,
      datasourceStates: {
        formBased: {
          isLoading: false,
          state: 'state',
        },
      },
      indexPatternService: createIndexPatternServiceMock(),
      visualizationState: 'state',
      updateVisualization: jest.fn(),
      updateDatasource: jest.fn(),
      updateAll: jest.fn(),
      framePublicAPI: frame,
      dispatch: jest.fn(),
      core: coreMock.createStart(),
      isFullscreen: false,
      toggleFullscreen: jest.fn(),
      uiActions,
      dataViews: {} as DataViewsPublicPluginStart,
      data: dataPluginMock.createStartContract(),
      getUserMessages: () => [],
    };
  }

  it('should not render layer panel if the public API is out of date', () => {
    const props = getDefaultProps();
    props.framePublicAPI.datasourceLayers = {};
    renderConfigPanel(props, undefined, undefined, null);
    expect(screen.queryByTestId('lns-layerPanel-0')).not.toBeInTheDocument();
  });

  it('updates datasources and visualizations through store dispatch', () => {
    const props = getDefaultProps();
    const { store } = renderConfigPanel(props);

    act(() => {
      store.dispatch(
        updateDatasourceState({
          newDatasourceState: 'updated',
          datasourceId: 'formBased',
          clearStagedPreview: false,
        })
      );
    });

    expect(store.getState().lens.datasourceStates.formBased.state).toEqual('updated');

    act(() => {
      store.dispatch(
        setDimensionAndUpdateDatasource({
          visualizationId: 'testVis',
          layerId: 'first',
          groupId: 'a',
          columnId: 'col1',
          datasourceId: 'formBased',
          newDatasourceState: 'updated-again',
        })
      );
    });

    expect(store.getState().lens.datasourceStates.formBased.state).toEqual('updated-again');
  });

  describe('initial default value', () => {
    it('should add an initial dimension value when clicking on the empty dimension button', async () => {
      const datasourceMap = mockDatasourceMap();

      const visualizationMap = mockVisualizationMap();
      visualizationMap.testVis.getSupportedLayers = jest.fn(() => [
        {
          type: LayerTypes.DATA,
          label: 'Data Layer',
          initialDimensions: [
            {
              groupId: 'a',
              columnId: 'newId',
              staticValue: 100,
            },
          ],
        },
      ]);
      datasourceMap.formBased.initializeDimension = jest.fn();
      const props = getDefaultProps({ visualizationMap, datasourceMap });
      const { store } = renderConfigPanel(props);

      fireEvent.click(screen.getByTestId('lns-empty-dimension'));
      expect(store.dispatch).toHaveBeenCalledTimes(1);

      expect(datasourceMap.formBased.initializeDimension).toHaveBeenCalledWith(
        'state',
        'first',
        frame.dataViews.indexPatterns,
        {
          groupId: 'a',
          columnId: 'newId',
          staticValue: 100,
          activeVisualizationTypeId: 'testVis',
          visualizationGroups: [
            expect.objectContaining({
              accessors: [],
              dataTestSubj: 'mockVisA',
              groupId: 'a',
              groupLabel: 'a',
              layerId: 'layer1',
              supportsMoreColumns: true,
            }),
          ],
        }
      );
    });
  });

  describe('text based languages', () => {
    it('should not allow to clone a layer', () => {
      const datasourceMap = mockDatasourceMap();
      const visualizationMap = mockVisualizationMap();

      visualizationMap.testVis.getSupportedLayers = jest.fn(() => [
        { type: LayerTypes.DATA, label: 'Data Layer' },
        {
          type: LayerTypes.REFERENCELINE,
          label: 'Reference layer',
        },
      ]);
      datasourceMap.formBased.initializeDimension = jest.fn();
      const props = getDefaultProps({ datasourceMap, visualizationMap });

      renderConfigPanel(props, undefined, { esql: 'from "foo"' });
      expect(screen.queryByTestId('lnsLayerClone')).not.toBeInTheDocument();
    });
  });
});
