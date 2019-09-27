/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory, { Action } from 'typescript-fsa';
import { reducerWithInitialState } from 'typescript-fsa-reducers/dist';
import { takeLatest, put, call, select, cps } from 'redux-saga/effects';
import { i18n } from '@kbn/i18n';
import { IndexPattern } from 'src/legacy/core_plugins/data/public';
import { GraphState, GraphStoreDependencies } from './store';
import { reset } from './global';
import { loadFields } from './fields';
import { mapFields } from '../services/persistence';
import { settingsSelector } from './advanced_settings';

const actionCreator = actionCreatorFactory('x-pack/graph/datasource');

export interface NoDatasource {
  type: 'none';
}
export interface IndexpatternDatasource {
  type: 'indexpattern';
  id: string;
  title: string;
}

export interface DatasourceState {
  current: NoDatasource | IndexpatternDatasource;
  loading: boolean;
}

/**
 * Sets the current datasource. This will not trigger a load of fields
 */
export const setDatasource = actionCreator<NoDatasource | IndexpatternDatasource>('SET_DATASOURCE');

/**
 * Sets the current datasource. This will trigger a load of fields and overwrite the current
 * fields configuration
 */
export const requestDatasource = actionCreator<IndexpatternDatasource>('SET_DATASOURCE_REQUEST');

/**
 * Datasource loading finished successfully.
 */
export const datasourceLoaded = actionCreator<void>('SET_DATASOURCE_SUCCESS');

const initialDatasource: DatasourceState = {
  current: { type: 'none' },
  loading: false,
};

export const datasourceReducer = reducerWithInitialState<DatasourceState>(initialDatasource)
  .case(reset, () => initialDatasource)
  .case(setDatasource, (_oldDatasource, newDatasource) => ({
    current: newDatasource,
    loading: false,
  }))
  .case(requestDatasource, (_oldDatasource, newDatasource) => ({
    current: newDatasource,
    loading: true,
  }))
  .case(datasourceLoaded, datasource => ({
    ...datasource,
    loading: false,
  }))
  .build();

export const datasourceSelector = (state: GraphState) => state.datasource;

/**
 * Saga loading field information when the datasource is switched. This will overwrite current settings
 * in fields.
 *
 * TODO: Carry over fields than can be carried over because they also exist in the target index pattern
 */
export const datasourceSaga = ({
  indexPatternProvider,
  notifications,
  createWorkspace,
}: GraphStoreDependencies) => {
  function* fetchFields(action: Action<IndexpatternDatasource>) {
    try {
      const indexPattern: IndexPattern = yield call(indexPatternProvider.get, action.payload.id);
      yield put(loadFields(mapFields(indexPattern)));
      yield put(datasourceLoaded());
      const advancedSettings = settingsSelector(yield select());
      createWorkspace(indexPattern.title, advancedSettings);
    } catch (e) {
      // in case of errors, reset the datasource and show notification
      yield put(setDatasource({ type: 'none' }));
      notifications.toasts.addDanger(
        i18n.translate('xpack.graph.loadWorkspace.missingIndexPatternErrorMessage', {
          defaultMessage: 'Index pattern not found',
        })
      );
    }
  }

  return function*() {
    yield takeLatest(requestDatasource.match, fetchFields);
  };
};
