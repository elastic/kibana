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

export type DatasourceState = NoDatasource | IndexpatternDatasource;

export const setDatasource = actionCreator<DatasourceState>('SET_DATASOURCE');

const initialDatasource: DatasourceState = {
  type: 'none',
};

export const datasourceReducer = reducerWithInitialState<DatasourceState>(initialDatasource)
  .case(reset, () => initialDatasource)
  .case(setDatasource, (_oldDatasource, newDatasource) => newDatasource)
  .build();

export const datasourceSelector = (state: GraphState) => state.datasource;

export const datasourceSaga = (indexPatternProvider: IndexPatternProvider) =>
  function*() {
    function* fetchIndexPattern(action: Action<DatasourceState>) {
      if (action.payload.type === 'none') {
        return;
      }

      try {
        const indexPattern = yield call(indexPatternProvider.get, action.payload.id);
        yield put(loadFields(mapFields(indexPattern)));
      } catch (e) {
        // in case of errors, reset the datasource and show notification
        yield put(setDatasource({ type: 'none' }));
        // TOOD show notification
      }
    }

    yield takeLatest(setDatasource.type, fetchIndexPattern);
  };
