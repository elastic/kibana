/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createSagaMiddleware from 'redux-saga';
import { combineReducers, createStore, Store, AnyAction, Dispatch, applyMiddleware } from 'redux';
import { CoreStart } from 'src/core/public';
import { fieldsReducer, FieldsState, syncNodeStyleSaga, syncFieldsSaga } from './fields';
import { UrlTemplatesState, urlTemplatesReducer } from './url_templates';
import { AdvancedSettingsState, advancedSettingsReducer } from './advanced_settings';
import { DatasourceState, datasourceReducer, datasourceSaga } from './datasource';
import { IndexPatternProvider, Workspace, IndexPatternSavedObject, GraphSavePolicy, GraphWorkspaceSavedObject } from '../types';
import { loadingSaga, savingSaga } from './persistence';
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
  getSavedWorkspace: () => GraphWorkspaceSavedObject;
  notifications: CoreStart['notifications'];
  showSaveModal: (el: React.ReactNode) => void;
  savePolicy: GraphSavePolicy;
  changeUrl: (newUrl: string) => void;
  notifyAngular: () => void;
}

export const createGraphStore = (deps: GraphStoreDependencies) => {
  const sagaMiddleware = createSagaMiddleware();

  // hook in reducers
  const rootReducer = combineReducers({
    fields: fieldsReducer,
    urlTemplates: urlTemplatesReducer(deps.basePath),
    advancedSettings: advancedSettingsReducer,
    datasource: datasourceReducer,
    metaData: metaDataReducer,
  });

  const store = createStore(rootReducer, applyMiddleware(sagaMiddleware));

  // hook in sagas
  sagaMiddleware.run(datasourceSaga(deps));
  sagaMiddleware.run(loadingSaga(deps));
  sagaMiddleware.run(savingSaga(deps));
  sagaMiddleware.run(syncFieldsSaga(deps));
  sagaMiddleware.run(syncNodeStyleSaga(deps));

  return store;
};

export type GraphStore = Store<GraphState, AnyAction>;
export type GraphDispatch = Dispatch<AnyAction>;
