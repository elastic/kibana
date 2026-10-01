/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Action, Dispatch, Store } from 'redux';
import { combineReducers } from 'redux';
import {
  configureStore,
  createListenerMiddleware,
  type TypedStartListening,
} from '@reduxjs/toolkit';
import type { ChromeStart, CoreStart } from '@kbn/core/public';
import type { ContentClient } from '@kbn/content-management-plugin/public';
import type { FieldsState } from './fields';
import { fieldsReducer, registerFieldsListeners } from './fields';
import type { UrlTemplatesState } from './url_templates';
import { registerUrlTemplatesListeners, urlTemplatesReducer } from './url_templates';
import type { AdvancedSettingsState } from './advanced_settings';
import { advancedSettingsReducer } from './advanced_settings';
import type { DatasourceState } from './datasource';
import { datasourceReducer } from './datasource';
import { registerDatasourceListeners } from './datasource_listeners';
import type {
  AdvancedSettings,
  ExploreRequest,
  GraphData,
  ExploreResults,
  GraphSavePolicy,
  SearchRequest,
  SearchResults,
  IndexPatternProvider,
  RuntimeGraph,
  WorkspaceLayoutController,
} from '../types';
import { registerPersistenceListeners } from './persistence';
import type { MetaDataState } from './meta_data';
import { metaDataReducer, registerMetaDataListeners } from './meta_data';
import type { WorkspaceState } from './workspace';
import { registerWorkspaceListeners, workspaceReducer } from './workspace';

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
  createRuntimeGraph: (index: string, advancedSettings: AdvancedSettings) => RuntimeGraph;
  getWorkspace: () => RuntimeGraph | undefined;
  getLayoutController: () => WorkspaceLayoutController | undefined;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  contentClient: ContentClient;
  savePolicy: GraphSavePolicy;
  changeUrl: (newUrl: string) => void;
  notifyReact: () => void;
  chrome: ChromeStart;
  basePath: string;
  handleSearchQueryError: (err: Error | string) => void;
  exploreGraph: (index: string, request: ExploreRequest) => Promise<ExploreResults>;
  searchGraph: (index: string, request: SearchRequest) => Promise<SearchResults>;
  mergeRuntimeGraph: (workspace: RuntimeGraph, graph: GraphData) => void;
}

export type StartGraphListening = TypedStartListening<GraphState, GraphDispatch>;

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

export const registerGraphListeners = (
  startListening: StartGraphListening,
  deps: GraphStoreDependencies,
  state: GraphState
) => {
  registerDatasourceListeners(startListening, deps);
  registerPersistenceListeners(startListening, deps);
  registerFieldsListeners(startListening, deps);
  registerMetaDataListeners(startListening, deps, state);
  registerUrlTemplatesListeners(startListening, deps);
  registerWorkspaceListeners(startListening, deps);
};

export const createGraphStore = (deps: GraphStoreDependencies): Store => {
  const listenerMiddleware = createListenerMiddleware<GraphState, GraphDispatch>();
  const rootReducer = createRootReducer(deps.addBasePath);

  const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        // graph uses listeners instead of thunks
        thunk: false,
        // graph state and actions carry non-serializable values (e.g. RuntimeGraph instances)
        serializableCheck: false,
        immutableCheck: false,
      }).prepend(listenerMiddleware.middleware),
  });

  registerGraphListeners(listenerMiddleware.startListening, deps, store.getState());

  return store;
};

export type GraphStore = Store<GraphState, Action<string>>;
export type GraphDispatch = Dispatch<Action<string>>;
