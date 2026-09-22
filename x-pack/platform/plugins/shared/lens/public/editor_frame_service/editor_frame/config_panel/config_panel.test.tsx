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
import type { Visualization, FramePublicAPI } from '@kbn/lens-common';
import { ConfigPanel } from './config_panel';
import { coreMock } from '@kbn/core/public/mocks';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { generateId } from '../../../id_generator';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { createIndexPatternServiceMock } from '../../../mocks/data_views_service_mock';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { EditorFrameServiceProvider } from '../../editor_frame_service_context';

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
  let frame: FramePublicAPI;
  let uiActions: UiActionsStart;

  beforeEach(() => {
    jest.useFakeTimers();
    frame = createMockFramePublicAPI();
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
            [rest.activeDatasourceId]: {
              isLoading: false,
              state: 'state',
            },
          },
          activeDatasourceId: rest.activeDatasourceId,
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

  function getDefaultProps({
    datasourceMap = mockDatasourceMap(),
    visualizationMap = mockVisualizationMap(),
    activeDatasourceId = 'formBased',
  }: {
    datasourceMap?: ReturnType<typeof mockDatasourceMap>;
    visualizationMap?: ReturnType<typeof mockVisualizationMap>;
    activeDatasourceId?: string;
  } = {}) {
    const activeDatasource = datasourceMap[activeDatasourceId as keyof typeof datasourceMap];
    frame.datasourceLayers = {
      first: activeDatasource.publicAPIMock,
    };
    return {
      activeVisualizationId: 'testVis',
      visualizationMap,
      activeDatasourceId,
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

  function mockDimensionEditorApply(
    datasourceMap: ReturnType<typeof mockDatasourceMap>,
    visualizationMap: ReturnType<typeof mockVisualizationMap>,
    accessors: Array<{ columnId: string }>
  ) {
    visualizationMap.testVis.getConfiguration = jest.fn(() => ({
      groups: [
        {
          groupId: 'a',
          groupLabel: 'a',
          layerId: 'first',
          supportsMoreColumns: true,
          accessors,
          filterOperations: jest.fn(() => true),
          dataTestSubj: 'mockVisA',
        },
      ],
    }));
    visualizationMap.testVis.setDimension = jest.fn().mockReturnValue('state');
    datasourceMap.formBased.DimensionEditorComponent = jest
      .fn()
      .mockImplementation(({ setState }: { setState: (s: unknown) => void }) => (
        <button data-test-subj="mockDimensionEditorApply" onClick={() => setState('updated')} />
      ));
  }

  it('updates datasource state by exercising the existing-accessor callback chain', () => {
    const datasourceMap = mockDatasourceMap();
    const visualizationMap = mockVisualizationMap();
    mockDimensionEditorApply(datasourceMap, visualizationMap, [{ columnId: 'col1' }]);

    const props = getDefaultProps({ datasourceMap, visualizationMap });
    const { store } = renderConfigPanel(props);

    fireEvent.click(screen.getByTestId('lnsLayerPanel-dimensionLink'));
    fireEvent.click(screen.getByTestId('mockDimensionEditorApply'));

    act(() => {
      jest.runAllTimers();
    });

    expect(store.getState().lens.datasourceStates.formBased.state).toEqual('updated');
  });

  it('updates datasource and visualization by exercising the new-accessor callback chain', () => {
    const datasourceMap = mockDatasourceMap();
    const visualizationMap = mockVisualizationMap();
    mockDimensionEditorApply(datasourceMap, visualizationMap, []);

    const props = getDefaultProps({ datasourceMap, visualizationMap });
    const { store } = renderConfigPanel(props);

    fireEvent.click(screen.getByTestId('lns-empty-dimension'));
    fireEvent.click(screen.getByTestId('mockDimensionEditorApply'));

    act(() => {
      jest.runAllTimers();
    });

    expect(store.getState().lens.datasourceStates.formBased.state).toEqual('updated');
    expect(visualizationMap.testVis.setDimension).toHaveBeenCalledWith(
      expect.objectContaining({
        layerId: 'first',
        groupId: 'a',
        columnId: 'newId',
      })
    );
  });

  describe('initial default value', () => {
    it('should add an initial dimension value when clicking on the empty dimension button', () => {
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
      datasourceMap.textBased.publicAPIMock.isTextBasedLanguage.mockReturnValue(true);
      visualizationMap.testVis.cloneLayer = jest.fn();

      const props = getDefaultProps({
        datasourceMap,
        visualizationMap,
        activeDatasourceId: 'textBased',
      });

      renderConfigPanel(props, undefined, { esql: 'from "foo"' });
      expect(screen.getByTestId('lns-layerPanel-0')).toBeInTheDocument();
      // Regex matches "lnsLayerClone--{index}" (e.g. "lnsLayerClone--0")
      expect(screen.queryByTestId(/^lnsLayerClone/)).not.toBeInTheDocument();
    });
  });
});
