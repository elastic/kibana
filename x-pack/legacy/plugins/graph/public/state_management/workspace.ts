/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory, { Action } from 'typescript-fsa';
import { reducerWithInitialState } from 'typescript-fsa-reducers/dist';
import { takeLatest, put, call } from 'redux-saga/effects';
import { GraphState } from './store';
import { reset } from './global';
import { loadFields } from './fields';
import { mapFields } from '../services/persistence';
import { IndexPatternProvider, Workspace } from '../types';

const actionCreator = actionCreatorFactory('x-pack/graph/workspace');

export interface NoDatasource {
  type: 'none';
}
export interface IndexpatternDatasource {
  type: 'indexpattern';
  id: string;
  title: string;
}

export type DatasourceState = { current: NoDatasource | IndexpatternDatasource, loading: boolean;  };

export const setDatasource = actionCreator<NoDatasource | IndexpatternDatasource>('SET_DATASOURCE_REQUEST');
export const datasourceLoaded = actionCreator<void>('SET_DATASOURCE_SUCCESS');

const initialDatasource: DatasourceState = {
  current: { type: 'none' },
  loading: false
};

export const datasourceReducer = reducerWithInitialState<DatasourceState>(initialDatasource)
  .case(reset, () => initialDatasource)
  .case(setDatasource, (_oldDatasource, newDatasource) => ({
    current: newDatasource,
    loading: newDatasource.type !== 'none'
  }))
  .build();

export const datasourceSelector = (state: GraphState) => state.datasource;

export const workspaceSaga = ({ setWorkspace, getWorkspace }: { setWorkspace: (ws: Workspace) => void; getWorkspace: () => Workspace }) =>
  function*() {
    function* loadSavedWorkspace(action: Action<SavedWorkspace>) {
      // TODO this saga should
    if ($scope.workspace) {
      return;
    }
    const options = {
      indexName: $scope.selectedIndex.attributes.title,
      vertex_fields: $scope.selectedFields,
      // Here we have the opportunity to look up labels for nodes...
      nodeLabeller: function () {
        //   console.log(newNodes);
      },
      changeHandler: function () {
        //Allows DOM to update with graph layout changes.
        $scope.$apply();
      },
      graphExploreProxy: callNodeProxy,
      searchProxy: callSearchNodeProxy,
      exploreControls: $scope.exploreControls
    };
    $scope.workspace = gws.createWorkspace(options);
      initWorkspaceIfRequired();
      const {
        urlTemplates,
        advancedSettings,
        allFields,
      } = savedWorkspaceToAppState($scope.savedWorkspace, indexPattern, $scope.workspace);

      // wire up stuff to angular
      store.dispatch(loadFields(allFields));
      $scope.exploreControls = advancedSettings;
      $scope.workspace.options.exploreControls = advancedSettings;
      $scope.urlTemplates = urlTemplates;
      $scope.workspace.runLayout();
    }

    yield takeLatest(loadSavedWorkspace.type, fetchIndexPattern);
  };
