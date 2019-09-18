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
import { IndexPatternProvider } from '../types';

const actionCreator = actionCreatorFactory('x-pack/graph/datasource');

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

export const datasourceSaga = (indexPatternProvider: IndexPatternProvider) =>
  function*() {
    function* fetchIndexPattern(action: Action<NoDatasource | IndexpatternDatasource>) {
      if (action.payload.type === 'none') {
        return;
      }

      try {
        const indexPattern = yield call(indexPatternProvider.get, action.payload.id);
        yield put(loadFields(mapFields(indexPattern)));
        yield put(datasourceLoaded());
      } catch (e) {
        // in case of errors, reset the datasource and show notification
        yield put(setDatasource({ type: 'none' }));
        // TOOD show notification
      }
    }

    yield takeLatest(setDatasource.type, fetchIndexPattern);
  };
