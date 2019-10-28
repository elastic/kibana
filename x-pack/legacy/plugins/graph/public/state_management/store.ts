/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createSagaMiddleware, { SagaMiddleware } from 'redux-saga';
import { combineReducers, createStore, Store, AnyAction, Dispatch, applyMiddleware } from 'redux';
import { ChromeStart } from 'kibana/public';
import { CoreStart } from 'src/core/public';
import {
  fieldsReducer,
  FieldsState,
  syncNodeStyleSaga,
  syncFieldsSaga,
  updateSaveButtonSaga,
} from './fields';
import { UrlTemplatesState, urlTemplatesReducer, syncTemplatesSaga } from './url_templates';
import {
  AdvancedSettingsState,
  advancedSettingsReducer,
  syncSettingsSaga,
} from './advanced_settings';
import { DatasourceState, datasourceReducer } from './datasource';
import { datasourceSaga } from './datasource.sagas';
import {
  IndexPatternProvider,
  Workspace,
  IndexPatternSavedObject,
  GraphSavePolicy,
  GraphWorkspaceSavedObject,
  AdvancedSettings,
  WorkspaceField,
  UrlTemplate,
} from '../types';
import { loadingSaga, savingSaga } from './persistence';
import { metaDataReducer, MetaDataState, syncBreadcrumbSaga } from './meta_data';
import { fillWorkspaceSaga } from './workspace';

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
  createWorkspace: (index: string, advancedSettings: AdvancedSettings) => void;
  getWorkspace: () => Workspace | null;
  getSavedWorkspace: () => GraphWorkspaceSavedObject;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  showSaveModal: (el: React.ReactNode) => void;
  savePolicy: GraphSavePolicy;
  changeUrl: (newUrl: string) => void;
  notifyAngular: () => void;
  setLiveResponseFields: (fields: WorkspaceField[]) => void;
  setUrlTemplates: (templates: UrlTemplate[]) => void;
  setWorkspaceInitialized: () => void;
  chrome: ChromeStart;
}

export function createRootReducer(basePath: string) {
  return combineReducers({
    fields: fieldsReducer,
    urlTemplates: urlTemplatesReducer(basePath),
    advancedSettings: advancedSettingsReducer,
    datasource: datasourceReducer,
    metaData: metaDataReducer,
  });
}

function registerSagas(sagaMiddleware: SagaMiddleware<object>, deps: GraphStoreDependencies) {
  sagaMiddleware.run(datasourceSaga(deps));
  sagaMiddleware.run(loadingSaga(deps));
  sagaMiddleware.run(savingSaga(deps));
  sagaMiddleware.run(syncFieldsSaga(deps));
  sagaMiddleware.run(syncNodeStyleSaga(deps));
  sagaMiddleware.run(syncSettingsSaga(deps));
  sagaMiddleware.run(updateSaveButtonSaga(deps));
  sagaMiddleware.run(syncBreadcrumbSaga(deps));
  sagaMiddleware.run(syncTemplatesSaga(deps));
  sagaMiddleware.run(fillWorkspaceSaga(deps));
}

export const createGraphStore = (deps: GraphStoreDependencies) => {
  const sagaMiddleware = createSagaMiddleware();

  const rootReducer = createRootReducer(deps.basePath);

  const store = createStore(rootReducer, applyMiddleware(sagaMiddleware));

  registerSagas(sagaMiddleware, deps);

  return store;
};

export type GraphStore = Store<GraphState, AnyAction>;
export type GraphDispatch = Dispatch<AnyAction>;
