/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import type { ReactWrapper } from 'enzyme';

import type { LensLayerType, TypedLensSerializedState } from '@kbn/lens-common';
import { coreMock } from '@kbn/core/public/mocks';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';

import {
  createMockFramePublicAPI,
  mockVisualizationMap,
  mockDatasourceMap,
  mockStoreDeps,
  mountWithReduxStore,
} from '../../../mocks';
import { createMockStartDependencies } from '../../../editor_frame_service/mocks';
import type { MountStoreProps } from '../../../mocks';
import type { LensPluginStartDependencies } from '../../../plugin';
import { generateId } from '../../../id_generator';
import { EditorFrameServiceProvider } from '../../../editor_frame_service/editor_frame_service_context';

import { LayerTabsWrapper } from './layer_tabs';

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

const addNewLayer = (instance: ReactWrapper, type: LensLayerType = LayerTypes.REFERENCELINE) =>
  act(() => {
    instance.find(`button[data-test-subj="${type}"]`).first().simulate('click');
  });

const waitMs = (time: number) => new Promise((r) => setTimeout(r, time));

let container: HTMLDivElement | undefined;

beforeEach(() => {
  container = document.createElement('div');
  container.id = 'lensContainer';
  document.body.appendChild(container);
});

afterEach(() => {
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
  }

  container = undefined;
});

