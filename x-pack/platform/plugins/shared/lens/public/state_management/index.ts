/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  configureStore,
  getDefaultMiddleware,
  type PreloadedState,
  type Action,
  type Dispatch,
  type MiddlewareAPI,
} from '@reduxjs/toolkit';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import { makeLensReducer, lensActions, getPreloadedState } from './lens_slice';
import { LensState, LensStoreDeps } from './types';
import { initMiddleware } from './init_middleware';
import { optimizingMiddleware } from './optimizing_middleware';
import { contextMiddleware } from './context_middleware';
import { fullscreenMiddleware } from './fullscreen_middleware';
export * from './types';
export * from './selectors';

export const {
  loadInitial,
  initEmpty,
  initExisting,
  navigateAway,
  setExecutionContext,
  setState,
  enableAutoApply,
  disableAutoApply,
  applyChanges,
  setSaveable,
  onActiveDataChange,
  updateDatasourceState,
  updateVisualizationState,
  insertLayer,
  switchVisualization,
  rollbackSuggestion,
  submitSuggestion,
  switchDatasource,
  switchAndCleanDatasource,
  updateIndexPatterns,
  setToggleFullscreen,
  editVisualizationAction,
  removeLayers,
  removeOrClearLayer,
  cloneLayer,
  addLayer,
  onDropToDimension,
  setLayerDefaultDimension,
  removeDimension,
  setIsLoadLibraryVisible,
  registerLibraryAnnotationGroup,
  changeIndexPattern,
} = lensActions;

type CustomMiddleware = (store: MiddlewareAPI) => (next: Dispatch) => (action: Action) => void;

export const makeConfigureStore = (
  storeDeps: LensStoreDeps,
  preloadedState?: PreloadedState<LensState> | undefined,
  customMiddleware?: CustomMiddleware
) => {
  const middleware = [
    ...getDefaultMiddleware({
      serializableCheck: {
        ignoredActionPaths: [
          'payload.activeData',
          'payload.dataViews.indexPatterns',
          'payload.redirectCallback',
          'payload.history',
          'payload.newState.dataViews',
          `payload.source.filterOperations`,
          'payload.target.filterOperations',
        ],
        ignoredPaths: ['lens.dataViews.indexPatterns', 'lens.activeData'],
      },
    }),
    initMiddleware(storeDeps),
    contextMiddleware(storeDeps),
    fullscreenMiddleware(storeDeps),
    optimizingMiddleware(),
  ];
  if (customMiddleware) {
    middleware.push(customMiddleware);
  }
  return configureStore({
    reducer: {
      lens: makeLensReducer(storeDeps),
    },
    middleware,
    preloadedState: preloadedState ?? {
      lens: getPreloadedState(storeDeps),
    },
  });
};

export type LensRootStore = ReturnType<typeof makeConfigureStore>;

export type LensDispatch = LensRootStore['dispatch'];
export type LensGetState = LensRootStore['getState'];
export type LensRootState = ReturnType<LensGetState>;

export const useLensDispatch = () => useDispatch<LensDispatch>();
export const useLensSelector: TypedUseSelectorHook<LensRootState> = useSelector;
