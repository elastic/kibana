/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Action, Dispatch } from 'redux';
import { combineReducers } from 'redux';
import {
  configureStore,
  createListenerMiddleware,
  type TypedStartListening,
} from '@reduxjs/toolkit';
import type { ChromeStart, CoreStart } from '@kbn/core/public';
import type { ContentClient } from '@kbn/content-management-plugin/public';
import { fieldsReducer, registerFieldsListeners } from './fields';
import { urlTemplatesReducer } from './url_templates';
import { advancedSettingsReducer } from './advanced_settings';
import { datasourceReducer } from './datasource';
import { registerDatasourceListeners } from './datasource_listeners';
import type {
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
import { metaDataReducer, registerMetaDataListeners } from './meta_data';
import { registerWorkspaceListeners, workspaceReducer } from './workspace';

export type GraphState = ReturnType<ReturnType<typeof createRootReducer>>;

export interface GraphStoreDependencies
  extends Pick<CoreStart, 'overlays' | 'analytics' | 'i18n' | 'theme' | 'userProfile'> {
  addBasePath: (url: string) => string;
  indexPatternProvider: IndexPatternProvider;
  createRuntimeGraph: () => RuntimeGraph;
  getRuntimeGraph: () => RuntimeGraph | undefined;
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
  mergeRuntimeGraph: (runtimeGraph: RuntimeGraph, graph: GraphData) => void;
}

type GraphAction = Action<string>;
type GraphListenerDispatch = Dispatch<GraphAction>;

export type StartGraphListening = TypedStartListening<GraphState, GraphListenerDispatch>;

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
  registerWorkspaceListeners(startListening, deps);
};

export const createGraphStore = (deps: GraphStoreDependencies) => {
  const listenerMiddleware = createListenerMiddleware<GraphState, GraphListenerDispatch>();
  const rootReducer = createRootReducer(deps.addBasePath);

  const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        // graph uses listeners instead of thunks
        thunk: false,
      }).prepend(listenerMiddleware.middleware),
  });

  registerGraphListeners(listenerMiddleware.startListening, deps, store.getState());

  return store;
};

export type GraphStore = ReturnType<typeof createGraphStore>;
export type GraphDispatch = GraphStore['dispatch'];
