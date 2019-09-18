/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createSagaMiddleware from 'redux-saga';
import { combineReducers, createStore, Store, AnyAction, Dispatch, applyMiddleware } from 'redux';
import { CoreStart } from 'src/core/public';
import { fieldsReducer, FieldsState } from './fields';
import { UrlTemplatesState, urlTemplatesReducer } from './url_templates';
import { AdvancedSettingsState, advancedSettingsReducer } from './advanced_settings';
import { DatasourceState, datasourceReducer, datasourceSaga } from './datasource';
import { IndexPatternProvider, Workspace, IndexPatternSavedObject } from '../types';
import { loadingSaga } from './global';
import { syncNodeStyleSaga, syncFieldsSaga } from './workspace';
import { metaDataReducer, MetaDataState } from './meta_data';

export interface GraphState {
  fields: FieldsState;
  urlTemplates: UrlTemplatesState;
  advancedSettings: AdvancedSettingsState;
  datasource: DatasourceState;
  metaData: MetaDataState;
}

export interface GraphStoreDependencies {
  basePath: string;
  indexPatternProvider: IndexPatternProvider;
  indexPatterns: IndexPatternSavedObject[];
  createWorkspace: (index: string) => void;
  getWorkspace: () => Workspace | null;
  notifications: CoreStart['notifications'];
}

export const createGraphStore = (deps: GraphStoreDependencies) => {
  const sagaMiddleware = createSagaMiddleware();

  // hook in sagas
  sagaMiddleware.run(datasourceSaga(deps));
  sagaMiddleware.run(loadingSaga(deps));
  sagaMiddleware.run(syncFieldsSaga(deps));
  sagaMiddleware.run(syncNodeStyleSaga(deps));

  // hook in reducers
  const rootReducer = combineReducers({
    fields: fieldsReducer,
    urlTemplates: urlTemplatesReducer(deps.basePath),
    advancedSettings: advancedSettingsReducer,
    datasource: datasourceReducer,
    metaData: metaDataReducer,
  });

  return createStore(rootReducer, applyMiddleware(sagaMiddleware));
};

export type GraphStore = Store<GraphState, AnyAction>;
export type GraphDispatch = Dispatch<AnyAction>;