describe('LayerTabs', () => {
  const frame = createMockFramePublicAPI();

  function prepareAndMountComponent(
    props: ReturnType<typeof getDefaultProps>,
    customStoreProps?: Partial<MountStoreProps>
  ) {
    (generateId as jest.Mock).mockReturnValue(`newId`);
    const { visualizationMap, datasourceMap, ...rest } = props;
    return mountWithReduxStore(
      <EditorFrameServiceProvider visualizationMap={visualizationMap} datasourceMap={datasourceMap}>
        <LayerTabsWrapper {...rest} />
      </EditorFrameServiceProvider>,
      {
        preloadedState: {
          datasourceStates: {
            testDatasource: {
              isLoading: false,
              state: 'state',
            },
          },
          activeDatasourceId: 'testDatasource',
          visualization: {
            activeId: 'testVis',
            state: 'state',
            selectedLayerId: 'layer1',
          },
          query: undefined,
        },
        storeDeps: mockStoreDeps({
          datasourceMap,
          visualizationMap,
        }),
        ...customStoreProps,
      },
      {
        attachTo: container,
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
      first: datasourceMap.testDatasource.publicAPIMock,
    };

    // Override getAddLayerButtonComponent to return simple buttons for testing
    visualizationMap.testVis.getAddLayerButtonComponent = (props) => {
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
    };

    const mockStartDependencies =
      createMockStartDependencies() as unknown as LensPluginStartDependencies;

    return {
      visualizationMap,
      datasourceMap,
      framePublicAPI: frame,
      coreStart: coreMock.createStart(),
      startDependencies: mockStartDependencies,
      attributes: {
        state: {
          query: { language: 'kuery', query: '' },
          filters: [],
          datasourceStates: {
            testDatasource: {},
          },
          visualization: {},
        },
        visualizationType: 'testVis',
        title: 'Test',
        references: [],
      } as unknown as TypedLensSerializedState['attributes'],
      datasourceId: 'formBased' as const,
      setIsInlineFlyoutVisible: jest.fn(),
      getUserMessages: jest.fn(() => []),
    };
  }

  describe('noDatasource layer type', () => {
    it('When visualization is `noDatasource` should not run datasource methods', async () => {
      const datasourceMap = mockDatasourceMap();
      const visualizationMap = mockVisualizationMap();

      visualizationMap.testVis.setDimension = jest.fn();
      visualizationMap.testVis.getSupportedLayers = jest.fn(() => [
        {
          type: LayerTypes.DATA,
          label: 'Data Layer',
          initialDimensions: [
            {
              groupId: 'testGroup',
              columnId: 'myColumn',
              staticValue: 100,
            },
          ],
        },
        {
          type: LayerTypes.REFERENCELINE,
          label: 'Reference layer',
        },
        {
          type: LayerTypes.ANNOTATIONS,
          label: 'Annotations Layer',
          noDatasource: true,
          initialDimensions: [
            {
              groupId: 'a',
              columnId: 'newId',
              staticValue: 100,
            },
          ],
        },
      ]);

      datasourceMap.testDatasource.initializeDimension = jest.fn();
      const props = getDefaultProps({ visualizationMap, datasourceMap });
      const { instance, lensStore } = await prepareAndMountComponent(props);

      // Wait for component to mount and update
      await waitMs(0);
      instance.update();

      addNewLayer(instance, LayerTypes.ANNOTATIONS);

      // Wait for state updates
      await waitMs(0);

      // One call for adding the layer, one call for setting it as the current selected layer
      expect(lensStore.dispatch).toHaveBeenCalledTimes(2);

      expect(visualizationMap.testVis.setDimension).toHaveBeenCalledWith({
        columnId: 'newId',
        frame: {
          dataViews: expect.anything(),
          activeData: undefined,
          datasourceLayers: {
            a: expect.anything(),
          },
          dateRange: expect.anything(),
          absDateRange: expect.anything(),
          filters: [],
          now: expect.anything(),
          query: undefined,
        },
        groupId: 'a',
        layerId: 'newId',
        prevState: undefined,
      });
      expect(datasourceMap.testDatasource.initializeDimension).not.toHaveBeenCalled();
    });

    it('should not add an initial dimension when not specified', async () => {
      const datasourceMap = mockDatasourceMap();
      const visualizationMap = mockVisualizationMap();

      visualizationMap.testVis.getSupportedLayers = jest.fn(() => [
        { type: LayerTypes.DATA, label: 'Data Layer' },
        {
          type: LayerTypes.REFERENCELINE,
          label: 'Reference layer',
        },
      ]);
      datasourceMap.testDatasource.initializeDimension = jest.fn();
      const props = getDefaultProps({ datasourceMap, visualizationMap });

      const { instance, lensStore } = await prepareAndMountComponent(props);
      addNewLayer(instance);

      // One call for adding the layer, one call for setting it as the current selected layer
      expect(lensStore.dispatch).toHaveBeenCalledTimes(2);
      expect(datasourceMap.testDatasource.initializeDimension).not.toHaveBeenCalled();
    });

    it('should not add an initial dimension when initialDimensions are not available for the given layer type', async () => {
      const datasourceMap = mockDatasourceMap();
      const visualizationMap = mockVisualizationMap();
      datasourceMap.testDatasource.initializeDimension = jest.fn();

      visualizationMap.testVis.getSupportedLayers = jest.fn(() => [
        {
          type: LayerTypes.DATA,
          label: 'Data Layer',
          initialDimensions: [
            {
              groupId: 'testGroup',
              columnId: 'myColumn',
              staticValue: 100,
            },
          ],
        },
        {
          type: LayerTypes.REFERENCELINE,
          label: 'Reference layer',
        },
      ]);
      const props = getDefaultProps({ datasourceMap, visualizationMap });
      const { instance, lensStore } = await prepareAndMountComponent(props);

      addNewLayer(instance);
      // One call for adding the layer, one call for setting it as the current selected layer
      expect(lensStore.dispatch).toHaveBeenCalledTimes(2);
      expect(datasourceMap.testDatasource.initializeDimension).not.toHaveBeenCalled();
    });

    it('should use group initial dimension value when adding a new layer if available', async () => {
      const datasourceMap = mockDatasourceMap();
      const visualizationMap = mockVisualizationMap();
      visualizationMap.testVis.getSupportedLayers = jest.fn(() => [
        { type: LayerTypes.DATA, label: 'Data Layer' },
        {
          type: LayerTypes.REFERENCELINE,
          label: 'Reference layer',
          initialDimensions: [
            {
              groupId: 'testGroup',
              columnId: 'myColumn',
              staticValue: 100,
            },
          ],
        },
      ]);
      datasourceMap.testDatasource.initializeDimension = jest.fn();
      const props = getDefaultProps({ datasourceMap, visualizationMap });

      const { instance, lensStore } = await prepareAndMountComponent(props);
      addNewLayer(instance);

      // One call for adding the layer, one call for setting it as the current selected layer
      expect(lensStore.dispatch).toHaveBeenCalledTimes(2);
      expect(datasourceMap.testDatasource.initializeDimension).toHaveBeenCalledWith(
        {},
        'newId',
        frame.dataViews.indexPatterns,
        {
          columnId: 'myColumn',
          groupId: 'testGroup',
          staticValue: 100,
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

  describe('layer reset and remove', () => {
    it('should show layer actions menu when single layer', async () => {
      const datasourceMap = mockDatasourceMap();
      const visualizationMap = mockVisualizationMap();

      // Set up visualization to return a single layer
      visualizationMap.testVis.getLayerIds = jest.fn(() => ['layer1']);
      visualizationMap.testVis.getConfiguration = jest.fn(() => ({
        groups: [
          {
            layerId: 'layer1',
            groupId: 'a',
            groupLabel: 'A',
            accessors: [],
            filterOperations: () => true,
            supportsMoreColumns: true,
            dataTestSubj: 'mockVisA',
          },
        ],
      }));

      const props = getDefaultProps({ visualizationMap, datasourceMap });

      const { instance } = await prepareAndMountComponent(props);

      // The tab action button should exist
      expect(instance.find('[data-test-subj="lnsLayerActions"]').exists()).toBe(true);

      // Click the tab action button to open the menu
      act(() => {
        instance.find('button[aria-label="Layer actions"]').simulate('click');
      });
      instance.update();

      // The layer actions menu should exist (contains reset/remove buttons)
      expect(instance.find('[data-test-subj="lnsLayerActionsMenu"]').exists()).toBe(true);

      // The reset action should exist
      expect(instance.find('button[title="Clear layer"]').exists()).toBe(true);
    });

    it('should show layer actions menu when multiple layers', async () => {
      const datasourceMap = mockDatasourceMap();
      const visualizationMap = mockVisualizationMap();

      // Mock multiple layers
      visualizationMap.testVis.getLayerIds = jest.fn(() => ['layer1', 'layer2']);
      visualizationMap.testVis.getConfiguration = jest.fn(() => ({
        groups: [
          {
            layerId: 'layer1',
            groupId: 'a',
            groupLabel: 'A',
            accessors: [],
            filterOperations: () => true,
            supportsMoreColumns: true,
            dataTestSubj: 'mockVisA',
          },
        ],
      }));

      const props = getDefaultProps({ visualizationMap, datasourceMap });

      const { instance } = await prepareAndMountComponent(props, {
        preloadedState: {
          datasourceStates: {
            testDatasource: {
              isLoading: false,
              state: 'state',
            },
          },
          activeDatasourceId: 'testDatasource',
          visualization: {
            activeId: 'testVis',
            state: 'state',
            selectedLayerId: 'layer1',
          },
          query: undefined,
        },
      });

      // The tab action button should exist
      expect(instance.find('[data-test-subj="lnsLayerActions"]').exists()).toBe(true);

      // Click the tab action button to open the menu
      act(() => {
        instance.find('button[aria-label="Layer actions"]').first().simulate('click');
      });
      instance.update();

      // The layer actions menu should exist (contains reset/remove buttons)
      expect(instance.find('[data-test-subj="lnsLayerActionsMenu"]').exists()).toBe(true);

      // The delete action should exist
      expect(instance.find('button[title="Delete layer"]').exists()).toBe(true);
    });

    it('should call the clear callback when resetting layer', async () => {
      const datasourceMap = mockDatasourceMap();
      const visualizationMap = mockVisualizationMap();

      // Set up visualization to return a single layer
      visualizationMap.testVis.getLayerIds = jest.fn(() => ['layer1']);
      visualizationMap.testVis.getConfiguration = jest.fn(() => ({
        groups: [
          {
            layerId: 'layer1',
            groupId: 'a',
            groupLabel: 'A',
            accessors: [],
            filterOperations: () => true,
            supportsMoreColumns: true,
            dataTestSubj: 'mockVisA',
          },
        ],
      }));

      const props = getDefaultProps({ visualizationMap, datasourceMap });

      const { instance, lensStore } = await prepareAndMountComponent(props);

      // Click the tab action button to open the menu
      act(() => {
        instance.find('button[aria-label="Layer actions"]').simulate('click');
      });
      instance.update();

      // Click the clear layer button
      act(() => {
        instance.find('button[title="Clear layer"]').simulate('click');
      });

      // Wait for state updates
      await waitMs(0);

      // lens/removeOrClearLayer action should be dispatched
      expect(lensStore.dispatch).toHaveBeenCalledWith({
        payload: {
          layerId: 'layer1',
          layerIds: ['layer1'],
          visualizationId: 'testVis',
        },
        type: 'lens/removeOrClearLayer',
      });
    });
  });
});
