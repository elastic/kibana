/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EnhancedStore } from '@reduxjs/toolkit';
import type { Query } from '@kbn/es-query';
import {
  switchDatasource,
  switchAndCleanDatasource,
  switchVisualization,
  setState,
  updateDatasourceState,
  updateVisualizationState,
  removeOrClearLayer,
  addLayer,
  LensRootStore,
  selectTriggerApplyChanges,
  selectChangesApplied,
  removeDimension,
} from '.';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { makeLensStore, defaultState, mockStoreDeps } from '../mocks';
import {
  Datasource,
  DatasourceMap,
  Visualization,
  VisualizationDimensionGroupConfig,
  VisualizationMap,
} from '../types';
import { applyChanges, disableAutoApply, enableAutoApply, setChangesApplied } from './lens_slice';
import { DataViewsState, LensAppState } from './types';
import { layerTypes } from '../../common/layer_types';

describe('lensSlice', () => {
  let store: EnhancedStore<{ lens: LensAppState }>;
  beforeEach(() => {
    store = makeLensStore({}).store;
    jest.clearAllMocks();
  });
  const customQuery = { query: 'custom' } as Query;

  describe('state update', () => {
    it('setState: updates state ', () => {
      const lensState = store.getState().lens;
      expect(lensState).toEqual(defaultState);
      store.dispatch(setState({ query: customQuery }));
      const changedState = store.getState().lens;
      expect(changedState).toEqual({ ...defaultState, query: customQuery });
    });

    describe('auto-apply-related actions', () => {
      it('should disable auto apply', () => {
        expect(store.getState().lens.autoApplyDisabled).toBeUndefined();
        expect(store.getState().lens.changesApplied).toBeUndefined();

        store.dispatch(disableAutoApply());

        expect(store.getState().lens.autoApplyDisabled).toBe(true);
        expect(store.getState().lens.changesApplied).toBe(true);
      });

      it('should enable auto-apply', () => {
        store.dispatch(disableAutoApply());

        expect(store.getState().lens.autoApplyDisabled).toBe(true);

        store.dispatch(enableAutoApply());

        expect(store.getState().lens.autoApplyDisabled).toBe(false);
      });

      it('applies changes when auto-apply disabled', () => {
        store.dispatch(disableAutoApply());

        store.dispatch(applyChanges());

        expect(selectTriggerApplyChanges(store.getState())).toBe(true);
      });

      it('does not apply changes if auto-apply enabled', () => {
        expect(store.getState().lens.autoApplyDisabled).toBeUndefined();

        store.dispatch(applyChanges());

        expect(selectTriggerApplyChanges(store.getState())).toBe(false);
      });

      it('sets changes-applied flag', () => {
        expect(store.getState().lens.changesApplied).toBeUndefined();

        store.dispatch(setChangesApplied(true));

        expect(selectChangesApplied(store.getState())).toBe(true);

        store.dispatch(setChangesApplied(false));

        expect(selectChangesApplied(store.getState())).toBe(true);
      });
    });

    it('should update the corresponding visualization state on update', () => {
      const newVisState = {};
      store.dispatch(
        updateVisualizationState({
          visualizationId: 'testVis',
          newState: newVisState,
        })
      );

      expect(store.getState().lens.visualization.state).toEqual(newVisState);
    });
    it('should update the layer state with passed in reducer', () => {
      const newDatasourceState = {};
      store.dispatch(
        updateDatasourceState({
          datasourceId: 'testDatasource',
          newDatasourceState,
        })
      );
      expect(store.getState().lens.datasourceStates.testDatasource.state).toStrictEqual(
        newDatasourceState
      );
    });
    it('should should switch active visualization', () => {
      const newVisState = {};
      store.dispatch(
        switchVisualization({
          suggestion: {
            newVisualizationId: 'testVis2',
            visualizationState: newVisState,
          },
          clearStagedPreview: true,
        })
      );

      expect(store.getState().lens.visualization.state).toBe(newVisState);
    });

    it('should should switch active visualization and update datasource state', () => {
      const newVisState = {};
      const newDatasourceState = {};

      store.dispatch(
        switchVisualization({
          suggestion: {
            newVisualizationId: 'testVis2',
            visualizationState: newVisState,
            datasourceState: newDatasourceState,
            datasourceId: 'testDatasource',
          },
          clearStagedPreview: true,
        })
      );

      expect(store.getState().lens.visualization.state).toBe(newVisState);
      expect(store.getState().lens.datasourceStates.testDatasource.state).toBe(newDatasourceState);
    });

    it('should switch active datasource and initialize new state', () => {
      store.dispatch(
        switchDatasource({
          newDatasourceId: 'testDatasource2',
        })
      );

      expect(store.getState().lens.activeDatasourceId).toEqual('testDatasource2');
      expect(store.getState().lens.datasourceStates.testDatasource2.isLoading).toEqual(true);
    });

    it('should not initialize already initialized datasource on switch', () => {
      const datasource2State = {};
      const { store: customStore } = makeLensStore({
        preloadedState: {
          datasourceStates: {
            testDatasource: {
              state: {},
              isLoading: false,
            },
            testDatasource2: {
              state: datasource2State,
              isLoading: false,
            },
          },
        },
      });

      customStore.dispatch(
        switchDatasource({
          newDatasourceId: 'testDatasource2',
        })
      );

      expect(customStore.getState().lens.activeDatasourceId).toEqual('testDatasource2');
      expect(customStore.getState().lens.datasourceStates.testDatasource2.isLoading).toEqual(false);
      expect(customStore.getState().lens.datasourceStates.testDatasource2.state).toBe(
        datasource2State
      );
    });

    describe('switching to a new datasource and modify the state', () => {
      it('should switch active datasource and initialize new state', () => {
        store.dispatch(
          switchAndCleanDatasource({
            newDatasourceId: 'testDatasource2',
            visualizationId: 'testVis',
            currentIndexPatternId: 'testIndexPatternId',
          })
        );
        expect(store.getState().lens.activeDatasourceId).toEqual('testDatasource2');
        expect(store.getState().lens.datasourceStates.testDatasource2.isLoading).toEqual(false);
        expect(store.getState().lens.visualization.activeId).toEqual('testVis');
      });

      it('should should switch active datasource and clean the datasource state', () => {
        const datasource2State = {
          layers: {},
        };
        const { store: customStore } = makeLensStore({
          preloadedState: {
            datasourceStates: {
              testDatasource: {
                state: {},
                isLoading: false,
              },
              testDatasource2: {
                state: datasource2State,
                isLoading: false,
              },
            },
          },
        });

        customStore.dispatch(
          switchAndCleanDatasource({
            newDatasourceId: 'testDatasource2',
            visualizationId: 'testVis',
            currentIndexPatternId: 'testIndexPatternId',
          })
        );

        expect(customStore.getState().lens.activeDatasourceId).toEqual('testDatasource2');
        expect(customStore.getState().lens.datasourceStates.testDatasource2.isLoading).toEqual(
          false
        );
        expect(customStore.getState().lens.datasourceStates.testDatasource2.state).toStrictEqual(
          {}
        );
      });
    });

    describe('adding or removing layer', () => {
      const testDatasource = (datasourceId: string) => {
        return {
          id: datasourceId,
          getPublicAPI: () => ({
            datasourceId,
            getOperationForColumnId: jest.fn(),
            getTableSpec: jest.fn(),
          }),
          getLayers: () => ['layer1'],
          clearLayer: (layerIds: unknown, layerId: string) => ({
            removedLayerIds: [],
            newState: (layerIds as string[]).map((id: string) =>
              id === layerId ? `${datasourceId}_clear_${layerId}` : id
            ),
          }),
          removeLayer: (layerIds: unknown, layerId: string) => ({
            newState: (layerIds as string[]).filter((id: string) => id !== layerId),
            removedLayerIds: [layerId],
          }),
          insertLayer: (layerIds: unknown, layerId: string, layersToLinkTo: string[]) => [
            ...(layerIds as string[]),
            layerId,
            ...layersToLinkTo,
          ],
          getCurrentIndexPatternId: jest.fn(() => 'indexPattern1'),
          getUsedDataView: jest.fn(() => 'indexPattern1'),
        };
      };
      const datasourceStates = {
        testDatasource: {
          isLoading: false,
          state: ['layer1'],
        },
        testDatasource2: {
          isLoading: false,
          state: ['layer2'],
        },
      };
      const datasourceMap = {
        testDatasource: testDatasource('testDatasource'),
        testDatasource2: testDatasource('testDatasource2'),
      };

      const activeVisId = 'testVis';
      const visualizationMap = {
        [activeVisId]: {
          clearLayer: (layerIds: unknown, layerId: string) =>
            (layerIds as string[]).map((id: string) =>
              id === layerId ? `vis_clear_${layerId}` : id
            ),
          removeLayer: jest.fn((layerIds: unknown, layerId: string) =>
            (layerIds as string[]).filter((id: string) => id !== layerId)
          ),
          getLayerIds: (layerIds: unknown) => layerIds as string[],
          getLayersToLinkTo: (state, newLayerId) => ['linked-layer-id'],
          appendLayer: (layerIds: unknown, layerId: string) => [...(layerIds as string[]), layerId],
          getSupportedLayers: jest.fn(() => [{ type: layerTypes.DATA, label: 'Data Layer' }]),
        } as Partial<Visualization>,
      };

      let customStore: LensRootStore;
      beforeEach(() => {
        customStore = makeLensStore({
          preloadedState: {
            activeDatasourceId: 'testDatasource',
            datasourceStates,
            visualization: {
              activeId: activeVisId,
              state: ['layer1', 'layer2'],
            },
            stagedPreview: {
              visualization: {
                activeId: activeVisId,
                state: ['layer1', 'layer2'],
              },
              datasourceStates,
            },
          },
          storeDeps: mockStoreDeps({
            visualizationMap: visualizationMap as unknown as VisualizationMap,
            datasourceMap: datasourceMap as unknown as DatasourceMap,
          }),
        }).store;
      });

      it('addLayer: should add the layer to the datasource and visualization', () => {
        customStore.dispatch(
          addLayer({
            layerId: 'foo',
            layerType: LayerTypes.DATA,
            extraArg: 'some arg',
          })
        );
        const state = customStore.getState().lens;

        expect(state.visualization.state).toEqual(['layer1', 'layer2', 'foo']);
        expect(state.datasourceStates.testDatasource.state).toEqual([
          'layer1',
          'foo',
          'linked-layer-id',
        ]);
        expect(state.datasourceStates.testDatasource2.state).toEqual(['layer2']);
        expect(state.stagedPreview).not.toBeDefined();
      });

      it('addLayer: syncs linked dimensions', () => {
        const activeVisualization = visualizationMap[activeVisId];

        activeVisualization.getLinkedDimensions = jest.fn(() => [
          {
            from: {
              layerId: 'from-layer',
              columnId: 'from-column',
              groupId: 'from-group',
            },
            to: {
              layerId: 'from-layer',
              columnId: 'from-column',
              groupId: 'from-group',
            },
          },
        ]);
        activeVisualization.getConfiguration = jest.fn(() => ({
          groups: [{ groupId: 'to-group' } as VisualizationDimensionGroupConfig],
        }));
        activeVisualization.onDrop = jest.fn(({ prevState }) => prevState);
        (datasourceMap.testDatasource as unknown as Datasource).syncColumns = jest.fn(
          ({ state }) => state
        );

        customStore.dispatch(
          addLayer({
            layerId: 'foo',
            layerType: layerTypes.DATA,
            extraArg: undefined,
          })
        );

        expect(
          (
            (datasourceMap.testDatasource as unknown as Datasource).syncColumns as jest.Mock<
              Datasource['syncColumns']
            >
          ).mock.calls[0][0]
        ).toMatchInlineSnapshot(`
          Object {
            "getDimensionGroups": [Function],
            "indexPatterns": Object {},
            "links": Array [
              Object {
                "from": Object {
                  "columnId": "from-column",
                  "groupId": "from-group",
                  "layerId": "from-layer",
                },
                "to": Object {
                  "columnId": "from-column",
                  "groupId": "from-group",
                  "layerId": "from-layer",
                },
              },
            ],
            "state": Array [
              "layer1",
              "foo",
              "linked-layer-id",
            ],
          }
        `);

        expect(activeVisualization.onDrop).toHaveBeenCalledTimes(1);
        expect({
          ...(activeVisualization.onDrop as jest.Mock<Visualization['onDrop']>).mock.calls[0][0],
          frame: undefined,
        }).toMatchInlineSnapshot(`
          Object {
            "dropType": "duplicate_compatible",
            "frame": undefined,
            "group": undefined,
            "prevState": Array [
              "layer1",
              "layer2",
              "foo",
            ],
            "source": Object {
              "columnId": "from-column",
              "groupId": "from-group",
              "humanData": Object {
                "label": "",
              },
              "id": "from-column",
              "layerId": "from-layer",
            },
            "target": Object {
              "columnId": "from-column",
              "filterOperations": [Function],
              "groupId": "from-group",
              "layerId": "from-layer",
            },
          }
        `);
      });

      it('removeLayer: should remove the layer if it is not the only layer', () => {
        customStore.dispatch(
          removeOrClearLayer({
            visualizationId: 'testVis',
            layerId: 'layer1',
            layerIds: ['layer1', 'layer2'],
          })
        );
        const state = customStore.getState().lens;

        expect(state.visualization.state).toEqual(['layer2']);
        expect(state.datasourceStates.testDatasource.state).toEqual([]);
        expect(state.datasourceStates.testDatasource2.state).toEqual(['layer2']);
        expect(state.stagedPreview).not.toBeDefined();
      });

      it('removeLayer: should remove all layers from visualization that were removed by datasource', () => {
        const removedLayerId = 'other-removed-layer';

        const testDatasource3 = testDatasource('testDatasource3');
        testDatasource3.removeLayer = (layerIds: unknown, layerId: string) => ({
          newState: (layerIds as string[]).filter((id: string) => id !== layerId),
          removedLayerIds: [layerId, removedLayerId],
        });

        const localStore = makeLensStore({
          preloadedState: {
            activeDatasourceId: 'testDatasource',
            datasourceStates: {
              ...datasourceStates,
              testDatasource3: {
                isLoading: false,
                state: [],
              },
            },
            visualization: {
              activeId: activeVisId,
              state: ['layer1', 'layer2'],
            },
            stagedPreview: {
              visualization: {
                activeId: activeVisId,
                state: ['layer1', 'layer2'],
              },
              datasourceStates,
            },
          },
          storeDeps: mockStoreDeps({
            visualizationMap: visualizationMap as unknown as VisualizationMap,
            datasourceMap: { ...datasourceMap, testDatasource3 } as unknown as DatasourceMap,
          }),
        }).store;

        localStore.dispatch(
          removeOrClearLayer({
            visualizationId: 'testVis',
            layerId: 'layer1',
            layerIds: ['layer1', 'layer2'],
          })
        );

        expect(visualizationMap[activeVisId].removeLayer).toHaveBeenCalledTimes(2);
      });
    });

    describe('removing a dimension', () => {
      const colToRemove = 'col-id';
      const otherCol = 'other-col-id';
      const datasourceId = 'testDatasource';

      interface DatasourceState {
        cols: string[];
      }

      const datasourceStates = {
        [datasourceId]: {
          isLoading: false,
          state: {
            cols: [colToRemove, otherCol],
          } as DatasourceState,
        },
      };

      const datasourceMap = {
        [datasourceId]: {
          id: datasourceId,
          removeColumn: jest.fn(({ prevState: state, columnId }) => ({
            ...(state as DatasourceState),
            cols: (state as DatasourceState).cols.filter((id) => id !== columnId),
          })),
          getLayers: () => [],
        } as Partial<Datasource>,
      };

      const activeVisId = 'testVis';

      const visualizationMap = {
        [activeVisId]: {
          removeDimension: jest.fn(({ prevState, columnId }) =>
            (prevState as string[]).filter((id) => id !== columnId)
          ),
        } as Partial<Visualization>,
      };

      const visualizationState = [colToRemove, otherCol];

      const dataViews = { indexPatterns: {} } as DataViewsState;

      const layerId = 'some-layer-id';

      let customStore: LensRootStore;
      beforeEach(() => {
        customStore = makeLensStore({
          preloadedState: {
            activeDatasourceId: datasourceId,
            datasourceStates,
            visualization: {
              activeId: activeVisId,
              state: visualizationState,
            },
            dataViews,
          } as Partial<LensAppState>,
          storeDeps: mockStoreDeps({
            visualizationMap: visualizationMap as unknown as VisualizationMap,
            datasourceMap: datasourceMap as unknown as DatasourceMap,
          }),
        }).store;
      });

      it('removes a dimension', () => {
        customStore.dispatch(
          removeDimension({
            layerId,
            columnId: colToRemove,
            datasourceId,
          })
        );

        const state = customStore.getState().lens;

        expect(datasourceMap[datasourceId].removeColumn).toHaveBeenCalledWith({
          layerId,
          columnId: colToRemove,
          prevState: datasourceStates[datasourceId].state,
          indexPatterns: dataViews.indexPatterns,
        });
        expect(visualizationMap[activeVisId].removeDimension).toHaveBeenCalledWith(
          expect.objectContaining({
            layerId,
            columnId: colToRemove,
            prevState: visualizationState,
          })
        );
        expect(state.visualization.state).toEqual([otherCol]);
        expect((state.datasourceStates[datasourceId].state as DatasourceState).cols).toEqual([
          otherCol,
        ]);
      });

      it('removes a dimension without touching the datasource', () => {
        customStore.dispatch(
          removeDimension({
            layerId,
            columnId: colToRemove,
            datasourceId: undefined,
          })
        );

        const state = customStore.getState().lens;

        expect(datasourceMap[datasourceId].removeColumn).not.toHaveBeenCalled();

        expect(visualizationMap[activeVisId].removeDimension).toHaveBeenCalledWith(
          expect.objectContaining({
            layerId,
            columnId: colToRemove,
            prevState: visualizationState,
          })
        );
        expect(state.visualization.state).toEqual([otherCol]);
      });

      it('removes linked dimensions', () => {
        visualizationMap[activeVisId].getLinkedDimensions = jest.fn(() => [
          {
            from: {
              columnId: colToRemove,
              layerId,
              groupId: '',
            },
            to: {
              columnId: otherCol,
              layerId,
              groupId: '',
            },
          },
        ]);

        customStore.dispatch(
          removeDimension({
            layerId,
            columnId: colToRemove,
            datasourceId,
          })
        );

        const state = customStore.getState().lens;

        expect(state.visualization.state).toEqual([]);
        expect((state.datasourceStates[datasourceId].state as DatasourceState).cols).toEqual([]);
      });
    });
  });
});
