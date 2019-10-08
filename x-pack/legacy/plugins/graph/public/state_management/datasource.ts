/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';
import { Action } from 'typescript-fsa';
import { reducerWithInitialState } from 'typescript-fsa-reducers/dist';
import { takeLatest, put, call, select } from 'redux-saga/effects';
import { i18n } from '@kbn/i18n';
import { IndexPattern } from 'src/legacy/core_plugins/data/public';
import { createSelector } from 'reselect';
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

export interface DatasourceState {
  current: NoDatasource | IndexpatternDatasource;
  loading: boolean;
}

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
export const hasDatasourceSelector = createSelector(
  datasourceSelector,
  datasource => datasource.current.type !== 'none'
);
