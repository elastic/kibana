/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SagaMiddleware } from 'redux-saga';
import createSagaMiddleware from 'redux-saga';
import type { Store, AnyAction, Dispatch } from 'redux';
import { combineReducers, createStore, applyMiddleware } from 'redux';
import type { ChromeStart } from '@kbn/core/public';
import type { CoreStart } from '@kbn/core/public';
import type { ContentClient } from '@kbn/content-management-plugin/public';
import type { FieldsState } from './fields';
import { fieldsReducer, syncNodeStyleSaga, syncFieldsSaga, updateSaveButtonSaga } from './fields';
import type { UrlTemplatesState } from './url_templates';
import { urlTemplatesReducer, syncTemplatesSaga } from './url_templates';
import type { AdvancedSettingsState } from './advanced_settings';
import { advancedSettingsReducer, syncSettingsSaga } from './advanced_settings';
import type { DatasourceState } from './datasource';
import { datasourceReducer } from './datasource';
import { datasourceSaga } from './datasource.sagas';
import type { IndexPatternProvider, Workspace, GraphSavePolicy, AdvancedSettings } from '../types';
import { loadingSaga, savingSaga } from './persistence';
import type { MetaDataState } from './meta_data';
import { metaDataReducer, syncBreadcrumbSaga } from './meta_data';
import type { WorkspaceState } from './workspace';
import { fillWorkspaceSaga, submitSearchSaga, workspaceReducer } from './workspace';

export interface GraphState {
  fields: FieldsState;
  urlTemplates: UrlTemplatesState;
  advancedSettings: AdvancedSettingsState;
  datasource: DatasourceState;
  metaData: MetaDataState;
  workspace: WorkspaceState;
}

export interface GraphStoreDependencies
  extends Pick<CoreStart, 'overlays' | 'analytics' | 'i18n' | 'theme' | 'userProfile'> {
  addBasePath: (url: string) => string;
  indexPatternProvider: IndexPatternProvider;
  createWorkspace: (index: string, advancedSettings: AdvancedSettings) => Workspace;
  getWorkspace: () => Workspace | undefined;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  contentClient: ContentClient;
  savePolicy: GraphSavePolicy;
  changeUrl: (newUrl: string) => void;
  notifyReact: () => void;
  chrome: ChromeStart;
  basePath: string;
  handleSearchQueryError: (err: Error | string) => void;
}

export function createRootReducer(addBasePath: (url: string) => string) {
  return combineReducers({
    fields: fieldsReducer,
    urlTemplates: urlTemplatesReducer(addBasePath),
    advancedSettings: advancedSettingsReducer,
    datasource: datasourceReducer,
    metaData: metaDataReducer,
    workspace: workspaceReducer,
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
  sagaMiddleware.run(submitSearchSaga(deps));
}

export const createGraphStore = (deps: GraphStoreDependencies): Store => {
  const sagaMiddleware = createSagaMiddleware();

  const rootReducer = createRootReducer(deps.addBasePath);

  const store = createStore(rootReducer, applyMiddleware(sagaMiddleware));

  registerSagas(sagaMiddleware, deps);

  return store;
};

export type GraphStore = Store<GraphState, AnyAction>;
export type GraphDispatch = Dispatch<AnyAction>;
