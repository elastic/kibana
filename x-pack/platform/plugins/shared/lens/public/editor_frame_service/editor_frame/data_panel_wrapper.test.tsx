/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DataPanelWrapper } from './data_panel_wrapper';
import { Datasource, DatasourceDataPanelProps, VisualizationMap } from '../../types';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { createMockFramePublicAPI, mockStoreDeps, renderWithReduxStore } from '../../mocks';
import { disableAutoApply } from '../../state_management/lens_slice';
import { LensRootStore, selectTriggerApplyChanges } from '../../state_management';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { createIndexPatternServiceMock } from '../../mocks/data_views_service_mock';
import { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';

describe('Data Panel Wrapper', () => {
  describe('Datasource data panel properties', () => {
    let datasourceDataPanelProps: DatasourceDataPanelProps;
    let store: LensRootStore;

    beforeEach(async () => {
      const DataPanelComponent = jest.fn().mockImplementation(() => <div />);

      const datasourceMap = {
        activeDatasource: {
          DataPanelComponent,
          getUsedDataViews: jest.fn(),
          getLayers: jest.fn(() => []),
        } as unknown as Datasource,
      };
      const renderResult = renderWithReduxStore(
        <DataPanelWrapper
          datasourceMap={datasourceMap}
          visualizationMap={{} as VisualizationMap}
          showNoDataPopover={() => {}}
          core={{} as DatasourceDataPanelProps['core']}
          dropOntoWorkspace={() => {}}
          hasSuggestionForField={() => true}
          plugins={{
            uiActions: {} as UiActionsStart,
            dataViews: {} as DataViewsPublicPluginStart,
            eventAnnotationService: {} as EventAnnotationServiceType,
          }}
          indexPatternService={createIndexPatternServiceMock()}
          frame={createMockFramePublicAPI()}
        />,
        {},
        {
          preloadedState: {
            activeDatasourceId: 'activeDatasource',
            datasourceStates: {
              activeDatasource: {
                isLoading: false,
                state: {
                  age: 'old',
                },
              },
            },
          },
          storeDeps: mockStoreDeps({ datasourceMap }),
        }
      );
      store = renderResult.store;
      datasourceDataPanelProps = DataPanelComponent.mock.calls[0][0] as DatasourceDataPanelProps;
    });

    describe('setState', () => {
      it('applies state immediately when option true', async () => {
        store.dispatch(disableAutoApply());
        selectTriggerApplyChanges(store.getState());

        const newDatasourceState = { age: 'new' };
        datasourceDataPanelProps.setState(newDatasourceState, { applyImmediately: true });

        expect(store.getState().lens.datasourceStates.activeDatasource.state).toEqual(
          newDatasourceState
        );
        expect(selectTriggerApplyChanges(store.getState())).toBeTruthy();
      });
      it('applies state immediately when option trueenz', async () => {
        store.dispatch(disableAutoApply());
        selectTriggerApplyChanges(store.getState());

        const newDatasourceState = { age: 'new' };
        datasourceDataPanelProps.setState(newDatasourceState, { applyImmediately: true });

        expect(store.getState().lens.datasourceStates.activeDatasource.state).toEqual(
          newDatasourceState
        );
        expect(selectTriggerApplyChanges(store.getState())).toBeTruthy();
      });

      it('does not apply state immediately when option false', async () => {
        store.dispatch(disableAutoApply());
        selectTriggerApplyChanges(store.getState());

        const newDatasourceState = { age: 'new' };
        datasourceDataPanelProps.setState(newDatasourceState, { applyImmediately: false });

        const lensState = store.getState().lens;
        expect(lensState.datasourceStates.activeDatasource.state).toEqual(newDatasourceState);
        expect(selectTriggerApplyChanges(store.getState())).toBeFalsy();
      });
    });
  });
});
